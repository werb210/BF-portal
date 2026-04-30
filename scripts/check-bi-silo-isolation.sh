#!/usr/bin/env bash
# BI_PIPELINE_ALIGN_v57 — fail CI if any BI silo file calls a non-/api/v1/ path.
set -euo pipefail
BAD=$(grep -rnE '"/api/(?!v1/)[^"]+"' src/silos/bi/ 2>/dev/null || true)
if [ -n "$BAD" ]; then
  echo "FAIL: BI silo file(s) call non-/api/v1/ paths:"
  echo "$BAD"
  exit 1
fi
echo "OK: all BI silo API calls use /api/v1/* (BI-Server only)"
