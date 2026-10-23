import json
from pathlib import Path

TARGET = Path("/Users/johlju/source/skyttel")
SKILL = TARGET / ".agents/skills/security-audit"
RUN = Path("/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1")
GROUPS = {
    "hunter_auth": [
        "src/server/app.ts#public-routes",
        "src/server/auth.ts#oauth-callback",
        "src/server/browser-binding.ts#session-routes",
        "src/server/config.ts#runtime-config",
    ],
    "hunter_map": [
        "src/server/map-routes.ts#map-work",
        "src/server/map-routes.ts#history",
        "src/server/administration-routes.ts#membership",
        "src/server/content-owner-routes.ts#owner",
    ],
    "hunter_import": [
        "src/server/household-export-routes.ts#export",
        "src/server/household-import-routes.ts#import",
        "src/server/household-erasure-routes.ts#erasure",
        "src/server/profile-image-routes.ts#upload",
    ],
    "hunter_ai": [
        "src/server/assistant-routes.ts#mcp",
        "src/server/text-assistant.ts#text-message",
        "src/server/voice-assistant.ts#voice-session",
    ],
    "hunter_transport": [
        "src/server/task-delivery-transport.ts#upgrade",
        "src/server/app.ts#rate-limits",
        "src/server/cost-routes.ts#costs",
    ],
    "hunter_client": ["src/client#rendered-household-data"],
    "hunter_release": [".github/workflows/release.yml#release"],
    "hunter_install": [
        "src/server/app.ts#POST /api/households",
        "src/server/database.ts#startup",
    ],
    "hunter_consent_spend": [
        "src/server/conversation-consent-routes.ts#consent",
        "src/server/text-assistant.ts#conversation-admission",
    ],
    "hunter_ci": [
        ".github/workflows/operator-upgrade-gate.yml#pull_request_target",
        ".github/workflows/image-monitor.yml#schedule",
    ],
    "hunter_oauth": ["src/server/assistant-routes.ts#oauth-consent"],
    "hunter_personal": ["src/server/map-routes.ts#personal-view"],
    "hunter_security_gates": [
        "scripts/security/check-results.mjs#scanner-results",
        "scripts/security/repository-settings.mjs#settings-check",
    ],
    "hunter_operator_evidence": [
        "scripts/security/verify-installation.mjs#operator-check",
        ".github/workflows/release-acceptance.yml#workflow_dispatch",
    ],
    "hunter_auth_cleanup": ["src/server/app.ts#authentication-cleanup"],
    "hunter_assistant_cache": ["src/server/text-assistant.ts#cached-tool-read"],
    "hunter_settings": [
        "src/server/policy-contact-routes.ts#operator-policy-contact",
        "src/server/map-routes.ts#conversation-preferences-and-theme-preference",
    ],
    "hunter_summary": ["src/server/text-assistant.ts#conversation-summary"],
    "hunter_definition_restore": ["src/server/map.ts#removed-definition-restoration"],
    "hunter_voice_commentary": ["src/server/voice-work.ts#spoken-answer"],
    "hunter_legacy_upgrade": ["src/server/upgrade-legacy-login.ts#maintenance-entry"],
    "hunter_model_report": ["scripts/model-evaluation/evaluate.ts#report-emission"],
    "hunter_relationship_attempt": ["src/server/map-routes.ts#relationship-form"],
    "hunter_save_recovery": ["src/server/text-assistant.ts#recover-and-revoke"],
    "hunter_attempt_volume": ["src/server/map-routes.ts#relationship-form"],
    "hunter_startup_migration": ["src/server/database.ts#startup-migration"],
    "hunter_history_volume": ["src/server/map-routes.ts#history-volume"],
    "hunter_definition_usage": ["src/server/map-routes.ts#object-type-and-relationship-type-deletion"],
    "hunter_eval_budget": ["scripts/model-evaluation/evaluate.ts#evaluateModels"],
    "hunter_npm_bootstrap": ["scripts/install-repository-npm.mjs#bootstrap"],
}

def section(text, heading):
    lines = text.splitlines(keepends=True)
    start = next(i for i, line in enumerate(lines) if line.startswith("## ") and line[3:].split(" (", 1)[0].strip() == heading)
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    return "".join(lines[start:end]).rstrip()

