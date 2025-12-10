#!/usr/bin/env python3
"""
ADB Real-time Metrics Service
Extracts cellular and GPS data from Android devices via ADB
Matches reference backend-scat-old-codebase/src/exporters/adb_exporter.py
"""

import subprocess
import time
import re
import json

class RealtimeAdbMetrics:
    """Extract real-time metrics from ADB - compatible with Windows"""

    def __init__(self):
        self.rsrp = 0
        self.rsrq = 0
        self.rssi = 0
        self.sinr = None
        self.cqi = 0
        self.mcc = 0
        self.mnc = 0
        self.pci = 0
        self.tac = 0
        self.ci = 0
        self.earfcn = 0
        self.operator = "unknown"
        self.network_mode = "unknown"
        self.latitude = 0.0
        self.longitude = 0.0
        self.altitude = 0.0

    def update_all(self, device_id=None):
        """Update all metrics from device"""
        self._update_cellular_info(device_id)
        self._update_signal_strength(device_id)
        self._update_gps(device_id)

    def _run_adb(self, cmd, device_id=None):
        """Run ADB command with device selection"""
        full_cmd = ['adb']
        if device_id:
            full_cmd.extend(['-s', device_id])
        full_cmd.extend(cmd)

        try:
            result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=10)
            return result.stdout if result.returncode == 0 else ""
        except Exception as e:
            print(f"ADB command failed: {e}")
            return ""

    def _update_cellular_info(self, device_id=None):
        """Extract cellular info from telephony.registry"""
        output = self._run_adb(['shell', 'dumpsys', 'telephony.registry'], device_id)
        if not output:
            return

        # Network mode detection
        if 'CellSignalStrengthLte' in output or 'rsrp=' in output:
            self.network_mode = "LTE"
        elif 'CellSignalStrengthWcdma' in output or 'rscp=' in output:
            self.network_mode = "WCDMA"
        elif 'CellSignalStrengthGsm' in output:
            self.network_mode = "GSM"

        # MCC/MNC
        if m := re.search(r'mMcc=(\d+)', output):
            self.mcc = int(m.group(1))
        if m := re.search(r'mMnc=(\d+)', output):
            self.mnc = int(m.group(1))

        # LTE metrics
        if m := re.search(r'mPci=(\d+)', output):
            if 0 < (pci := int(m.group(1))) < 504:
                self.pci = pci
        if m := re.search(r'mTac=(\d+)', output):
            if (tac := int(m.group(1))) != 2147483647:
                self.tac = tac
        if m := re.search(r'mCi=(\d+)', output):
            if (ci := int(m.group(1))) != 2147483647:
                self.ci = ci
        if m := re.search(r'mEarfcn=(\d+)', output):
            self.earfcn = int(m.group(1))

        # Operator
        if m := re.search(r'mAlphaLong=([^}]+)', output):
            self.operator = m.group(1).strip()

    def _update_signal_strength(self, device_id=None):
        """Extract signal strength"""
        output = self._run_adb(['shell', 'dumpsys', 'telephony.registry'], device_id)
        if not output:
            return

        # LTE signal
        if m := re.search(r'rsrp=(-?\d+)', output):
            self.rsrp = int(m.group(1))
        if m := re.search(r'rsrq=(-?\d+)', output):
            self.rsrq = int(m.group(1))
        if m := re.search(r'rssi=(-?\d+)', output):
            self.rssi = int(m.group(1))
        if m := re.search(r'(?:sinr|snr)=(-?\d+)', output):
            self.sinr = int(m.group(1))

        # WCDMA fallback
        if self.rsrp == 0:
            if m := re.search(r'rscp=(-?\d+)', output):
                self.rsrp = int(m.group(1))
            if m := re.search(r'ecno=(-?\d+)', output):
                self.rsrq = int(m.group(1))

    def _update_gps(self, device_id=None):
        """Extract GPS location"""
        output = self._run_adb(['shell', 'dumpsys', 'location'], device_id)
        if not output:
            return

        # Try GPS provider first
        if m := re.search(r'Location\[gps\s+([+-]?\d+\.\d+),([+-]?\d+\.\d+).*?alt=([\d.]+)', output):
            self.latitude = float(m.group(1))
            self.longitude = float(m.group(2))
            self.altitude = float(m.group(3))
        # Fallback to fused
        elif m := re.search(r'Location\[fused\s+([+-]?\d+\.\d+),([+-]?\d+\.\d+)', output):
            self.latitude = float(m.group(1))
            self.longitude = float(m.group(2))

    def to_dict(self):
        """Export as dictionary for JSON"""
        return {
            'rsrp': self.rsrp,
            'rsrq': self.rsrq,
            'rssi': self.rssi,
            'sinr': self.sinr,
            'cqi': self.cqi,
            'mcc': self.mcc,
            'mnc': self.mnc,
            'pci': self.pci,
            'tac': self.tac,
            'ci': self.ci,
            'earfcn': self.earfcn,
            'operator': self.operator,
            'network_mode': self.network_mode,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'altitude': self.altitude,
            'timestamp': int(time.time())
        }

if __name__ == '__main__':
    metrics = RealtimeAdbMetrics()
    metrics.update_all()
    print(json.dumps(metrics.to_dict(), indent=2))

