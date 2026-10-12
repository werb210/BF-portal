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
#
# BF_PORTAL_v789_SHARED_SHELL - runs in CI. Shared BF-Server calls a BI screen makes on purpose (staff,
# mailboxes, task queues, telephony, BF lenders) live in src/api/sharedShell.ts, outside the silo. Test
# files are skipped: they never reach BI-Server, and some assert that a call goes to BF-Server.
set -euo pipefail

EXCLUDES=(--exclude-dir=__tests__ --exclude='*.test.ts' --exclude='*.test.tsx')

# Capture quoted "/api/..." strings AND template-literal `/api/...` strings
PATHS_QUOTED=$(grep -rnoE "${EXCLUDES[@]}" '"/api/[^"]+"' src/silos/bi/ 2>/dev/null || true)
PATHS_TEMPLATE=$(grep -rnoE "${EXCLUDES[@]}" '`/api/[^`]+`' src/silos/bi/ 2>/dev/null || true)
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
WARN=$(grep -rnoE "${EXCLUDES[@]}" '("|`)/api/[^"`]+("|`)' $ENTRY_FILES 2>/dev/null | grep -vE '/api/v1/' || true)
if [ -n "$WARN" ]; then
  echo "WARN: the following BI pages call non-/api/v1/* paths, which go to BF-Server (resolveApiBase)."
  echo "      Check each is a shared-shell call; if so, consider moving it to src/api/sharedShell.ts:"
  echo "$WARN"
fi

echo "OK: every BI silo API path uses /api/v1/* (BI-Server prefix contract)"
