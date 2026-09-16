#!/usr/bin/env bash
set -euo pipefail

chrome_bin="$(
    node --input-type=module -e '
        import { pathToFileURL } from "node:url";
        const { chromium } = await import(pathToFileURL(process.argv[1]).href);
        console.log(chromium.executablePath());
    ' "$HOME/.local/lib/node_modules/playwright/index.mjs"
)"
if [[ ! -x "$chrome_bin" ]]; then
    echo "[playwright-chrome] Playwright Chromium is missing: $chrome_bin" >&2
    exit 1
fi

ln -sf "$chrome_bin" /opt/google/chrome/chrome
echo "[playwright-chrome] Linked /opt/google/chrome/chrome -> $chrome_bin"
