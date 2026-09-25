#!/usr/bin/env python3
"""Merge development settings into an existing Codex user configuration."""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import sys
import tempfile
import tomllib
from typing import Any, cast


ROOT_START = "# >>> skyttel azure dev managed root"
ROOT_END = "# <<< skyttel azure dev managed root"
PROFILE_START = "# >>> skyttel azure dev managed profile"
PROFILE_END = "# <<< skyttel azure dev managed profile"
WORKSPACE_SECTION = 'projects."/workspace"'
CODEX_SKILLS_PATH = "~/.codex/skills"
AZURE_WORKTREE_PATH = "/mnt/skyttel-azure-dev-data/.worktrees"
MANAGED_PROFILE_SECTION = "permissions.skyttel-development"
SECTION_PATTERN = re.compile(r"^\s*\[([^][]+)]\s*(?:#.*)?$")
ARRAY_SECTION_PATTERN = re.compile(r"^\s*\[\[([^][]+)]]\s*(?:#.*)?$")
TRUST_SETTING_PATTERN = re.compile(r"^\s*trust_level\s*=")


def toml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def load_managed_config(content: str) -> dict[str, Any]:
    return tomllib.loads(content.replace("@UID@", str(os.getuid())))


def merge_shell_environment(
    lines: list[str], managed: dict[str, Any],
) -> list[str]:
    environment = managed.get("shell_environment_policy", {}).get("set", {})
    if not environment:
        return lines
    existing = tomllib.loads("\n".join(lines))
    values = dict(existing.get("shell_environment_policy", {}).get("set", {}))
    values.update(environment)
    result: list[str] = []
    section: str | None = None
    for line in lines:
        match = SECTION_PATTERN.match(line) or ARRAY_SECTION_PATTERN.match(line)
        if match:
            section = match.group(1).strip()
        if section != "shell_environment_policy.set":
            result.append(line)
    # Keep personal variables outside managed blocks so subsequent merges retain them.
    while result and not result[-1].strip():
        result.pop()
    result.extend(["", "[shell_environment_policy.set]"])
    for key, value in values.items():
        if not isinstance(value, str):
            raise ValueError(f"shell environment {key} must be a string")
        result.append(f"{toml_string(key)} = {toml_string(value)}")
    return result + [""]


def without_management_markers(content: str) -> list[str]:
    lines = content.splitlines()
    result: list[str] = []
    active_end: str | None = None
    block_ends = {
        ROOT_START: ROOT_END,
        PROFILE_START: PROFILE_END,
    }

    for line in lines:
        stripped = line.strip()
        if stripped == active_end:
            active_end = None
            continue
        if stripped in block_ends:
            if active_end is not None:
                raise ValueError(f"nested managed block; expected {active_end}")
            active_end = block_ends[stripped]
            continue
        # Preserve personal choices even if edited inside a legacy managed block.
        result.append(line)

    if active_end is not None:
        raise ValueError(f"unterminated managed block; expected {active_end}")
    return result


def is_managed_profile_section(section: str | None) -> bool:
    if section is None:
        return False
    return (
        section == MANAGED_PROFILE_SECTION
        or section.startswith(f"{MANAGED_PROFILE_SECTION}.")
    )


def clean_existing_config(
    content: str,
    trust_level: str,
) -> tuple[list[str], bool]:
    result: list[str] = []
    section: str | None = None
    workspace_found = False

    existing_lines = without_management_markers(content)
    for line in existing_lines:
        match = SECTION_PATTERN.match(line) or ARRAY_SECTION_PATTERN.match(line)
        if match:
            section = match.group(1).strip()
            if is_managed_profile_section(section):
                continue
            result.append(line)
            if section == WORKSPACE_SECTION:
                workspace_found = True
                result.append(f"trust_level = {toml_string(trust_level)}")
            continue

        if is_managed_profile_section(section):
            continue
        if section == WORKSPACE_SECTION and TRUST_SETTING_PATTERN.match(line):
            continue
        result.append(line)

    while result and not result[0].strip():
        result.pop(0)
    while result and not result[-1].strip():
        result.pop()
    return result, workspace_found


