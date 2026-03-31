#!/usr/bin/env bash
set -euo pipefail

echo "Running single API pipeline enforcement..."

grep -R "fetch(" src | grep -v "apiClient.ts" && exit 1
grep -R "axios(" src && exit 1
grep -R "XMLHttpRequest" src && exit 1

echo "✅ Single API pipeline enforcement passed."
