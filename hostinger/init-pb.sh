#!/bin/bash
# ============================================
# Mista King Kitchen — PocketBase Init
# ============================================
# Creates admin user and collections on first run.
# Run this AFTER PocketBase is installed.
# ============================================

set -e

PB_URL="${1:-http://127.0.0.1:8090}"
ADMIN_EMAIL="info@nenifix.com"
ADMIN_PASS="nenifix2mkk"

echo "============================================"
echo "  MKK — PocketBase Initialization"
echo "============================================"
echo "  PB URL: $PB_URL"
echo ""

# Wait for PocketBase to be ready
echo "[INFO] Waiting for PocketBase..."
for i in $(seq 1 30); do
    if curl -s "$PB_URL/api/health" > /dev/null 2>&1; then
        echo "[OK] PocketBase is ready"
        break
    fi
    sleep 1
done

# Check if admin already exists
echo "[INFO] Checking for existing admin..."
EXISTING=$(curl -s -o /dev/null -w "%{http_code}" "$PB_URL/api/admins/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null || echo "000")

if [ "$EXISTING" = "200" ]; then
    echo "[OK] Admin user already exists. Skipping creation."
else
    echo "[INFO] Creating admin user..."
    RESPONSE=$(curl -s -X POST "$PB_URL/api/admins" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"passwordConfirm\":\"$ADMIN_PASS\"}")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "[OK] Admin user created: $ADMIN_EMAIL"
    else
        echo "[WARN] Admin creation response: $RESPONSE"
    fi
fi

# Get admin token for collection creation
echo "[INFO] Authenticating as admin..."
AUTH_RESP=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

TOKEN=$(echo "$AUTH_RESP" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{const j=JSON.parse(d);process.stdout.write(j.token||'');}catch(e){}
")

if [ -z "$TOKEN" ]; then
    echo "[WARN] Could not get admin token. Collections must be created manually."
    echo "  Admin URL: ${PB_URL}/_/"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Password: $ADMIN_PASS"
else
    echo "[OK] Authenticated. Creating collections..."

    # Create messages collection (contact form submissions)
    curl -s -X POST "$PB_URL/api/collections" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "name": "messages",
            "type": "base",
            "schema": [
                {"name": "name", "type": "text", "required": true},
                {"name": "email", "type": "email", "required": true},
                {"name": "phone", "type": "text", "required": false},
                {"name": "message", "type": "text", "required": true},
                {"name": "status", "type": "select", "options":{"select":["new","read","replied"]}, "required": true}
            ],
            "listRule": "",
            "viewRule": "",
            "createRule": "",
            "updateRule": "",
            "deleteRule": ""
        }' > /dev/null 2>&1 && echo "[OK] Created 'messages' collection" || echo "[WARN] 'messages' collection may already exist"

    echo ""
    echo "============================================"
    echo "  INITIALIZATION COMPLETE"
    echo "============================================"
    echo ""
    echo "Admin Login:"
    echo "  URL:      ${PB_URL}/_/"
    echo "  Email:    $ADMIN_EMAIL"
    echo "  Password: $ADMIN_PASS"
    echo ""
fi
