#!/usr/bin/env python3
"""
Real-time KPI Monitor - Integrated from backend-scat-old-codebase
Monitors SCAT logs and calculates KPIs in real-time
Matches: backend-scat-old-codebase/src/exporters/kpi_parser.py
"""

import re
import json
import time
import os
from collections import defaultdict

class RealtimeKPIMonitor:
    """Monitor SCAT logs and calculate KPIs in real-time"""

    def __init__(self):
        # RRC Connection KPIs
        self.rrc_attempts = 0
        self.rrc_successes = 0

        # Call Setup KPIs
        self.call_attempts = 0
        self.call_successes = 0

        # Handover KPIs
        self.handover_attempts = 0
        self.handover_successes = 0

        # RACH KPIs
        self.rach_attempts = 0
        self.rach_successes = 0

        # Attach/TAU KPIs
        self.attach_attempts = 0
        self.attach_successes = 0
        self.tau_attempts = 0
        self.tau_successes = 0

        self.last_update = int(time.time())

    def parse_log_line(self, line: str):
        """Parse SCAT log line and extract KPI events"""
        try:
            # Try JSON format first
            if line.strip().startswith('{'):
                log_entry = json.loads(line)
                message = log_entry.get('message', '')
            else:
                message = line

            # RRC Connection KPIs
            if re.search(r'RRCConnectionRequest|rrcConnectionRequest', message, re.IGNORECASE):
                self.rrc_attempts += 1
            elif re.search(r'RRCConnectionSetupComplete|rrcConnectionSetupComplete', message, re.IGNORECASE):
                self.rrc_successes += 1

            # Call Setup KPIs (3G/2G)
            elif re.search(r'Setup.*CC|Call.*Setup', message, re.IGNORECASE):
                self.call_attempts += 1
            elif re.search(r'Connect_acknowledge|Call.*Connected', message, re.IGNORECASE):
                self.call_successes += 1

            # Handover KPIs
            elif re.search(r'RRCConnectionReconfiguration.*mobilityControlInfo|HandoverCommand', message, re.IGNORECASE):
                self.handover_attempts += 1
            elif re.search(r'RRCConnectionReconfigurationComplete.*handover|HandoverComplete', message, re.IGNORECASE):
                self.handover_successes += 1

            # RACH KPIs
            elif re.search(r'MAC.*RACH.*Attempt|RACH.*preamble.*transmission', message, re.IGNORECASE):
                self.rach_attempts += 1
            elif re.search(r'RACH.*result.*Success|Random.*Access.*Response', message, re.IGNORECASE):
                self.rach_successes += 1

            # Attach KPIs
            elif re.search(r'Attach.*Request|ATTACH.*REQUEST', message, re.IGNORECASE):
                self.attach_attempts += 1
            elif re.search(r'Attach.*Accept|ATTACH.*ACCEPT', message, re.IGNORECASE):
                self.attach_successes += 1

            # TAU KPIs
            elif re.search(r'TAU.*Request|TRACKING.*AREA.*UPDATE.*REQUEST', message, re.IGNORECASE):
                self.tau_attempts += 1
            elif re.search(r'TAU.*Accept|TRACKING.*AREA.*UPDATE.*ACCEPT', message, re.IGNORECASE):
                self.tau_successes += 1

            self.last_update = int(time.time())

        except Exception as e:
            pass  # Skip invalid lines

    def get_kpis(self) -> dict:
        """Calculate and return current KPIs"""
        return {
            'rrc_success_rate': (self.rrc_successes / max(self.rrc_attempts, 1)) * 100,
            'call_success_rate': (self.call_successes / max(self.call_attempts, 1)) * 100,
            'handover_success_rate': (self.handover_successes / max(self.handover_attempts, 1)) * 100,
            'rach_success_rate': (self.rach_successes / max(self.rach_attempts, 1)) * 100,
            'attach_success_rate': (self.attach_successes / max(self.attach_attempts, 1)) * 100,
            'tau_success_rate': (self.tau_successes / max(self.tau_attempts, 1)) * 100,
            'rrc_attempts': self.rrc_attempts,
            'rrc_successes': self.rrc_successes,
            'handover_attempts': self.handover_attempts,
            'handover_successes': self.handover_successes,
            'rach_attempts': self.rach_attempts,
            'rach_successes': self.rach_successes,
            'last_update': self.last_update
        }

    def monitor_file(self, log_file: str, callback=None):
        """Monitor log file and process new lines"""
        print(f"Monitoring: {log_file}")

        # Wait for file to exist
        while not os.path.exists(log_file):
            time.sleep(1)

        with open(log_file, 'r') as f:
            # Go to end of file
            f.seek(0, 2)

            while True:
                line = f.readline()
                if line:
                    self.parse_log_line(line.strip())
                    if callback:
                        callback(self.get_kpis())
                else:
                    time.sleep(0.1)

    def export_prometheus(self) -> str:
        """Export KPIs in Prometheus format"""
        kpis = self.get_kpis()

        return f"""# HELP kpi_rrc_success_rate RRC Connection Success Rate
# TYPE kpi_rrc_success_rate gauge
kpi_rrc_success_rate {kpis['rrc_success_rate']}

# HELP kpi_call_success_rate Call Setup Success Rate
# TYPE kpi_call_success_rate gauge
kpi_call_success_rate {kpis['call_success_rate']}

# HELP kpi_handover_success_rate Handover Success Rate
# TYPE kpi_handover_success_rate gauge
kpi_handover_success_rate {kpis['handover_success_rate']}

# HELP kpi_rach_success_rate RACH Success Rate
# TYPE kpi_rach_success_rate gauge
kpi_rach_success_rate {kpis['rach_success_rate']}

# HELP kpi_attach_success_rate Attach Success Rate
# TYPE kpi_attach_success_rate gauge
kpi_attach_success_rate {kpis['attach_success_rate']}

# HELP kpi_tau_success_rate TAU Success Rate
# TYPE kpi_tau_success_rate gauge
kpi_tau_success_rate {kpis['tau_success_rate']}

# HELP kpi_rrc_attempts Total RRC Attempts
# TYPE kpi_rrc_attempts counter
kpi_rrc_attempts {kpis['rrc_attempts']}

# HELP kpi_handover_attempts Total Handover Attempts
# TYPE kpi_handover_attempts counter
kpi_handover_attempts {kpis['handover_attempts']}
"""

