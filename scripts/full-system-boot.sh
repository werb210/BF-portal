#!/usr/bin/env bash
set -e
set -o pipefail

echo "=============================="
echo "Boreal Full System Boot"
echo "=============================="

ROOT_DIR="$(pwd)"

SERVER_DIR="../BF-Server"
CLIENT_DIR="../BF-client"
PORTAL_DIR="."
AGENT_DIR="../agent"

# =========================
# 1. INSTALL DEPENDENCIES
# =========================
echo "Installing dependencies..."

for dir in "$SERVER_DIR" "$CLIENT_DIR" "$PORTAL_DIR" "$AGENT_DIR"; do
  echo "Installing in $dir"
  (cd "$dir" && npm ci)
done

# =========================
# 2. BUILD ALL SERVICES
# =========================
echo "Building services..."

(cd "$SERVER_DIR" && npm run build)
(cd "$CLIENT_DIR" && npm run build)
(cd "$PORTAL_DIR" && npm run build)
(cd "$AGENT_DIR" && npm run build)

# =========================
# 3. START SERVICES
# =========================
echo "Starting services..."

(cd "$SERVER_DIR" && node dist/index.js &) 
SERVER_PID=$!

(cd "$AGENT_DIR" && node dist/index.js &) 
AGENT_PID=$!

(cd "$CLIENT_DIR/client-app" && npm run preview &) 
CLIENT_PID=$!

sleep 5

# =========================
# 4. HEALTH CHECKS
# =========================
echo "Running health checks..."

curl -f http://localhost:8080/health
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
  kill $SERVER_PID $AGENT_PID $CLIENT_PID || true
}
trap cleanup EXIT

wait
