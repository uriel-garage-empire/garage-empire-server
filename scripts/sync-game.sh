#!/usr/bin/env bash
# Pulls the game files (3D models, catalog, markets, styles) from the public demo repo into public/.
# Existing files are never overwritten (cp -n), so the server layer and the three patched files
# (index.html, ui2.js, save-schema.js) in this repo always win.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
git clone --depth 1 https://github.com/uriel-garage-empire/garage-empire-demo.git "$tmp/demo"
rm -rf "$tmp/demo/.git" "$tmp/demo/README.md" "$tmp/demo/10-index.html"
mkdir -p public
cp -rn "$tmp/demo/." public/
rm -rf "$tmp"
echo "Game files synced: $(ls public | wc -l) entries in public/"
