#!/usr/bin/env bash
set -euo pipefail
trap 'echo "Skyttel startup failed. See the lifecycle output above; rerun bash .devcontainer/post-start.sh after fixing the error." >&2' ERR

for directory in /data "$HOME/.codex" "$HOME/.config/skyttel" "$HOME/.vscode-server" "$HOME/worktrees"; do
    mkdir -p "$directory"
    test -w "$directory"
done

# Create private development configuration once. Preserve personal settings.
node .devcontainer/prepare-environment.mjs
bash /usr/local/share/skyttel/install-extension.sh
echo 'Skyttel development environment ready. Run npm run dev:all to start the app.'
