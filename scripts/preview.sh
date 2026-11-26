#!/usr/bin/env bash
# Render a Publii test site with this working copy of the theme, using Publii's own renderer,
# without opening the Publii app. The site is copied first, so the real site folder is never written to.
#
# Usage: scripts/preview.sh [site-name] [--serve]
#   site-name  Publii site folder name (default: oeurve-test). Never use the live site.
#   --serve    serve the result at http://127.0.0.1:8765/ (Ctrl-C to stop)
#
# Environment overrides: PUBLII_DIR (default ~/Documents/Publii), PUBLII_APP (default /Applications/Publii.app),
#                        WORK_DIR (default ${TMPDIR:-/tmp}/oeuvre-preview), PORT (default 8765)
set -euo pipefail

SITE="oeurve-test"
SERVE=0
for arg in "$@"; do
   case "$arg" in
      --serve) SERVE=1 ;;
      *) SITE="$arg" ;;
   esac
done

THEME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBLII_DIR="${PUBLII_DIR:-$HOME/Documents/Publii}"
PUBLII_APP="${PUBLII_APP:-/Applications/Publii.app}"
WORK_DIR="${WORK_DIR:-${TMPDIR:-/tmp}/oeuvre-preview}"
PORT="${PORT:-8765}"
THEME_NAME="$(basename "$THEME_DIR")"

if [ ! -d "$PUBLII_DIR/sites/$SITE" ]; then
   echo "No Publii site named '$SITE' in $PUBLII_DIR/sites" >&2
   exit 1
fi

mkdir -p "$WORK_DIR/sites"

# 1. copy the site (content, media, config) without its old preview/output
rsync -a --delete --exclude preview --exclude output "$PUBLII_DIR/sites/$SITE/" "$WORK_DIR/sites/$SITE/"

# 2. drop in this working copy of the theme (Publii regenerates style.css from main.css)
rsync -a --delete \
   --exclude .git --exclude docs --exclude dist --exclude scripts --exclude fixtures \
   --exclude .gitignore --exclude .DS_Store --exclude assets/css/style.css \
   "$THEME_DIR/" "$WORK_DIR/sites/$SITE/input/themes/$THEME_NAME/"

# 3. render with Publii's own renderer (its Electron binary in Node mode)
ELECTRON_RUN_AS_NODE=1 "$PUBLII_APP/Contents/MacOS/Publii" "$THEME_DIR/scripts/render.js" \
   "$PUBLII_DIR" "$WORK_DIR/sites" "$SITE" "http://127.0.0.1:$PORT" "$PUBLII_APP" \
   | grep -v '^\[OK\] Deleted empty directory'

if [ "$SERVE" = 1 ]; then
   echo "Serving http://127.0.0.1:$PORT/"
   cd "$WORK_DIR/sites/$SITE/preview"
   exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi
