#!/usr/bin/env bash
set -euo pipefail

echo "Running API guard checks..."

check() {
  PATTERN=$1
  MSG=$2

  if rg -n "$PATTERN" src; then
    echo "FAIL: $MSG"
    exit 1
  fi
}

check "axios\\." "axios usage detected"
check "fetch\\(" "fetch usage detected"
check "localStorage" "localStorage usage detected"
check "window\\." "window usage detected"
check "document\\." "document usage detected"
check "\\?\\." "optional chaining usage detected"

if rg -n "\\.data" src --glob '!src/lib/assertApiResponse.ts'; then
  echo "FAIL: raw .data access detected outside assertApiResponse.ts"
  exit 1
fi

if rg -n "axios" src --glob '!src/lib/api.ts' --glob '!src/__tests__/**'; then
  echo "FAIL: axios usage detected outside src/lib/api.ts"
  exit 1
fi

echo "✅ API guard checks passed."
