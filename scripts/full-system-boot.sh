#!/usr/bin/env bash
set -e
set -o pipefail

echo "=============================="
echo "Boreal Full System Boot"
echo "=============================="

ROOT_DIR="$(pwd)"

SERVER_URL=${SERVER_URL:-https://api.boreal.financial}
CLIENT_DIR="../BF-client"
PORTAL_DIR="."
AGENT_DIR="../agent"

# =========================
# 1. INSTALL DEPENDENCIES
# =========================
echo "Installing dependencies..."

for dir in "$CLIENT_DIR" "$PORTAL_DIR" "$AGENT_DIR"; do
  echo "Installing in $dir"
  (cd "$dir" && npm ci)
done

# =========================
# 2. BUILD ALL SERVICES
# =========================
echo "Building services..."

(cd "$CLIENT_DIR" && npm run build)
(cd "$PORTAL_DIR" && npm run build)
(cd "$AGENT_DIR" && npm run build)

# =========================
# 3. START SERVICES
# =========================
echo "Starting services..."

echo "Using remote server: $SERVER_URL"
export VITE_API_BASE_URL="$SERVER_URL"

(cd "$AGENT_DIR" && node dist/index.js &) 
AGENT_PID=$!

(cd "$CLIENT_DIR/client-app" && npm run preview &) 
CLIENT_PID=$!

sleep 5

# =========================
# 4. HEALTH CHECKS
# =========================
echo "Running health checks..."

curl -f "${SERVER_URL%/}/health"
curl -f http://localhost:4000/health

# =========================
# 5. SUCCESS
# =========================
echo "=============================="
echo "SYSTEM BOOT VERIFIED"
echo "=============================="

# =========================
# 6. CLEANUP HANDLER
# =========================
cleanup() {
  echo "Shutting down services..."
  kill $AGENT_PID $CLIENT_PID || true
}
trap cleanup EXIT

wait
