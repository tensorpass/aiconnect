#!/usr/bin/env bash
# Copies the Web Components script built by packages/elements into the plugin, then zips the plugin into
# dist/aiconnect.zip, ready to upload in WordPress under Plugins, Add New. Build the SDK first with npm run build
# at the repository root.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
script="$here/../../packages/elements/dist/aiconnect-elements.js"

if [[ ! -f "$script" ]]; then
  echo "Build the SDK first: npm run build at the repository root." >&2
  exit 1
fi

mkdir -p "$here/aiconnect/assets" "$here/dist"
cp "$script" "$script.map" "$here/aiconnect/assets/"
rm -f "$here/dist/aiconnect.zip"
(cd "$here" && zip -qr dist/aiconnect.zip aiconnect)
echo "$here/dist/aiconnect.zip"
