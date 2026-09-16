#!/usr/bin/env bash
set -euo pipefail
trap 'echo "Skyttel dependency setup failed. See the lifecycle output above." >&2' ERR

npm ci
