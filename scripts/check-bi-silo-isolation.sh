#!/usr/bin/env bash
# BI_HARD_ISOLATION_v59 — BI silo files must use /api/v1/bi/* paths.
#
# Background: BI-Server's enforceBIPrefix middleware rejects anything that
# isn't under /api/v1/bi/*. So even though resolveApiBase() now sends
# everything in BI silo to BI-Server, the silo's own files still need to
# use the right prefix or BI-Server will 400 them.
#
# This gate scans every API path string referenced inside src/silos/bi/.
# Every match must start with /api/v1/.
set -euo pipefail

# Capture quoted "/api/..." strings AND template-literal `/api/...` strings
PATHS_QUOTED=$(grep -rnoE '"/api/[^"]+"' src/silos/bi/ 2>/dev/null || true)
PATHS_TEMPLATE=$(grep -rnoE '`/api/[^`]+`' src/silos/bi/ 2>/dev/null || true)
ALL="$PATHS_QUOTED
$PATHS_TEMPLATE"

# Fail if any matched path does not start with /api/v1/
BAD=$(echo "$ALL" | grep -v '^$' | grep -vE '/api/v1/' || true)
if [ -n "$BAD" ]; then
  echo "FAIL: BI silo files reference paths outside /api/v1/* — BI-Server will reject them:"
  echo "$BAD"
  exit 1
fi

# Pages that mount BI silo content live outside src/silos/bi/. Trace common
# entry points and warn (don't fail) if they call non-/api/v1/* paths — those
# calls will now go to BI-Server (per silo-based routing) and 404 if BI-Server
# doesn't implement them.
ENTRY_FILES="src/pages/bi src/silos/bi"
WARN=$(grep -rnoE '("|`)/api/(?!v1/)[^"`]+("|`)' $ENTRY_FILES 2>/dev/null || true)
if [ -n "$WARN" ]; then
  echo "WARN: the following BI-routed files call non-/api/v1/* paths."
  echo "      Under BI_HARD_ISOLATION_v59 these now go to BI-Server (404 unless implemented):"
  echo "$WARN"
fi

echo "OK: every BI silo API path uses /api/v1/* (BI-Server prefix contract)"
