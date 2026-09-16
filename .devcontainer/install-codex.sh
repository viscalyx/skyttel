#!/usr/bin/env bash
set -euo pipefail

# Follow Kravhantering's verified, latest-stable standalone installation.
codex_state_dir="${CODEX_HOME:-$HOME/.codex}"
codex_bin_dir="${CODEX_INSTALL_DIR:-$HOME/.local/bin}"
codex_temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/skyttel-codex-installer.XXXXXX")"
trap 'rm -rf "$codex_temp_dir"' EXIT

log() {
  printf '[codex-installer] %s\n' "$*" >&2
}

codex_curl_options=(
  --fail --silent --show-error --location
  --connect-timeout 10 --max-time 120
  --retry 3 --retry-delay 2 --retry-all-errors
)
codex_curl() {
  if [ -n "${GH_TOKEN:-}" ]; then
    if [[ "$GH_TOKEN" == *$'\n'* || "$GH_TOKEN" == *$'\r'* ]]; then
      log 'GitHub token contains invalid characters'
      return 1
    fi
    printf 'Authorization: Bearer %s\n' "$GH_TOKEN" |
      curl "${codex_curl_options[@]}" --header @- "$@"
    return
  fi
  curl "${codex_curl_options[@]}" "$@"
}

codex_release_json="$codex_temp_dir/release.json"
codex_installer="$codex_temp_dir/install.sh"
codex_curl --output "$codex_release_json" \
  https://api.github.com/repos/openai/codex/releases/latest

if ! codex_release_tag="$(
  jq -er 'select(.draft == false and .prerelease == false) |
    .tag_name | select(test("^rust-v[0-9]+\\.[0-9]+\\.[0-9]+$"))' \
    "$codex_release_json"
)" || ! codex_installer_sha256="$(
  jq -er '[.assets[] | select(.name == "install.sh") | .digest |
    select(test("^sha256:[0-9a-fA-F]{64}$"))] |
    if length == 1 then .[0] | sub("^sha256:"; "")
    else error("missing unique install.sh SHA-256 digest") end' \
    "$codex_release_json"
)"; then
  log 'Could not resolve the latest stable Codex installer and digest'
  exit 1
fi
codex_version="${codex_release_tag#rust-v}"

codex_curl --output "$codex_installer" \
  "https://github.com/openai/codex/releases/download/$codex_release_tag/install.sh"
if ! printf '%s  %s\n' "$codex_installer_sha256" "$codex_installer" |
  sha256sum --check --status; then
  log "Codex $codex_version installer checksum validation failed"
  exit 1
fi

mkdir -p "$codex_state_dir" "$codex_bin_dir"
env CODEX_HOME="$codex_state_dir" \
  CODEX_INSTALL_DIR="$codex_bin_dir" \
  CODEX_NON_INTERACTIVE=1 \
  CODEX_RELEASE="$codex_version" \
  sh "$codex_installer"
log "Installed Codex $codex_version"
