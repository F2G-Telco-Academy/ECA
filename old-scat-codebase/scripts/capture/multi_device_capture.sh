#!/bin/bash
# Flexible Multi-Device SCAT Capture - Supports ANY number of devices

echo "=== FLEXIBLE MULTI-DEVICE CAPTURE ==="

# Navigate to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$SCRIPT_DIR"

# Auto-detect all connected devices
DEVICES=($(adb devices | grep -E "device$" | awk '{print $1}'))
DEVICE_COUNT=${#DEVICES[@]}

if [ $DEVICE_COUNT -eq 0 ]; then
    echo "❌ No devices found"
    exit 1
fi

echo "📱 Found $DEVICE_COUNT device(s):"
for i in "${!DEVICES[@]}"; do
    echo "   Device $((i+1)): ${DEVICES[$i]}"
done

# Auto-detect USB addresses
USB_ADDRESSES=($(lsusb | grep "05c6:90b8" | awk '{print $2":"$4}' | sed 's/:$//' | head -$DEVICE_COUNT))

if [ ${#USB_ADDRESSES[@]} -ne $DEVICE_COUNT ]; then
    echo "❌ USB address mismatch. Ensure all devices are in diagnostic mode."
    exit 1
fi

# Setup variables
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BASE_PORT=4729
WIRESHARK_PIDS=()
TCPDUMP_PIDS=()
SCAT_PIDS=()
PCAP_FILES=()

# Start Wireshark for each device
for i in "${!DEVICES[@]}"; do
    PORT=$((BASE_PORT + i))
    DEVICE_ID="${DEVICES[$i]}"
    PCAP_FILE="$PROJECT_ROOT/data/captures/device$((i+1))_${DEVICE_ID}_${TIMESTAMP}.pcap"
    PCAP_FILES+=("$PCAP_FILE")
    
    echo "🖥️  Starting Wireshark for Device $((i+1)) (Port $PORT)..."
    sudo wireshark -i lo -k -f "udp port $PORT" &
    WIRESHARK_PIDS+=($!)
    sleep 1
done

# Start tcpdump for each device
echo "📊 Starting packet capture for all devices..."
for i in "${!DEVICES[@]}"; do
    PORT=$((BASE_PORT + i))
    PCAP_FILE="${PCAP_FILES[$i]}"
    
    sudo tcpdump -i lo -w "$PCAP_FILE" udp port $PORT &
    TCPDUMP_PIDS+=($!)
done

sleep 2

# Activate virtual environment
source venv/bin/activate

# Fix USB permissions for all devices
echo "🔧 Setting up USB permissions..."
for usb_addr in "${USB_ADDRESSES[@]}"; do
    sudo chmod 666 /dev/bus/usb/$usb_addr 2>/dev/null || true
done

echo ""
echo "🚀 Starting SCAT on all $DEVICE_COUNT devices..."
echo "📱 Perform activities on ALL devices!"
echo ""

# Start SCAT for each device
for i in "${!DEVICES[@]}"; do
    DEVICE_ID="${DEVICES[$i]}"
    USB_ADDR="${USB_ADDRESSES[$i]}"
    PORT=$((BASE_PORT + i))
    INTERFACE=$i  # Use different interface for each device
    
    (
        echo "Starting SCAT for Device $((i+1)) ($DEVICE_ID)..."
        while true; do
            scat -t qc -u -a $USB_ADDR -i $INTERFACE -H 127.0.0.1 -P $PORT -D -L ip,mac,rlc,pdcp,rrc,nas
            echo "Device $((i+1)) disconnected, retrying..."
            sleep 3
        done
    ) &
    SCAT_PIDS+=($!)
done

echo ""
echo "🚀 $DEVICE_COUNT-DEVICE CAPTURE RUNNING"
echo "📱 Perform cellular activities on ALL devices"
echo "🛑 Press Ctrl+C to stop"
echo ""

# Setup cleanup
cleanup() {
    echo -e "\n🛑 Stopping all processes..."
    for pid in "${SCAT_PIDS[@]}"; do
        kill $pid 2>/dev/null
    done
    for pid in "${TCPDUMP_PIDS[@]}"; do
        sudo kill $pid 2>/dev/null
    done
    exit
}
trap cleanup INT TERM

# Monitor and show progress
while true; do
    sleep 10
    echo "📊 Capture progress ($(date)):"
    for i in "${!PCAP_FILES[@]}"; do
        PCAP_FILE="${PCAP_FILES[$i]}"
        if [ -f "$PCAP_FILE" ]; then
            SIZE=$(du -h "$PCAP_FILE" 2>/dev/null | cut -f1 || echo "0")
            echo "   Device $((i+1)): $SIZE"
        fi
    done
done