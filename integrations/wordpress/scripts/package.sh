#!/usr/bin/env bash
# Copies the scripts built by packages/elements into the plugin, the Web Components script and the script of the
# sign in return page, then zips the plugin into dist/aiconnect.zip, ready to upload in WordPress under Plugins,
# Add New. Build the SDK first with npm run build at the repository root.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
built="$here/../../packages/elements/dist"
scripts=("$built/aiconnect-elements.js" "$built/aiconnect-elements.js.map" "$built/aiconnect-callback.js")

for script in "${scripts[@]}"; do
  if [[ ! -f "$script" ]]; then
    echo "Build the SDK first: npm run build at the repository root." >&2
    exit 1
  fi
done

mkdir -p "$here/aiconnect/assets" "$here/dist"
cp "${scripts[@]}" "$here/aiconnect/assets/"
rm -f "$here/dist/aiconnect.zip"
(cd "$here" && zip -qr dist/aiconnect.zip aiconnect)
echo "$here/dist/aiconnect.zip"
