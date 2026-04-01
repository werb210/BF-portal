#!/usr/bin/env bash
set -euo pipefail

echo "Checking for forbidden test-environment regressions..."

node -e '
  const fs = require("fs");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "overrides"];
  const found = sections.some((key) => pkg[key] && Object.prototype.hasOwnProperty.call(pkg[key], "node-fetch"));
  if (found) {
    console.error("❌ Forbidden package found in package.json: node-fetch");
    process.exit(1);
  }
'

TARGETS=(
  "src/__tests__/setup.ts"
  "src/__tests__/integration.test.ts"
  "vite.config.ts"
  ".env.test"
)

if rg -n "node-fetch" "${TARGETS[@]}"; then
  echo "❌ Forbidden pattern found: node-fetch"
  exit 1
fi

if rg -n "http://localhost:" "${TARGETS[@]}"; then
  echo "❌ Forbidden pattern found: http://localhost:"
  exit 1
fi

if rg -n "https?://" "${TARGETS[@]}"; then
  echo "❌ Forbidden pattern found: hardcoded API URL"
  exit 1
fi

if rg -n "axios|XMLHttpRequest|WebSocket" src/__tests__ src/test; then
  echo "❌ Forbidden network primitive found in test sources"
  exit 1
fi

echo "✅ Regression guard passed."
