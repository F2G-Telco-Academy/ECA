#!/bin/bash

# Extended Cellular Analyzer - Startup Script
# Version 0.1.0

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo " Extended Cellular Analyzer"
echo " Version 0.1.0"
echo "========================================"
echo ""

# Check Java
echo -n "[1/4] Checking Java installation... "
if ! command -v java &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Java not found. Please install JDK 21+"
    exit 1
fi
echo -e "${GREEN}[OK]${NC}"

# Check Node.js
echo -n "[2/4] Checking Node.js installation... "
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js not found. Please install Node.js 18+"
    exit 1
fi
echo -e "${GREEN}[OK]${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Start Backend
echo "[3/4] Starting backend server..."
java -jar target/p2-0.0.1-SNAPSHOT.jar > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}[OK]${NC} Backend starting (PID: $BACKEND_PID)"

# Wait for backend
echo "[4/4] Waiting for backend to initialize..."
sleep 10

# Check backend health
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend is healthy"
else
    echo -e "${YELLOW}[WARN]${NC} Backend may not be ready yet"
fi

# Start Frontend
echo ""
if [ -f "frontend/src-tauri/target/release/extended-cellular-analyzer" ]; then
    echo "Starting desktop application..."
    cd frontend/src-tauri/target/release
    ./extended-cellular-analyzer &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"
else
    echo -e "${YELLOW}[INFO]${NC} Desktop app not found. Starting dev server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"
fi

echo ""
echo "========================================"
echo " Application Started Successfully!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services..."

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "Services stopped. Goodbye!"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for user interrupt
wait
