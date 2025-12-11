#!/usr/bin/env python3
"""Check if device is in diagnostic mode.

Two strategies:
1) pyusb on the raw USB interface (requires WinUSB/libusb driver).
2) Fallback: pyserial to detect COM ports with Qualcomm diag VID/PID (works with standard diag drivers).
"""

import sys

QUALCOMM_VID = 0x05C6
QUALCOMM_PID_LIST = [0x90B8, 0x90DB]


def check_pyusb():
    try:
        import usb.core  # type: ignore
    except Exception:
        return None, "pyusb not installed"

    try:
        devices = usb.core.find(find_all=True, idVendor=QUALCOMM_VID)
        for dev in devices:
            if dev.idProduct in QUALCOMM_PID_LIST:
                return f"{dev.bus}:{dev.address}", None
        return None, "No Qualcomm DM port detected via pyusb"
    except Exception as e:
        return None, f"pyusb error: {e}"


def check_pyserial():
    try:
        import serial.tools.list_ports  # type: ignore
    except Exception:
        return None, "pyserial not installed"

    try:
        ports = serial.tools.list_ports.comports()
        for p in ports:
            if p.vid == QUALCOMM_VID and p.pid in QUALCOMM_PID_LIST:
                # Use COM port name as address surrogate
                return p.device, None
        return None, "No Qualcomm DM port detected via COM ports"
    except Exception as e:
        return None, f"pyserial error: {e}"


def main():
    # Try pyusb first (preferred if WinUSB/libusb driver is installed)
    addr, err = check_pyusb()
    if addr:
        print(f"USB Address: {addr}")
        sys.exit(0)

    # Fallback to COM port detection
    addr, err2 = check_pyserial()
    if addr:
        print(f"USB Address: {addr}")
        sys.exit(0)

    # Report combined reasons
    reasons = "; ".join([r for r in [err, err2] if r])
    print(f"Reason: {reasons or 'No Qualcomm DM port detected'}")
    sys.exit(1)


if __name__ == "__main__":
    main()
