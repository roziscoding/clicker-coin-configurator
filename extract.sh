#!/usr/bin/env bash
#
# Populate the configurator with the Clicker Coin STLs from a Printables download.
#
# The 3D models are NOT redistributed in this repo (see README).
# Download the model archive from Printables, then run:
#
#     ./extract.sh ~/Downloads/fidget-toy-clicker-coin-v2.zip
#
# It extracts the archive to a temp dir, copies every .stl (from any nested
# folder) into public/models/, sanity-checks the expected parts, and
# removes the temp dir.

set -euo pipefail

ZIP="${1:-}"
if [[ -z "$ZIP" ]]; then
  echo "Usage: ./extract.sh <path-to-printables-zip>" >&2
  exit 1
fi
if [[ ! -f "$ZIP" ]]; then
  echo "Error: file not found: $ZIP" >&2
  exit 1
fi
if ! command -v unzip >/dev/null 2>&1; then
  echo "Error: 'unzip' is required but not installed." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$SCRIPT_DIR/public/models"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Extracting $(basename "$ZIP") ..."
unzip -q "$ZIP" -d "$TMP"

mkdir -p "$DEST"

echo "→ Copying STL files into public/models/ ..."
count=0
while IFS= read -r -d '' f; do
  cp -f "$f" "$DEST/"
  count=$((count + 1))
done < <(find "$TMP" -type f -iname '*.stl' -print0)

echo "  copied $count file(s)."

# Sanity-check against the 18 parts the configurator expects.
EXPECTED=(
  top.stl clicker.stl wheel.stl bottom.stl
  top-duo.stl bottom-duo.stl bottom-vented.stl top-vented.stl
  clicker-high-resistance-hollow.stl clicker-high-resistance-solid.stl
  clicker-high-resistance-solid-hex.stl clicker-solid.stl clicker-solid-hex.stl
  wheel-2-star.stl wheel-3-squared.stl wheel-4-sprocket.stl
  wheel-5-orbit.stl wheel-6-cog.stl
)
missing=0
for e in "${EXPECTED[@]}"; do
  if [[ ! -f "$DEST/$e" ]]; then
    echo "  ⚠ missing expected part: $e" >&2
    missing=$((missing + 1))
  fi
done

if [[ $missing -gt 0 ]]; then
  echo "✗ $missing of ${#EXPECTED[@]} expected parts missing — check the archive." >&2
  exit 1
fi

echo "✓ All ${#EXPECTED[@]} parts present in public/models/. Run 'mise dev' to view."
