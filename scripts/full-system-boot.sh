#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$(cd "${REPO_ROOT}/.." && pwd)"

cat > "${WORKSPACE_ROOT}/.env" << 'ENVEOF'
NODE_ENV=development

# Server
PORT=8080

# Agent
AGENT_API_TOKEN=dev-token

# Client/Portal API target
VITE_API_URL=http://localhost:8080
ENVEOF

for dir in BF-Server BF-client BF-portal agent; do
  echo "Installing ${dir}..."
  if [[ -d "${WORKSPACE_ROOT}/${dir}" ]]; then
    (
      cd "${WORKSPACE_ROOT}/${dir}"
      npm ci --prefer-offline --no-audit --no-fund
    )
  else
    echo "WARNING: ${dir} not found under ${WORKSPACE_ROOT}; skipping install"
  fi
done

(
  cd "${WORKSPACE_ROOT}/BF-Server"
  npm run build
  node dist/index.js > "${WORKSPACE_ROOT}/server.log" 2>&1 &
  echo $! > "${WORKSPACE_ROOT}/server.pid"
)

sleep 3

(
  cd "${WORKSPACE_ROOT}/agent"
  npm run build
  node dist/index.js > "${WORKSPACE_ROOT}/agent.log" 2>&1 &
  echo $! > "${WORKSPACE_ROOT}/agent.pid"
)

sleep 3

(
  cd "${WORKSPACE_ROOT}/BF-client/client-app"
  npm run dev -- --host > "${WORKSPACE_ROOT}/client.log" 2>&1 &
  echo $! > "${WORKSPACE_ROOT}/client.pid"
)

(
  cd "${WORKSPACE_ROOT}/BF-portal"
  npm run dev -- --host > "${WORKSPACE_ROOT}/portal.log" 2>&1 &
  echo $! > "${WORKSPACE_ROOT}/portal.pid"
)

sleep 5

echo "Checking server..."
curl -f http://localhost:8080/health

echo "Checking agent..."
curl -f http://localhost:4000/health

echo "Checking client..."
curl -f http://localhost:3000/health

echo "Checking portal..."
if grep -qi "error" "${WORKSPACE_ROOT}/portal.log"; then
  echo "PORTAL FAILED"
  exit 1
fi
echo "PORTAL OK"

echo ""
echo "SYSTEM RUNNING:"
echo "Client  -> http://localhost:5173"
echo "Portal  -> http://localhost:5174"
echo "Server  -> http://localhost:8080"

cat > "${WORKSPACE_ROOT}/stop-all.sh" << 'STOPEOF'
#!/usr/bin/env bash
kill $(cat server.pid) 2>/dev/null
kill $(cat agent.pid) 2>/dev/null
kill $(cat client.pid) 2>/dev/null
kill $(cat portal.pid) 2>/dev/null
rm -f *.pid
echo "All services stopped"
STOPEOF

chmod +x "${WORKSPACE_ROOT}/stop-all.sh"

echo ""
echo "Created ${WORKSPACE_ROOT}/stop-all.sh"

echo "Running health checks..."
curl -f http://localhost:3000/health
curl -f http://localhost:4000/health
echo "System boot verified"
