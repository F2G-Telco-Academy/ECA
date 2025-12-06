#!/bin/bash
# SCAT Single Device Capture - Working Version

echo "=== SCAT SINGLE DEVICE CAPTURE ==="

# Navigate to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$SCRIPT_DIR"

# Check device connection
DEVICES=($(adb devices | grep -E "device$" | awk '{print $1}'))
if [ ${#DEVICES[@]} -eq 0 ]; then
    echo "❌ No devices found. Please:"
    echo "   1. Connect device via USB"
    echo "   2. Enable USB debugging"
    echo "   3. Enable diagnostic mode (*#0808#)"
    exit 1
fi

DEVICE_ID="${DEVICES[0]}"
MODEL=$(adb -s "$DEVICE_ID" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
echo "✅ Device: $MODEL ($DEVICE_ID)"

# Get USB address
USB_ADDRESSES=($(lsusb | grep -E "05c6:(90b8|90db)" | awk '{print $2":"$4}' | sed 's/:$//' | head -1))
if [ ${#USB_ADDRESSES[@]} -eq 0 ]; then
    echo "❌ No devices in diagnostic mode found."
    exit 1
fi

USB_ADDR="${USB_ADDRESSES[0]}"
echo "✅ USB Address: $USB_ADDR"

# Setup capture file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PCAP_FILE="$PROJECT_ROOT/data/captures/single_${DEVICE_ID}_${TIMESTAMP}.pcap"
echo "💾 PCAP file: $PCAP_FILE"

# Start Wireshark
echo "🖥️  Starting Wireshark..."
wireshark -i lo -k -f "udp port 4729" &
WIRESHARK_PID=$!
sleep 1

# Start tcpdump (optional - for PCAP file saving)
echo "📊 Starting packet capture..."
tcpdump -i lo -w "$PCAP_FILE" udp port 4729 &
TCPDUMP_PID=$!
sleep 0.5

echo ""
echo "🚀 Starting SCAT capture..."
echo "📱 Perform cellular activities on your device!"
echo "🛑 Close Wireshark to stop capture"
echo ""

# Setup cleanup
trap 'echo "\n🛑 Stopping..."; [ -n "$TCPDUMP_PID" ] && kill $TCPDUMP_PID 2>/dev/null; [ -n "$SCAT_PID" ] && kill $SCAT_PID 2>/dev/null; exit' INT

# Main SCAT capture loop with Wireshark monitoring
# FIX: Use Python module directly since scat command is broken
cd "$PROJECT_ROOT/backend"
export PYTHONPATH="$PROJECT_ROOT/backend/src:$PYTHONPATH"

while kill -0 $WIRESHARK_PID 2>/dev/null; do
    echo 'Starting SCAT capture session...'
    # Run SCAT using Python module directly
    python3 -m scat.main -t qc -u -a $USB_ADDR -i 0 -H 127.0.0.1 -P 4729 -D -L ip,mac,rlc,pdcp,rrc,nas &
    SCAT_PID=$!
    
    # Wait for either SCAT to finish or Wireshark to close
    while kill -0 $SCAT_PID 2>/dev/null && kill -0 $WIRESHARK_PID 2>/dev/null; do
        sleep 1
    done
    
    # If Wireshark closed, stop SCAT and exit
    if ! kill -0 $WIRESHARK_PID 2>/dev/null; then
        echo "🛑 Wireshark closed - stopping capture..."
        [ -n "$SCAT_PID" ] && kill $SCAT_PID 2>/dev/null
        break
    fi
    
    echo 'Session ended, restarting in 2 seconds...'
    sleep 2
done

echo "🛑 Stopping capture processes..."
[ -n "$TCPDUMP_PID" ] && kill $TCPDUMP_PID 2>/dev/null
