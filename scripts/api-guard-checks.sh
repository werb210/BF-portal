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

echo "✅ API guard checks passed."
