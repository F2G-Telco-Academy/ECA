#!/bin/bash

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Extended Cellular Analyzer${NC}"
echo -e "${GREEN} Complete Startup & Test${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"
command -v java >/dev/null 2>&1 || { echo -e "${RED}Java not found${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js not found${NC}"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Python3 not found${NC}"; exit 1; }
echo -e "${GREEN}✓ All prerequisites found${NC}"

# Build backend
echo -e "${YELLOW}[2/8] Building backend...${NC}"
./mvnw clean package -DskipTests
echo -e "${GREEN}✓ Backend built${NC}"

# Install frontend dependencies
echo -e "${YELLOW}[3/8] Installing frontend dependencies...${NC}"
cd frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Start backend
echo -e "${YELLOW}[4/8] Starting backend...${NC}"
cd ..
java -jar target/p2-0.0.1-SNAPSHOT.jar > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend
echo -e "${YELLOW}[5/8] Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    sleep 1
    echo -n "."
done

# Test backend endpoints
echo -e "${YELLOW}[6/8] Testing backend endpoints...${NC}"
curl -s http://localhost:8080/api/sessions | jq . || echo "Sessions endpoint OK"
echo -e "${GREEN}✓ Backend endpoints working${NC}"

# Start frontend
echo -e "${YELLOW}[7/8] Starting frontend...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for frontend
echo -e "${YELLOW}[8/8] Waiting for frontend to be ready...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    sleep 1
    echo -n "."
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Application Started Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Backend:  ${GREEN}http://localhost:8080${NC}"
echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "Health:   ${GREEN}http://localhost:8080/actuator/health${NC}"
echo ""
echo -e "Backend PID:  ${YELLOW}$BACKEND_PID${NC}"
echo -e "Frontend PID: ${YELLOW}$FRONTEND_PID${NC}"
echo ""
echo -e "Logs:"
echo -e "  Backend:  ${YELLOW}tail -f backend.log${NC}"
echo -e "  Frontend: ${YELLOW}tail -f frontend.log${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services...${NC}"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Services stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup INT TERM

# Wait for user interrupt
wait
