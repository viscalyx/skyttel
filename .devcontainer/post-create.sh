#!/usr/bin/env bash
set -euo pipefail
trap 'echo "Skyttel tool and dependency setup failed. See the lifecycle output above." >&2' ERR

npm ci
# Resolve current browser tooling on every creation, including cached rebuilds.
npm install --global --prefix "$HOME/.local" playwright@latest
"$HOME/.local/bin/playwright" install --with-deps
# The application test runner also needs the browsers from its own lockfile.
npx --no-install playwright install
bash .devcontainer/link-playwright-chrome.sh
bash .devcontainer/install-codex.sh
"$HOME/.local/bin/playwright" --version
