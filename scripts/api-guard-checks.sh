#!/usr/bin/env bash
set -euo pipefail

echo "Running API guard checks..."

if rg "fetch\(" src > /dev/null; then
  echo "❌ Disallowed fetch() usage found in src/."
  exit 1
fi

AXIOS_CREATE_COUNT=$( (rg "axios\.create" src || true) | wc -l | tr -d ' ' )
if [ "$AXIOS_CREATE_COUNT" -gt 1 ]; then
  echo "❌ Found more than one axios.create usage in src/ (count=$AXIOS_CREATE_COUNT)."
  exit 1
fi

if rg "from 'api/" src > /dev/null; then
  echo "❌ Found disallowed non-aliased api imports (from 'api/...)."
  exit 1
fi

if [ -d "api" ]; then
  echo "❌ Root-level api/ folder is disallowed. Use src/api/ only."
  exit 1
fi

if rg "VITE_API_URL" src > /dev/null; then
  echo "❌ VITE_API_URL usage is disallowed."
  exit 1
fi

echo "✅ API guard checks passed."
