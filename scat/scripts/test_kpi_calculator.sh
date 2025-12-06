#!/bin/bash
# Test KPI Calculator

echo "=== Testing KPI Calculator ==="
echo ""

# Check if script exists
if [ ! -f "kpi_calculator.py" ]; then
    echo "❌ kpi_calculator.py not found"
    exit 1
fi
echo "✓ Script found"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not installed"
    exit 1
fi
echo "✓ Python 3 installed"

# Start calculator in background
echo ""
echo "Starting KPI Calculator..."
python3 kpi_calculator.py &
KPI_PID=$!
sleep 3

# Test metrics endpoint
echo ""
echo "Testing metrics endpoint..."
if curl -s http://localhost:9093/metrics > /dev/null; then
    echo "✓ Metrics endpoint responding"
    echo ""
    echo "Sample metrics:"
    curl -s http://localhost:9093/metrics | grep "scat_" | head -10
else
    echo "❌ Metrics endpoint not responding"
    kill $KPI_PID 2>/dev/null
    exit 1
fi

# Cleanup
echo ""
echo "Stopping KPI Calculator..."
kill $KPI_PID 2>/dev/null
sleep 1

echo ""
echo "✓ All tests passed!"
echo ""
echo "To start for real:"
echo "  python3 kpi_calculator.py"
