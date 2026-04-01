#!/usr/bin/env bash
set -euo pipefail

echo "Running single API pipeline enforcement..."

rg -n "fetch\(" src --glob '!src/lib/api.ts' --glob '!src/api/client.ts' --glob '!src/main.tsx' --glob '!src/__tests__/integration.test.ts' && exit 1
rg -n "axios\(" src && exit 1
rg -n "XMLHttpRequest" src --glob '!src/__tests__/**' --glob '!src/test/**' && exit 1

echo "✅ Single API pipeline enforcement passed."
