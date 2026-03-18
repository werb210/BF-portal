#!/usr/bin/env bash
set -euo pipefail

echo "---------------------------------"
echo "PORTAL FINAL API CHECK"
echo "---------------------------------"

# Install dependencies only when missing
if [ ! -d node_modules ]; then
  npm install
fi

mkdir -p artifacts

# -------------------------------------------------
# Extract portal API usage
# -------------------------------------------------

echo "Extracting portal API routes..."

grep -rhoE '"/api/[a-zA-Z0-9/_:-]+' src \
| sed 's/"//g' \
| sort \
| uniq \
> artifacts/portal-routes.txt

echo "Portal routes:"
cat artifacts/portal-routes.txt

# -------------------------------------------------
# Download authoritative server route list
# -------------------------------------------------

echo "Fetching server route contract..."

SERVER_ROUTES_URL="${SERVER_ROUTES_URL:-https://raw.githubusercontent.com/werb210/staff/main/artifacts/server-routes.txt}"

if curl -fsSL \
  "$SERVER_ROUTES_URL" \
  -o artifacts/server-routes.txt; then
  echo "Server routes:"
  cat artifacts/server-routes.txt
else
  echo "WARNING: Could not fetch server route contract from GitHub."
  echo "Skipping route comparison because server contract is unavailable."
  npm run build
  echo "---------------------------------"
  echo "PORTAL CHECK COMPLETE"
  echo "---------------------------------"
  exit 0
fi

# -------------------------------------------------
# Compare portal vs server routes
# -------------------------------------------------

echo "---------------------------------"
echo "PORTAL ROUTES NOT FOUND ON SERVER"
echo "---------------------------------"

comm -23 \
<(sort artifacts/portal-routes.txt) \
<(sort artifacts/server-routes.txt) \
|| true

echo "---------------------------------"
echo "SERVER ROUTES NOT USED BY PORTAL"
echo "---------------------------------"

comm -13 \
<(sort artifacts/portal-routes.txt) \
<(sort artifacts/server-routes.txt) \
|| true

# -------------------------------------------------
# Build verification
# -------------------------------------------------

echo "Building portal..."

npm run build

echo "---------------------------------"
echo "PORTAL CHECK COMPLETE"
echo "---------------------------------"
