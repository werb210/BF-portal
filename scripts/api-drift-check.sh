#!/usr/bin/env bash
set -e

echo "---------------------------------"
echo "Boreal API Drift Diagnostic"
echo "---------------------------------"

WORKDIR=$(pwd)

SERVER_DIR="../BF-Server"
PORTAL_DIR="../Staff-Portal"
CLIENT_DIR="../BF-Client"

echo ""
echo "Extracting server routes..."

grep -R "router\." $SERVER_DIR/src \
 | sed -E 's/.*"(\/api[^"]+)".*/\1/' \
 | sort | uniq > server-routes.txt

echo ""
echo "Extracting portal API calls..."

grep -R "/api/" $PORTAL_DIR/src \
 | sed -E 's/.*"(\/api[^"]+)".*/\1/' \
 | sort | uniq > portal-calls.txt

echo ""
echo "Extracting client API calls..."

grep -R "/api/" $CLIENT_DIR/src \
 | sed -E 's/.*"(\/api[^"]+)".*/\1/' \
 | sort | uniq > client-calls.txt

echo ""
echo "---------------------------------"
echo "PORTAL CALLS NOT IN SERVER"
echo "---------------------------------"

comm -23 portal-calls.txt server-routes.txt || true

echo ""
echo "---------------------------------"
echo "CLIENT CALLS NOT IN SERVER"
echo "---------------------------------"

comm -23 client-calls.txt server-routes.txt || true

echo ""
echo "---------------------------------"
echo "DONE"
echo "---------------------------------"
