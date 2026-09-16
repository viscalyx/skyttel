#!/usr/bin/env bash
set -euo pipefail

# Use the official server CLI so VS Code also records extension metadata.
# The VSIX is verified during image build and remains available after rebuilds.
/opt/vscode/bin/code-server \
  --install-extension /opt/codex-extension.vsix \
  --extensions-dir /home/vscode/.vscode-server/extensions \
  --force
