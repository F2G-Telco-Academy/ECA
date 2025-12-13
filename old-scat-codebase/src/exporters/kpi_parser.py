#!/usr/bin/env python3

import re
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

class KPIMetrics:
    def __init__(self):
        # RRC Connection KPIs
        self.rrc_attempts = 0
        self.rrc_successes = 0
        self.rrc_success_rate = 0
        
        # Call Setup KPIs  
        self.call_attempts = 0
        self.call_successes = 0
        self.call_success_rate = 0
        
        # Handover KPIs
        self.handover_attempts = 0
        self.handover_successes = 0
        self.handover_success_rate = 0
        
        # RACH KPIs
        self.rach_attempts = 0
        self.rach_successes = 0
        self.rach_success_rate = 0
        
        self.last_update = int(time.time())

    def parse_scat_log_line(self, line):
        """Parse SCAT log line and extract KPI events"""
        try:
            log_entry = json.loads(line)
            message = log_entry.get('message', '')
            
            # RRC Connection KPIs (WCDMA/LTE)
            if 'RRCConnectionRequest' in message:
                self.rrc_attempts += 1
            elif 'RRCConnectionSetupComplete' in message:
                self.rrc_successes += 1
                
            # Call Setup KPIs (3G/2G)
            elif 'Setup' in message and 'CC' in message:
                self.call_attempts += 1
            elif 'Connect_acknowledge' in message:
                self.call_successes += 1
                
            # Handover KPIs
            elif 'RRCConnectionReconfiguration' in message and 'mobilityControlInfo' in message:
                self.handover_attempts += 1
            elif 'RRCConnectionReconfigurationComplete' in message:
                self.handover_successes += 1
                
            # RACH KPIs
            elif 'MAC RACH Attempt' in message:
                self.rach_attempts += 1
            elif 'RACH result = Success' in message:
                self.rach_successes += 1
                
            # Calculate success rates
            self.rrc_success_rate = (self.rrc_successes / max(self.rrc_attempts, 1)) * 100
            self.call_success_rate = (self.call_successes / max(self.call_attempts, 1)) * 100
            self.handover_success_rate = (self.handover_successes / max(self.handover_attempts, 1)) * 100
            self.rach_success_rate = (self.rach_successes / max(self.rach_attempts, 1)) * 100
            
            self.last_update = int(time.time())
            
        except Exception as e:
            pass  # Skip invalid JSON lines

    def get_metrics(self):
        return f"""# HELP kpi_rrc_success_rate RRC Connection Success Rate
# TYPE kpi_rrc_success_rate gauge
kpi_rrc_success_rate {self.rrc_success_rate}

# HELP kpi_call_success_rate Call Setup Success Rate
# TYPE kpi_call_success_rate gauge
kpi_call_success_rate {self.call_success_rate}

# HELP kpi_handover_success_rate Handover Success Rate
# TYPE kpi_handover_success_rate gauge
kpi_handover_success_rate {self.handover_success_rate}

# HELP kpi_rach_success_rate RACH Success Rate
# TYPE kpi_rach_success_rate gauge
kpi_rach_success_rate {self.rach_success_rate}

# HELP kpi_rrc_attempts Total RRC Attempts
# TYPE kpi_rrc_attempts counter
kpi_rrc_attempts {self.rrc_attempts}

# HELP kpi_call_attempts Total Call Attempts
# TYPE kpi_call_attempts counter
kpi_call_attempts {self.call_attempts}

# HELP kpi_handover_attempts Total Handover Attempts
# TYPE kpi_handover_attempts counter
kpi_handover_attempts {self.handover_attempts}

# HELP kpi_last_update_timestamp Last KPI update timestamp
# TYPE kpi_last_update_timestamp gauge
kpi_last_update_timestamp {self.last_update}
"""

class KPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(kpi_metrics.get_metrics().encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def monitor_scat_logs():
    """Monitor SCAT logs and parse KPIs"""
    log_file = '/home/boutchouang-nathan/Documents/SCAT/scat/logs/scat.log'
    
    try:
        with open(log_file, 'r') as f:
            # Go to end of file
            f.seek(0, 2)
            
            while True:
                line = f.readline()
                if line:
                    kpi_metrics.parse_scat_log_line(line.strip())
                else:
                    time.sleep(0.1)
    except Exception as e:
        print(f"Error monitoring logs: {e}")

if __name__ == '__main__':
    kpi_metrics = KPIMetrics()
    
    # Start log monitoring thread
    log_thread = threading.Thread(target=monitor_scat_logs, daemon=True)
    log_thread.start()
    
    # Start HTTP server
    server = HTTPServer(('0.0.0.0', 9092), KPIHandler)
    print("KPI Parser running on port 9092")
    print("KPI metrics available at http://localhost:9092/metrics")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()