def ordinary_block(text, name):
    marker = f"**{name}** (subagent_type:"
    start = text.index(marker)
    later = [text.find(f"**{other}** (subagent_type:", start + 1) for other in (
        "Injection", "Access control", "Resource and file handling",
        "Cryptography and secrets", "Business logic", "Feature abuse and data leakage",
        "Chained vulnerabilities and trust boundaries", "Wildcard", "Obvious things"
    )]
    later = [position for position in later if position != -1]
    end = min(later) if later else text.find("**Important**", start)
    return text[start:end].rstrip()

ledger_path = RUN / "coverage-ledger.json"
ledger = json.loads(ledger_path.read_text())
arch = (RUN / "architecture.md").read_text()
hunting = (SKILL / "HUNTING.md").read_text()
ordinary = (SKILL / "ATTACK-CLASSES.md").read_text()
schema = json.loads((SKILL / "report-schema.json").read_text())
branches = schema["items"]["oneOf"][:2]

for agent_id, surfaces in GROUPS.items():
    assigned = [u for u in ledger if u["canonical_refs"]["surface"] in surfaces and (
        agent_id not in ("hunter_attempt_volume", "hunter_relationship_attempt") or
        u["canonical_refs"]["boundary"] == (
            "src/server/relationship-form-attempts.ts#retained-submission-volume"
            if agent_id == "hunter_attempt_volume" else
            "src/server/relationship-form-attempts.ts#replay-and-outcome"
        )
    )]
    assert len(assigned) == len(surfaces), (agent_id, surfaces)
    agent_root = RUN / "agents" / agent_id
    if (agent_root / "assignment.md").exists():
        continue
    (agent_root / "scratch").mkdir(parents=True, exist_ok=False)
    (agent_root / "artifacts").mkdir(parents=True, exist_ok=False)
    for unit in assigned:
        assert unit["status"] == "planned"
        unit["status"] = "in_progress"
        unit["agent_id"] = agent_id

    selected = sorted({
        block for unit in assigned for block in
        [unit["ordinary_attack_class_block"], *unit["selected_companion_blocks"]]
        if block is not None
    })
    blocks = []
    for block in selected:
        file_name, heading = block.split("#", 1)
        if file_name == "ATTACK-CLASSES.md":
            body = ordinary_block(ordinary, heading)
        else:
            body = section((SKILL / file_name).read_text(), heading)
        blocks.append(f"### {block}\n\n{body}")
    excluded = [entry for unit in assigned for entry in unit["excluded_blocks"]]
    ordinary_names = [
        "Injection", "Access control", "Resource and file handling",
        "Cryptography and secrets", "Business logic", "Feature abuse and data leakage",
        "Chained vulnerabilities and trust boundaries", "Wildcard", "Obvious things"
    ]
    for name in ordinary_names:
        key = "ATTACK-CLASSES.md#" + name
        if key not in selected:
            excluded.append({"block": key, "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."})

    role = (
        "You are a security hunter. Find source-grounded security invariant failures "
        "in the assigned units and return exactly one JSON object matching the "
        "structured-result contract below."
    )
    parts = [
        role,
        "## Architecture (verbatim)\n\n" + arch,
        "## Assigned units and block map\n\n" + json.dumps(assigned, ensure_ascii=False, indent=2),
        "## Selected source guidance (verbatim blocks)\n\n" + "\n\n".join(blocks),
        "## Excluded blocks and reasons\n\n" + json.dumps(excluded, ensure_ascii=False, indent=2),
        "## Core hunting method and promotion procedure\n\n" + hunting[hunting.index("#### Core hunting method"):hunting.index("#### Core validation rules")],
        "## Core validation rules and result contract\n\n" + hunting[hunting.index("#### Core validation rules"):hunting.index("## Parent consolidation")],
        "## Prior and peer exclusions\n\nNo compatible prior runs or carried findings. Do not duplicate peer-owned coverage IDs; return unexpected boundaries in uncovered.",
        f"## Agent isolation\n\nAgent ID: {agent_id}. Scratch: {agent_root / 'scratch'}. Parent-owned artifacts: {agent_root / 'artifacts'}. Promotion allowlist: empty; per-file and cumulative bound: 0 bytes. The parent has not verified a disk-quota and race-safe promotion setup, so do not execute target-controlled code. Source-only checks use artifact null. Do not write any file.",
        "## Schema branches (verbatim)\n\n" + json.dumps(branches, ensure_ascii=False, indent=2),
    ]
    (agent_root / "assignment.md").write_text("\n\n".join(parts) + "\n")

ledger.sort(key=lambda u: u["coverage_id"])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n")
