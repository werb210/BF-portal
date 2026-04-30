#!/usr/bin/env bash
# BI_PGI_ALIGNMENT_v56 — fail CI if any BI silo file calls a non-/api/v1/ path.
# BI silo files MUST only talk to BI-Server (path-based routing in src/config/api.ts).
set -euo pipefail
BAD=$(grep -rnE '"/api/(?!v1/)[^"]+"' src/silos/bi/ 2>/dev/null || true)
if [ -n "$BAD" ]; then
  echo "FAIL: BI silo file(s) call non-/api/v1/ paths (would route to BF-Server, breaking silo isolation):"
  echo "$BAD"
  exit 1
fi
echo "OK: all BI silo API calls use /api/v1/* (BI-Server only)"
