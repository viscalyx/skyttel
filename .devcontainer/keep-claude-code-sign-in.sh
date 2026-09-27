#!/usr/bin/env bash
set -euo pipefail

# Keep only the Claude Code sign-in from an earlier container. Settings,
# history, and all other Claude Code state start fresh on every creation.
claude_dir="${HOME}/.claude"
mkdir -p "${claude_dir}"
find "${claude_dir}" -mindepth 1 -maxdepth 1 ! -name .credentials.json \
  -exec rm -rf -- {} +
