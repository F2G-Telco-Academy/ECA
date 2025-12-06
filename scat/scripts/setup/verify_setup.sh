#!/bin/bash
# Setup Verification Script - Checks everything before capture

echo "=== EXTENDED CELLULAR ANALYZER - SETUP VERIFICATION ==="
echo ""

ISSUES=0

# Check 1: Operating System
echo "1. 🖥️  Operating System Check"
OS=$(uname -s)
echo "   OS: $OS"
if [[ "$OS" == "Linux" ]]; then
    echo "   ✅ Linux detected - Full support"
elif [[ "$OS" == "Darwin" ]]; then
    echo "   ✅ macOS detected - Full support"
else
    echo "   ⚠️  Windows/Other OS - Use WSL2 or Docker"
fi
echo ""

# Check 2: Required tools
echo "2. 🛠️  Required Tools Check"
TOOLS=("adb" "lsusb" "wireshark" "tcpdump")
for tool in "${TOOLS[@]}"; do
    if command -v $tool &> /dev/null; then
        echo "   ✅ $tool installed"
    else
        echo "   ❌ $tool missing - install with: sudo apt install $tool"
        ISSUES=$((ISSUES + 1))
    fi
done
echo ""

# Check 3: Python environment
echo "3. 🐍 Python Environment Check"
if [ -d "venv" ]; then
    echo "   ✅ Virtual environment exists"
    if [ -f "venv/bin/scat" ]; then
        echo "   ✅ SCAT installed in venv"
    else
        echo "   ❌ SCAT not found in venv"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo "   ❌ Virtual environment missing - run ./setup.sh"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Check 4: USB permissions
echo "4. 🔌 USB Permissions Check"
if groups | grep -q "dialout"; then
    echo "   ✅ User in dialout group"
else
    echo "   ⚠️  User not in dialout group - may need sudo for USB access"
fi
echo ""

# Check 5: Connected devices
echo "5. 📱 Connected Devices Check"
ADB_DEVICES=($(adb devices | grep -E "device$" | awk '{print $1}'))
ADB_COUNT=${#ADB_DEVICES[@]}

if [ $ADB_COUNT -eq 0 ]; then
    echo "   ❌ No ADB devices found"
    echo "      Please connect device and enable USB debugging"
    ISSUES=$((ISSUES + 1))
else
    echo "   ✅ Found $ADB_COUNT ADB device(s):"
    for device in "${ADB_DEVICES[@]}"; do
        MODEL=$(adb -s "$device" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
        echo "      - $MODEL ($device)"
    done
fi
echo ""

# Check 6: Diagnostic mode
echo "6. 🔧 Diagnostic Mode Check"
if command -v lsusb &> /dev/null; then
    USB_DIAG=($(lsusb | grep "05c6:90b8"))
    DIAG_COUNT=$(echo "$USB_DIAG" | wc -l)
    
    if [ -z "$USB_DIAG" ]; then
        echo "   ❌ No devices in diagnostic mode"
        echo "      Please enable diagnostic mode:"
        echo "      1. Dial *#0808# on Samsung device"
        echo "      2. Select 'RMNET + DM + MODEM + ADPL + ADB'"
        echo "      3. Reboot device"
        ISSUES=$((ISSUES + 1))
    else
        echo "   ✅ Found $DIAG_COUNT device(s) in diagnostic mode:"
        echo "$USB_DIAG" | while read line; do
            echo "      - $line"
        done
    fi
else
    echo "   ⚠️  lsusb not available (Windows/WSL)"
    echo "      Use PowerShell: check_usb_devices.ps1"
    echo "      Or WSL: ./wsl_setup.sh for USB access"
fi
echo ""

# Check 7: Capture directory
echo "7. 📁 Capture Directory Check"
if [ -d "captures" ]; then
    echo "   ✅ Captures directory exists"
else
    echo "   ⚠️  Creating captures directory..."
    mkdir -p captures
    echo "   ✅ Captures directory created"
fi
echo ""

# Summary
echo "=== VERIFICATION SUMMARY ==="
if [ $ISSUES -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED! Ready for capture."
    echo ""
    echo "🚀 Next steps:"
    echo "   ./smart_capture.sh      # Auto-detect and capture"
    echo "   ./single_device_capture.sh   # Single device"
    echo "   ./multi_device_capture.sh    # Multiple devices"
else
    echo "⚠️  Found $ISSUES issue(s) that need attention."
    echo "   Please fix the issues above before capturing."
fi
echo ""