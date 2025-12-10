#!/usr/bin/env python3
"""
ECA Live Capture - Auto-detects COM port or uses USB
"""

import subprocess
import os
import sys
import serial.tools.list_ports
from datetime import datetime

def detect_diagnostic_ports():
    """Detect Qualcomm diagnostic COM ports (VID:PID 05C6:90B8 or 05C6:90DB)"""
    return [p.device for p in serial.tools.list_ports.comports() 
            if p.vid == 0x05C6 and p.pid in [0x90B8, 0x90DB]]

def start_capture(output_dir='./data/sessions'):
    """Start SCAT capture"""
    
    # Detect COM ports
    com_ports = detect_diagnostic_ports()
    com_port = com_ports[0] if com_ports else None
    
    if com_port:
        print(f"✓ Using COM port: {com_port}")
    else:
        print("✓ Using USB mode")
    
    # Setup session
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_dir = os.path.join(output_dir, f"capture_{timestamp}")
    os.makedirs(session_dir, exist_ok=True)
    pcap_file = os.path.join(session_dir, "capture.pcap")
    
    # Set PYTHONPATH
    env = os.environ.copy()
    scat_src = os.path.join(os.path.dirname(__file__), 'src')
    if os.path.exists(scat_src):
        env['PYTHONPATH'] = scat_src + os.pathsep + env.get('PYTHONPATH', '')
    
    # Build command
    if com_port:
        cmd = [sys.executable, '-m', 'scat.main', '-t', 'qc', '-s', com_port, '-b', '115200', '--pcap-file', pcap_file]
    else:
        cmd = [sys.executable, '-m', 'scat.main', '-t', 'qc', '-u', '--pcap-file', pcap_file]
    
    print(f"Output: {pcap_file}")
    print("Press Ctrl+C to stop...\n")
    
    try:
        process = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        for line in iter(process.stdout.readline, ''):
            if line:
                print(line.strip())
            if process.poll() is not None:
                break
    except KeyboardInterrupt:
        print(f"\n✓ Saved: {pcap_file}")

if __name__ == '__main__':
    start_capture()
