#!/bin/bash
# ============================================
# Mista King Kitchen — PocketBase Setup
# ============================================
# Run this script ON THE HOSTINGER SERVER to:
# 1. Download PocketBase binary
# 2. Create admin user (info@nenifix.com / nenifix2mkk)
# ============================================

set -e

PB_DIR="$(cd "$(dirname "$0")" && echo $PWD)"
PB_VERSION="0.22.13"

echo "============================================"
echo "  MKK — PocketBase Setup"
echo "============================================"
echo ""

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    arm64)   ARCH="arm64" ;;
esac

echo "[INFO] OS: $OS, Arch: $ARCH"

# Download PocketBase
PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
PB_ZIP="$PB_DIR/pocketbase.zip"

echo "[INFO] Downloading PocketBase v${PB_VERSION}..."
echo "  URL: $PB_URL"

curl -L -o "$PB_ZIP" "$PB_URL" 2>&1 | tail -3

echo "[INFO] Extracting..."
cd "$PB_DIR"
unzip -o "$PB_ZIP" pocketbase
rm -f "$PB_ZIP"
chmod +x pocketbase

echo "[OK] PocketBase binary ready: $PB_DIR/pocketbase"

# Create data directory
mkdir -p "$PB_DIR/pb_data"

# Start PocketBase temporarily to create admin
echo "[INFO] Starting PocketBase for initial setup..."
./pocketbase serve --http 127.0.0.1:8090 &
PB_PID=$!
sleep 3

# Create admin user
echo "[INFO] Creating admin user..."
curl -s -X POST http://127.0.0.1:8090/api/admins \
    -H "Content-Type: application/json" \
    -d '{"email":"info@nenifix.com","password":"nenifix2mkk","passwordConfirm":"nenifix2mkk"}'

echo ""
echo "[OK] Admin user created: info@nenifix.com"

# Stop PocketBase
kill $PB_PID 2>/dev/null || true
sleep 1

echo ""
echo "============================================"
echo "  SETUP COMPLETE"
echo "============================================"
echo ""
echo "Admin Login:"
echo "  Email:    info@nenifix.com"
echo "  Password: nenifix2mkk"
echo "  URL:      http://localhost:8090/_/"
echo ""
echo "To start the app:"
echo "  npm start"
echo ""
