#!/usr/bin/env bash
set -euo pipefail

echo "Running API guard checks..."

AXIOS_COUNT=$( (rg "axios\\." src || true) | wc -l )
FETCH_COUNT=$( (rg "fetch\\(" src || true) | wc -l )
LOCALSTORAGE_COUNT=$( (rg "localStorage" src || true) | wc -l )

if [ "$AXIOS_COUNT" -ne 0 ]; then
  echo "FAIL: axios usage detected"
  exit 1
fi

if [ "$FETCH_COUNT" -ne 0 ]; then
  echo "FAIL: fetch usage detected"
  exit 1
fi

if [ "$LOCALSTORAGE_COUNT" -ne 0 ]; then
  echo "FAIL: localStorage usage detected"
  exit 1
fi

echo "✅ API guard checks passed."
