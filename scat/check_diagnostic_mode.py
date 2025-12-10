#!/usr/bin/env python3
"""Check if device is in diagnostic mode"""
import sys
try:
    import usb.core
    devices = usb.core.find(find_all=True, idVendor=0x05C6)
    for dev in devices:
        if dev.idProduct in [0x90B8, 0x90DB]:
            print(f"USB Address: {dev.bus}:{dev.address}")
            sys.exit(0)
    print("Reason: No Qualcomm DM port detected")
    sys.exit(1)
except:
    print("Reason: pyusb not installed")
    sys.exit(1)
