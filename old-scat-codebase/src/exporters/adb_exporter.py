#!/usr/bin/env python3

import subprocess
import time
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

class DeviceMetrics:
    def __init__(self):
        self.rsrp = 0
        self.rsrq = 0
        self.rssi = 0
        self.sinr = None
        self.connected = 0
        self.latitude = 0.0
        self.longitude = 0.0
        self.timing_advance = 0
        self.cqi = 0
        self.mcc = 0
        self.mnc = 0
        self.pci = 0
        self.earfcn = 0
        self.operator = "unknown"
        self.network_mode = "unknown"
        self.cell_id_label = "PCI"
        self.frequency_label = "EARFCN"
        self.last_update = int(time.time())
        
        # GSM/WCDMA-specific metrics
        self.lac = 0  # Location Area Code
        self.rac = 0  # Routing Area Code
        self.bcch = 0  # Broadcast Control Channel
        self.ber = 0  # Bit Error Rate
        self.bsic = 0  # Base Station Identity Code
        self.cid = 0  # Cell ID (full CID for WCDMA/GSM)
        self.drx = 0  # Discontinuous Reception cycle
        self.band = 0  # Frequency band
        self.arfcn = 0  # GSM frequency
        self.uarfcn = 0  # WCDMA frequency
        
        # LTE-specific metrics
        self.tac = 0  # Tracking Area Code
        self.ci = 0  # Cell Identity (LTE)
        self.bandwidth = 0  # Primary carrier bandwidth (kHz)
        self.secondary_bandwidths = []  # Secondary carrier bandwidths (kHz)
        
        # Network performance metrics
        self.rx_bytes = 0
        self.tx_bytes = 0
        self.rx_packets = 0
        self.tx_packets = 0
        self.rx_throughput = 0  # bytes/sec
        self.tx_throughput = 0  # bytes/sec
        self.latency = 0  # ms
        self.last_rx_bytes = 0
        self.last_tx_bytes = 0
        self.last_measurement_time = time.time()
        
    def update_cellular_info(self):
        try:
            result = subprocess.run(['adb', 'shell', 'dumpsys telephony.registry'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                # Parse MCC/MNC (always available)
                mcc_match = re.search(r'mMcc=(\d+)', result.stdout)
                if mcc_match:
                    self.mcc = int(mcc_match.group(1))
                
                mnc_match = re.search(r'mMnc=(\d+)', result.stdout)
                if mnc_match:
                    self.mnc = int(mnc_match.group(1))
                
                # Dynamic cell info parsing - try all network types
                # Reset values first
                self.pci = 0
                self.earfcn = 0
                self.network_mode = "unknown"
                
                # Detect network mode from signal strength data
                if 'CellSignalStrengthLte' in result.stdout or 'rsrp=' in result.stdout:
                    self.network_mode = "LTE"
                    self.cell_id_label = "PCI"
                    self.frequency_label = "EARFCN"
                    
                    # Parse LTE-specific metrics
                    tac_match = re.search(r'mTac=(\d+)', result.stdout)
                    if tac_match:
                        tac_val = int(tac_match.group(1))
                        if tac_val != 2147483647:  # Valid TAC
                            self.tac = tac_val
                    
                    ci_match = re.search(r'mCi=(\d+)', result.stdout)
                    if ci_match:
                        ci_val = int(ci_match.group(1))
                        if ci_val != 2147483647:  # Valid CI
                            self.ci = ci_val
                    
                    band_match = re.search(r'mBands=\[(\d+)\]', result.stdout)
                    if band_match:
                        self.band = int(band_match.group(1))
                    
                elif 'CellSignalStrengthWcdma' in result.stdout or 'rscp=' in result.stdout:
                    self.network_mode = "WCDMA"
                    self.cell_id_label = "PSC"
                    self.frequency_label = "UARFCN"
                    
                # Parse mPhysicalChannelConfigs for bandwidth (all modes)
                self.bandwidth = 0
                self.secondary_bandwidths = []
                
                phy_configs = re.findall(r'mConnectionStatus=(PrimaryServing|SecondaryServing),mCellBandwidthDownlinkKhz=(\d+)', result.stdout)
                for status, bw in phy_configs:
                    bw_val = int(bw)
                    if status == 'PrimaryServing':
                        self.bandwidth = bw_val
                    else:
                        self.secondary_bandwidths.append(bw_val)
                
                # Parse WCDMA-specific metrics
                if self.network_mode == "WCDMA":
                    lac_match = re.search(r'mLac=(\d+)', result.stdout)
                    if lac_match:
                        self.lac = int(lac_match.group(1))
                    
                    cid_match = re.search(r'mCid=(\d+)', result.stdout)
                    if cid_match:
                        self.cid = int(cid_match.group(1))
                
                # Detect GSM mode
                if 'CellSignalStrengthGsm' in result.stdout:
                    self.network_mode = "GSM"
                    self.cell_id_label = "CID"
                    self.frequency_label = "ARFCN"
                    
                    # Parse GSM-specific metrics
                    lac_match = re.search(r'mLac=(\d+)', result.stdout)
                    if lac_match:
                        self.lac = int(lac_match.group(1))
                    
                    cid_match = re.search(r'mCid=(\d+)', result.stdout)
                    if cid_match:
                        self.cid = int(cid_match.group(1))
                    
                    bsic_match = re.search(r'mBsic=0x([0-9a-fA-F]+)', result.stdout)
                    if bsic_match:
                        self.bsic = int(bsic_match.group(1), 16)
                    
                    ber_match = re.search(r'ber=(\d+)', result.stdout)
                    if ber_match:
                        ber_val = int(ber_match.group(1))
                        if ber_val != 99:  # 99 means unknown
                            self.ber = ber_val
                
                # Try LTE first (mPci, mEarfcn)
                pci_match = re.search(r'mPci=(\d+)', result.stdout)
                if pci_match:
                    pci_val = int(pci_match.group(1))
                    if pci_val > 0 and pci_val < 504:  # Valid LTE PCI range
                        self.pci = pci_val
                
                earfcn_match = re.search(r'mEarfcn=(\d+)', result.stdout)
                if earfcn_match:
                    earfcn_val = int(earfcn_match.group(1))
                    if earfcn_val > 0 and earfcn_val < 2147483647:  # Valid EARFCN
                        self.earfcn = earfcn_val
                
                # If no valid LTE, try WCDMA (mPsc, mUarfcn)
                if self.pci == 0:
                    psc_match = re.search(r'mPsc=(\d+)', result.stdout)
                    if psc_match:
                        psc_val = int(psc_match.group(1))
                        if psc_val > 0:
                            self.pci = psc_val  # Use PSC as PCI for WCDMA
                
                if self.earfcn == 0:
                    uarfcn_match = re.search(r'mUarfcn=(\d+)', result.stdout)
                    if uarfcn_match:
                        uarfcn_val = int(uarfcn_match.group(1))
                        if uarfcn_val > 0 and uarfcn_val < 2147483647:
                            self.uarfcn = uarfcn_val
                
                # Try GSM ARFCN
                arfcn_match = re.search(r'mArfcn=(\d+)', result.stdout)
                if arfcn_match:
                    arfcn_val = int(arfcn_match.group(1))
                    if arfcn_val > 0 and arfcn_val < 2147483647:
                        self.arfcn = arfcn_val
                
                # If still no valid values, try GSM (mCid, mArfcn)
                if self.pci == 0:
                    cid_match = re.search(r'mCid=(\d+)', result.stdout)
                    if cid_match:
                        cid_val = int(cid_match.group(1))
                        if cid_val > 0:
                            self.pci = cid_val % 1000  # Use last 3 digits of CID for GSM
                
                if self.earfcn == 0:
                    arfcn_match = re.search(r'mArfcn=(\d+)', result.stdout)
                    if arfcn_match:
                        arfcn_val = int(arfcn_match.group(1))
                        if arfcn_val > 0:
                            self.earfcn = arfcn_val  # Use ARFCN for GSM
                operator_match = re.search(r'mAlphaLong=([^}]+)', result.stdout)
                if operator_match:
                    self.operator = operator_match.group(1).strip()
                
                return True
        except Exception as e:
            print(f"Cellular error: {e}")
        return False

    def update_signal_strength(self):
        try:
            result = subprocess.run(['adb', 'shell', 'dumpsys telephony.registry'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                # Reset signal values
                self.rsrp = 0
                self.rsrq = 0
                self.rssi = 0
                self.sinr = None
                
                # Try LTE signal strength first - check for CellSignalStrengthLte format
                lte_match = re.search(r'CellSignalStrengthLte:\s*rsrp=(-?\d+)\s*rsrq=(-?\d+)\s*rssi=(-?\d+)\s*snr=(-?\d+)', result.stdout)
                if lte_match:
                    self.rsrp = int(lte_match.group(1))
                    self.rsrq = int(lte_match.group(2))
                    self.rssi = int(lte_match.group(3))
                    self.sinr = int(lte_match.group(4))
                else:
                    # Try individual LTE signal parameters
                    rsrp_match = re.search(r'rsrp=(-?\d+)', result.stdout)
                    if rsrp_match:
                        self.rsrp = int(rsrp_match.group(1))
                    
                    rsrq_match = re.search(r'rsrq=(-?\d+)', result.stdout)
                    if rsrq_match:
                        self.rsrq = int(rsrq_match.group(1))
                    
                    rssi_match = re.search(r'rssi=(-?\d+)', result.stdout)
                    if rssi_match:
                        self.rssi = int(rssi_match.group(1))
                    
                    # Try both 'sinr=' and 'snr=' patterns for SINR
                    sinr_match = re.search(r'(?:sinr|snr)=(-?\d+)', result.stdout)
                    if sinr_match:
                        self.sinr = int(sinr_match.group(1))
                    else:
                        self.sinr = None  # SINR not available
                
                # If no LTE signals, try WCDMA format: CellSignalStrengthWcdma: ss=-71 ber=99 rscp=-24 ecno=0
                if self.rsrp == 0:
                    wcdma_match = re.search(r'CellSignalStrengthWcdma:\s*ss=(-?\d+)\s*ber=\d+\s*rscp=(-?\d+)\s*ecno=(-?\d+)', result.stdout)
                    if wcdma_match:
                        self.rsrp = int(wcdma_match.group(2))  # Use RSCP directly
                        self.rsrq = int(wcdma_match.group(3))  # Use ECNO as RSRQ
                        self.rssi = int(wcdma_match.group(1))  # Use SS as RSSI
                
                # If still no signals, try GSM
                if self.rssi == 0:
                    ss_match = re.search(r'ss=(-?\d+)', result.stdout)
                    if ss_match:
                        self.rssi = int(ss_match.group(1))
                
                # For GSM, convert RSSI to RSRP equivalent if no RSRP
                if self.rsrp == 0 and self.rssi != 0:
                    self.rsrp = self.rssi - 110  # Rough conversion for GSM
                
                return True
        except Exception as e:
            print(f"Signal error: {e}")
        return False

    def update_gps(self):
        try:
            # Get location from location manager
            result = subprocess.run(['adb', 'shell', 'dumpsys location'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                # Look for GPS coordinates in location providers
                lines = result.stdout.split('\n')
                for line in lines:
                    # Look for GPS provider last location
                    if 'last location=Location[gps' in line:
                        coords_match = re.search(r'Location\[gps\s+([+-]?\d+\.\d+),([+-]?\d+\.\d+)', line)
                        if coords_match:
                            self.latitude = float(coords_match.group(1))
                            self.longitude = float(coords_match.group(2))
                            return True
                    
                    # Fallback to fused provider
                    elif 'last location=Location[fused' in line:
                        coords_match = re.search(r'Location\[fused\s+([+-]?\d+\.\d+),([+-]?\d+\.\d+)', line)
                        if coords_match:
                            self.latitude = float(coords_match.group(1))
                            self.longitude = float(coords_match.group(2))
                            return True
                    
                    # Fallback to network provider
                    elif 'last location=Location[network' in line:
                        coords_match = re.search(r'Location\[network\s+([+-]?\d+\.\d+),([+-]?\d+\.\d+)', line)
                        if coords_match:
                            self.latitude = float(coords_match.group(1))
                            self.longitude = float(coords_match.group(2))
                            return True
                            
            return True
        except Exception as e:
            print(f"GPS error: {e}")
        return False

    def update_network_performance(self):
        try:
            # Get network interface statistics
            result = subprocess.run(['adb', 'shell', 'cat /proc/net/dev'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                # Find active rmnet interface (cellular data)
                for line in result.stdout.split('\n'):
                    if 'rmnet_data0:' in line or 'rmnet_ipa0:' in line:
                        parts = line.split()
                        if len(parts) >= 10:
                            current_rx_bytes = int(parts[1])
                            current_tx_bytes = int(parts[9])
                            current_rx_packets = int(parts[2])
                            current_tx_packets = int(parts[10])
                            
                            # Calculate throughput
                            current_time = time.time()
                            time_diff = current_time - self.last_measurement_time
                            
                            if time_diff > 0 and self.last_rx_bytes > 0:
                                self.rx_throughput = (current_rx_bytes - self.last_rx_bytes) / time_diff
                                self.tx_throughput = (current_tx_bytes - self.last_tx_bytes) / time_diff
                            
                            # Update values
                            self.rx_bytes = current_rx_bytes
                            self.tx_bytes = current_tx_bytes
                            self.rx_packets = current_rx_packets
                            self.tx_packets = current_tx_packets
                            self.last_rx_bytes = current_rx_bytes
                            self.last_tx_bytes = current_tx_bytes
                            self.last_measurement_time = current_time
                            break
            
            # Test latency with ping (if network is available)
            try:
                ping_result = subprocess.run(['adb', 'shell', 'ping -c 1 -W 2 8.8.8.8'], 
                                           capture_output=True, text=True, timeout=5)
                if ping_result.returncode == 0:
                    latency_match = re.search(r'time=(\d+\.?\d*)', ping_result.stdout)
                    if latency_match:
                        self.latency = float(latency_match.group(1))
                else:
                    self.latency = 0  # Network unreachable
            except:
                self.latency = 0
                
            return True
        except Exception as e:
            print(f"Network performance error: {e}")
        return False
    
    def update_connection_status(self):
        try:
            result = subprocess.run(['adb', 'devices'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                # Check if there are actual devices (not just the header line)
                lines = result.stdout.strip().split('\n')
                device_lines = [line for line in lines if 'device' in line and 'List of devices attached' not in line]
                
                if device_lines:
                    self.connected = 1
                    return True
                else:
                    self.connected = 0
                    return False
        except Exception as e:
            print(f"Connection error: {e}")
        
        self.connected = 0
        return False

    def update_all(self):
        self.update_connection_status()
        if self.connected:
            self.update_cellular_info()
            self.update_signal_strength()
            self.update_network_performance()
            self.update_gps()
        self.last_update = int(time.time())

    def _get_network_mode_value(self):
        mode_map = {"unknown": 0, "GSM": 1, "WCDMA": 2, "LTE": 3}
        return mode_map.get(self.network_mode, 0)

    def get_metrics(self):
        # Dynamic metric names based on network mode
        cell_id_metric = f"device_{self.cell_id_label.lower()}"
        frequency_metric = f"device_{self.frequency_label.lower()}"
        
        # Dynamic signal metrics based on network mode
        if self.network_mode == "WCDMA":
            signal_strength_metric = "cellular_rscp"
            signal_quality_metric = "cellular_ecno"
            signal_strength_help = "# HELP cellular_rscp Device RSCP in dBm (WCDMA)"
            signal_quality_help = "# HELP cellular_ecno Device Ec/No in dB (WCDMA)"
        elif self.network_mode == "LTE":
            signal_strength_metric = "cellular_rsrp"
            signal_quality_metric = "cellular_rsrq"
            signal_strength_help = "# HELP cellular_rsrp Device RSRP in dBm (LTE)"
            signal_quality_help = "# HELP cellular_rsrq Device RSRQ in dB (LTE)"
        elif self.network_mode == "GSM":
            signal_strength_metric = "cellular_rssi"
            signal_quality_metric = "cellular_rxqual"
            signal_strength_help = "# HELP cellular_rssi Device RSSI in dBm (GSM)"
            signal_quality_help = "# HELP cellular_rxqual Device RxQual (GSM)"
        else:
            # Default to generic names
            signal_strength_metric = "device_signal_strength"
            signal_quality_metric = "device_signal_quality"
            signal_strength_help = "# HELP device_signal_strength Device Signal Strength"
            signal_quality_help = "# HELP device_signal_quality Device Signal Quality"
        
        return f"""{signal_strength_help}
# TYPE {signal_strength_metric} gauge
{signal_strength_metric} {self.rsrp}

{signal_quality_help}
# TYPE {signal_quality_metric} gauge
{signal_quality_metric} {self.rsrq}

# HELP cellular_rssi Device RSSI in dBm
# TYPE cellular_rssi gauge
cellular_rssi {self.rssi}

# HELP cellular_sinr Device SINR in dB
# TYPE cellular_sinr gauge
{f"cellular_sinr {self.sinr}" if self.sinr is not None else "# cellular_sinr not available"}

# HELP device_connected Device connection status
# TYPE device_connected gauge
device_connected {self.connected}

# HELP device_gps_latitude GPS Latitude
# TYPE device_gps_latitude gauge
device_gps_latitude {self.latitude:.8f}

# HELP device_gps_longitude GPS Longitude
# TYPE device_gps_longitude gauge
device_gps_longitude {self.longitude:.8f}

# HELP cellular_timing_advance Timing Advance
# TYPE cellular_timing_advance gauge
cellular_timing_advance {self.timing_advance}

# HELP cellular_cqi Channel Quality Indicator
# TYPE cellular_cqi gauge
cellular_cqi {self.cqi}

# HELP cellular_mcc Mobile Country Code
# TYPE cellular_mcc gauge
cellular_mcc {self.mcc}

# HELP cellular_mnc Mobile Network Code
# TYPE cellular_mnc gauge
cellular_mnc {self.mnc}

# HELP cellular_pci Physical Cell ID / PCI / PSC
# TYPE cellular_pci gauge
cellular_pci {self.pci}

# HELP cellular_earfcn EARFCN (LTE)
# TYPE cellular_earfcn gauge
cellular_earfcn {self.earfcn}

# HELP cellular_uarfcn UARFCN (WCDMA)
# TYPE cellular_uarfcn gauge
cellular_uarfcn {self.uarfcn}

# HELP cellular_arfcn ARFCN (GSM)
# TYPE cellular_arfcn gauge
cellular_arfcn {self.arfcn}

# HELP cellular_network_mode Current network mode (0=Unknown, 1=GSM, 2=WCDMA, 3=LTE)
# TYPE cellular_network_mode gauge
cellular_network_mode {self._get_network_mode_value()}

# HELP cellular_lac Location Area Code (GSM/WCDMA)
# TYPE cellular_lac gauge
cellular_lac {self.lac}

# HELP cellular_cid Cell ID (GSM/WCDMA)
# TYPE cellular_cid gauge
cellular_cid {self.cid}

# HELP cellular_ber Bit Error Rate (GSM)
# TYPE cellular_ber gauge
cellular_ber {self.ber}

# HELP cellular_bsic Base Station Identity Code (GSM)
# TYPE cellular_bsic gauge
cellular_bsic {self.bsic}

# HELP cellular_tac Tracking Area Code (LTE)
# TYPE cellular_tac gauge
cellular_tac {self.tac}

# HELP cellular_ci Cell Identity (LTE)
# TYPE cellular_ci gauge
cellular_ci {self.ci}

# HELP cellular_band Frequency Band
# TYPE cellular_band gauge
cellular_band {self.band}

# HELP cellular_bandwidth Primary Carrier Bandwidth (MHz)
# TYPE cellular_bandwidth gauge
cellular_bandwidth {self.bandwidth / 1000 if self.bandwidth > 0 else 0}

# HELP cellular_secondary_bandwidth Secondary Carrier Bandwidth (MHz)
# TYPE cellular_secondary_bandwidth gauge
cellular_secondary_bandwidth{{carrier="1"}} {self.secondary_bandwidths[0] / 1000 if len(self.secondary_bandwidths) > 0 else 0}
cellular_secondary_bandwidth{{carrier="2"}} {self.secondary_bandwidths[1] / 1000 if len(self.secondary_bandwidths) > 1 else 0}
cellular_secondary_bandwidth{{carrier="3"}} {self.secondary_bandwidths[2] / 1000 if len(self.secondary_bandwidths) > 2 else 0}
cellular_secondary_bandwidth{{carrier="4"}} {self.secondary_bandwidths[3] / 1000 if len(self.secondary_bandwidths) > 3 else 0}

# HELP cellular_rx_bytes Total received bytes
# TYPE cellular_rx_bytes counter
cellular_rx_bytes {self.rx_bytes}

# HELP cellular_tx_bytes Total transmitted bytes
# TYPE cellular_tx_bytes counter
cellular_tx_bytes {self.tx_bytes}

# HELP cellular_rx_packets Total received packets
# TYPE cellular_rx_packets counter
cellular_rx_packets {self.rx_packets}

# HELP cellular_tx_packets Total transmitted packets
# TYPE cellular_tx_packets counter
cellular_tx_packets {self.tx_packets}

# HELP cellular_tx_power Transmit Power (dBm)
# TYPE cellular_tx_power gauge
cellular_tx_power {getattr(self, 'tx_power', 0)}"""

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(device_metrics.get_metrics().encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress HTTP logs

def update_metrics():
    while True:
        device_metrics.update_all()
        time.sleep(2)

if __name__ == '__main__':
    device_metrics = DeviceMetrics()
    
    # Start metrics update thread
    update_thread = threading.Thread(target=update_metrics, daemon=True)
    update_thread.start()
    
    # Start HTTP server
    server = HTTPServer(('0.0.0.0', 9091), MetricsHandler)
    print("ADB Exporter running on port 9091")
    print("Metrics available at http://localhost:9091/metrics")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()
