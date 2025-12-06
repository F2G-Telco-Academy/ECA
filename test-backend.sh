#!/bin/bash

echo "🧪 Testing Extended Cellular Analyzer Backend"
echo "=============================================="

BASE_URL="http://localhost:8080"

echo ""
echo "1. Health Check..."
curl -s $BASE_URL/actuator/health | jq -r '.status // "FAILED"'

echo ""
echo "2. List Sessions..."
curl -s $BASE_URL/api/sessions | jq 'length // 0' | xargs echo "Sessions count:"

echo ""
echo "3. Start Test Session..."
SESSION_ID=$(curl -s -X POST "$BASE_URL/api/sessions/start?deviceId=TEST123" | jq -r '.id // "FAILED"')
echo "Created session: $SESSION_ID"

if [ "$SESSION_ID" != "FAILED" ] && [ "$SESSION_ID" != "null" ]; then
    echo ""
    echo "4. Get Session Details..."
    curl -s $BASE_URL/api/sessions/$SESSION_ID | jq '{id, deviceId, status}'
    
    echo ""
    echo "5. Get Session KPIs..."
    curl -s $BASE_URL/api/kpis/session/$SESSION_ID | jq 'length' | xargs echo "KPIs count:"
    
    echo ""
    echo "6. Get KPIs by RAT (LTE)..."
    curl -s $BASE_URL/api/kpis/session/$SESSION_ID/rat/LTE | jq 'length' | xargs echo "LTE KPIs:"
    
    echo ""
    echo "7. Get KPIs by Category (ACCESSIBILITY)..."
    curl -s $BASE_URL/api/kpis/session/$SESSION_ID/category/ACCESSIBILITY | jq 'length' | xargs echo "Accessibility KPIs:"
fi

echo ""
echo "✅ Backend tests complete!"
