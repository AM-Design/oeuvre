#!/usr/bin/env bash
# Build dist/oeuvre-<version>.zip for installing in Publii (⋯ → Themes → Install theme).
# Leaves out development files: .git, docs, dist, scripts, fixtures.
set -euo pipefail

THEME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
THEME_NAME="$(basename "$THEME_DIR")"
VERSION="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$THEME_DIR/config.json")"
OUT="$THEME_DIR/dist/$THEME_NAME-$VERSION.zip"

mkdir -p "$THEME_DIR/dist"
rm -f "$OUT"
cd "$THEME_DIR/.."
zip -qr "$OUT" "$THEME_NAME" \
   -x "$THEME_NAME/.git/*" "$THEME_NAME/docs/*" "$THEME_NAME/dist/*" "$THEME_NAME/scripts/*" "$THEME_NAME/fixtures/*" \
      "$THEME_NAME/.gitignore" '*.DS_Store'
echo "Built $OUT"