if __name__ == '__main__':
    import sys
    import argparse

    parser = argparse.ArgumentParser(description='Real-time KPI Monitor for SCAT logs')
    parser.add_argument('log_file', nargs='?', help='Path to SCAT log file to monitor')
    parser.add_argument('--http-server', action='store_true',
                       help='Start HTTP server for Prometheus metrics (port 9092)')
    parser.add_argument('--port', type=int, default=9092,
                       help='HTTP server port (default: 9092)')

    args = parser.parse_args()

    monitor = RealtimeKPIMonitor()

    if args.http_server and args.log_file:
        # Mode 1: HTTP server + background log monitoring (like reference)
        print("Starting KPI monitor with HTTP server...")

        # Start log monitoring in background thread
        def monitor_thread():
            monitor.monitor_file(args.log_file)

        log_thread = threading.Thread(target=monitor_thread, daemon=True)
        log_thread.start()

        # Start HTTP server in main thread
        monitor.start_http_server(args.port)

    elif args.log_file:
        # Mode 2: Command-line monitoring with live updates
        log_file = args.log_file

        def print_kpis(kpis):
            print(f"\r[{time.strftime('%H:%M:%S')}] " +
                  f"RRC: {kpis['rrc_success_rate']:.1f}% " +
                  f"HO: {kpis['handover_success_rate']:.1f}% " +
                  f"RACH: {kpis['rach_success_rate']:.1f}%", end='')

        try:
            monitor.monitor_file(log_file, print_kpis)
        except KeyboardInterrupt:
            print("\n\nFinal KPIs:")
            print(json.dumps(monitor.get_kpis(), indent=2))
    else:
        parser.print_help()
        print("\nExamples:")
        print("  # Monitor log file with live display:")
        print("  python realtime_kpi_monitor.py logs/scat.log")
        print()
        print("  # Start HTTP server for Prometheus scraping:")
        print("  python realtime_kpi_monitor.py logs/scat.log --http-server")
        print("  python realtime_kpi_monitor.py logs/scat.log --http-server --port 9092")

