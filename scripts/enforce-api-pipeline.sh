#!/usr/bin/env bash
set -euo pipefail

echo "Running single API pipeline enforcement..."

if rg -n "withCredentials\s*:\s*true|credentials\s*:\s*['\"]include['\"]|document\.cookie" src; then
  echo "❌ Cookie/credential auth usage detected"
  exit 1
fi

if rg -n "\baxios\(|\bsafeFetch\b|\bfetchGuard\b|\bbiClient\b" src; then
  echo "❌ Forbidden network client usage detected"
  exit 1
fi

if rg -n "\bfetch\(" src --glob '!src/lib/apiClient.ts'; then
  echo "❌ Direct fetch usage detected outside src/lib/apiClient.ts"
  exit 1
fi

echo "✅ Single API pipeline enforcement passed."
