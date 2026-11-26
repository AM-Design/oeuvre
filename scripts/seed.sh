#!/usr/bin/env bash
# Build (or rebuild) the throwaway "oeuvre-dev" Publii site from fixtures/oeuvre-dev.json,
# using Publii's own back-end code. Publii must be closed: the app keeps the site database open.
#
# Usage: scripts/seed.sh [fixture.json]
# Environment overrides: PUBLII_DIR (default ~/Documents/Publii), PUBLII_APP (default /Applications/Publii.app)
#
# Only ever creates or replaces a site folder named oeuvre-dev…, and only one this script made
# (it carries a .oeuvre-fixture-site marker). It never touches any other site.
set -euo pipefail

THEME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="${1:-$THEME_DIR/fixtures/oeuvre-dev.json}"
PUBLII_DIR="${PUBLII_DIR:-$HOME/Documents/Publii}"
PUBLII_APP="${PUBLII_APP:-/Applications/Publii.app}"

if pgrep -x Publii >/dev/null 2>&1; then
   echo "Publii is running. Quit Publii first (it holds the site database open), then run this again." >&2
   exit 1
fi

ELECTRON_RUN_AS_NODE=1 "$PUBLII_APP/Contents/MacOS/Publii" "$THEME_DIR/scripts/seed.js" \
   "$PUBLII_DIR" "$PUBLII_DIR/sites" "$FIXTURE" "$THEME_DIR" "$PUBLII_APP"
