#!/usr/bin/env bash
set -e
set -o pipefail

echo "=============================="
echo "Boreal Portal Boot"
echo "=============================="

# Portal-only boot (no BF-client dependency)
echo "Installing portal dependencies..."
npm install

echo "Building portal..."
npm run build

echo "Boot complete"
