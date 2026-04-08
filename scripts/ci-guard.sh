#!/usr/bin/env bash
set -euo pipefail

echo "Running portal CI guard checks..."

if find src -type f -name '*.js' | grep -q .; then
  echo "❌ Compiled JavaScript files found under src/. Remove generated .js artifacts."
  find src -type f -name '*.js'
  exit 1
fi

if rg -n "twilio-client" src; then
  echo "❌ Forbidden legacy import found: twilio-client"
  exit 1
fi

if ! rg -n 'navigate\("/portal"' src/pages/LoginPage.tsx >/dev/null; then
  echo "❌ LoginPage.tsx no longer navigates to /portal"
  exit 1
fi

if rg -n "networkGuard" src --glob '!src/**/__tests__/**' --glob '!src/test/**'; then
  echo "❌ networkGuard regression detected"
  exit 1
fi

if rg -n "global\.fetch\s*=" src \
  --glob '!src/**/__tests__/**' \
  --glob '!src/test/**' \
  --glob '!src/tests/**'; then
  echo "❌ fetch hijack regression detected outside test files"
  exit 1
fi

echo "✅ Portal CI guards passed."