def require_string(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{name} must be a non-empty string")
    return value


def require_table(value: Any, name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{name} must be a table")
    return cast(dict[str, Any], value)


def render_profile(managed: dict[str, Any]) -> tuple[str, list[str]]:
    default_permissions = require_string(
        managed.get("default_permissions"),
        "default_permissions",
    )
    projects = require_table(managed.get("projects"), "projects")
    workspace = require_table(
        projects.get("/workspace"),
        'projects."/workspace"',
    )
    trust_level = require_string(
        workspace.get("trust_level"),
        'projects."/workspace".trust_level',
    )
    permissions = require_table(managed.get("permissions"), "permissions")
    profile = require_table(
        permissions.get(default_permissions),
        f"permissions.{default_permissions}",
    )
    description = require_string(profile.get("description"), "permission description")
    extends = require_string(profile.get("extends"), "permission extends")
    filesystem = require_table(profile.get("filesystem"), "permission filesystem")
    codex_skills_access = require_string(
        filesystem.get(CODEX_SKILLS_PATH),
        f"permission {CODEX_SKILLS_PATH} access",
    )
    if codex_skills_access != "write":
        raise ValueError(f"permission {CODEX_SKILLS_PATH} access must be write")
    filesystem_access = {CODEX_SKILLS_PATH: codex_skills_access}
    if AZURE_WORKTREE_PATH in filesystem:
        if filesystem[AZURE_WORKTREE_PATH] != "write":
            raise ValueError(f"permission {AZURE_WORKTREE_PATH} access must be write")
        filesystem_access[AZURE_WORKTREE_PATH] = "write"
    workspace_roots = require_table(
        filesystem.get(":workspace_roots"),
        "permission filesystem workspace roots",
    )
    workspace_root_access = {
        path: require_string(
            workspace_roots.get(path),
            f"permission {path} access",
        )
        for path in (".codex", ".git")
    }
    for path, access in workspace_root_access.items():
        if access != "write":
            raise ValueError(f"permission {path} access must be write")
    network = require_table(profile.get("network"), "permission network")
    enabled = network.get("enabled")
    allow_local_binding = network.get("allow_local_binding")
    if not isinstance(enabled, bool) or not isinstance(allow_local_binding, bool):
        raise ValueError("network flags must be booleans")
    domains = require_table(network.get("domains"), "permission network domains")
    if not domains:
        raise ValueError("permission network domains must be a non-empty table")
    profile_lines = [
        PROFILE_START,
        f"[permissions.{default_permissions}]",
        f"description = {toml_string(description)}",
        f"extends = {toml_string(extends)}",
        "",
        f"[permissions.{default_permissions}.filesystem]",
        *(
            f"{toml_string(path)} = {toml_string(access)}"
            for path, access in filesystem_access.items()
        ),
        "",
        f'[permissions.{default_permissions}.filesystem.":workspace_roots"]',
        *(
            f"{toml_string(path)} = {toml_string(access)}"
            for path, access in workspace_root_access.items()
        ),
        "",
        f"[permissions.{default_permissions}.network]",
        f"enabled = {str(enabled).lower()}",
        f"allow_local_binding = {str(allow_local_binding).lower()}",
        "",
        f"[permissions.{default_permissions}.network.domains]",
    ]
    for domain, decision in domains.items():
        profile_lines.append(
            f"{toml_string(require_string(domain, 'domain'))} = "
            f"{toml_string(require_string(decision, f'domain {domain} decision'))}",
        )
    if "unix_sockets" in network:
        sockets = require_table(network["unix_sockets"], "permission unix sockets")
        profile_lines.extend([
            "", f"[permissions.{default_permissions}.network.unix_sockets]",
        ])
        for path, decision in sockets.items():
            profile_lines.append(
                f"{toml_string(path)} = "
                f"{toml_string(require_string(decision, 'socket decision'))}",
            )
    profile_lines.append(PROFILE_END)
    return trust_level, profile_lines


def merge_config(existing_content: str, managed_content: str) -> str:
    managed = load_managed_config(managed_content)
    existing = tomllib.loads(existing_content)
    trust_level, profile_lines = render_profile(managed)
    # Root defaults belong to the user after initial setup, not to managed blocks.
    root_lines: list[str] = []
    for key in ("default_permissions", "cli_auth_credentials_store"):
        if key in managed and key not in existing:
            value = require_string(managed[key], key)
            root_lines.append(f"{key} = {toml_string(value)}")
    if root_lines:
        root_lines.append("")
    existing_lines, workspace_found = clean_existing_config(
        existing_content, trust_level,
    )

    merged = list(root_lines)
    merged.extend(existing_lines)
    if merged and merged[-1].strip():
        merged.append("")
    if not workspace_found:
        merged.extend(
            [
                f"[{WORKSPACE_SECTION}]",
                f"trust_level = {toml_string(trust_level)}",
                "",
            ],
        )
    merged = merge_shell_environment(merged, managed)
    merged.extend(profile_lines)
    merged_content = "\n".join(merged).rstrip() + "\n"

    validate_merged_config(merged_content, managed)
    return merged_content


def validate_merged_config(
    merged_content: str,
    managed: dict[str, Any],
) -> None:
    parsed = tomllib.loads(merged_content)
    default_permissions = managed["default_permissions"]
    trust_level = managed["projects"]["/workspace"]["trust_level"]
    if parsed["projects"]["/workspace"].get("trust_level") != trust_level:
        raise ValueError("merged workspace trust level is incorrect")
    if (
        parsed["permissions"][default_permissions]["filesystem"]
        != managed["permissions"][default_permissions]["filesystem"]
    ):
        raise ValueError("merged filesystem permissions are incorrect")
    if (
        parsed["permissions"][default_permissions]["network"]
        != managed["permissions"][default_permissions]["network"]
    ):
        raise ValueError("merged network permissions are incorrect")
    for key, value in managed.get("shell_environment_policy", {}).get("set", {}).items():
        if parsed.get("shell_environment_policy", {}).get("set", {}).get(key) != value:
            raise ValueError(f"merged shell environment is incorrect for {key}")


def write_atomic(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = path.stat().st_mode & 0o777 if path.exists() else 0o600
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        delete=False,
    ) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    try:
        os.chmod(temporary_path, mode)
        os.replace(temporary_path, path)
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "usage: merge-codex-config.py MANAGED_CONFIG USER_CONFIG",
            file=sys.stderr,
        )
        return 2

    managed_path = Path(sys.argv[1])
    user_path = Path(sys.argv[2])
    existing_content = user_path.read_text(encoding="utf-8") if user_path.exists() else ""
    managed_content = managed_path.read_text(encoding="utf-8")
    write_atomic(user_path, merge_config(existing_content, managed_content))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
