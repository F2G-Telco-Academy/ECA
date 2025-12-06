#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import time
import os

class MetricsCollector:
    """Exposes SCAT metrics in Prometheus format"""
    
    def __init__(self, port=9096):  # Changed to 9096 to avoid any conflicts
        self.port = int(os.getenv('METRICS_PORT', port))
        self.metrics = {
            'packets_captured': 0,
            'packets_dropped': 0,
            'bytes_captured': 0,
            'connection_errors': 0,
            'devices_connected': 0,
            'rrc_success_rate': 0,
            'handover_success_rate': 0,
            'erab_success_rate': 0,
            'rach_success_rate': 0
        }
        self.start_time = time.time()
        
    def increment(self, metric, value=1):
        if metric in self.metrics:
            self.metrics[metric] += value
    
    def set(self, metric, value):
        if metric in self.metrics:
            self.metrics[metric] = value
    
    def get_metrics(self):
        uptime = time.time() - self.start_time
        output = []
        output.append(f'# HELP scat_packets_captured_total Total packets captured')
        output.append(f'# TYPE scat_packets_captured_total counter')
        output.append(f'scat_packets_captured_total {self.metrics["packets_captured"]}')
        
        output.append(f'# HELP scat_packets_dropped_total Total packets dropped')
        output.append(f'# TYPE scat_packets_dropped_total counter')
        output.append(f'scat_packets_dropped_total {self.metrics["packets_dropped"]}')
        
        output.append(f'# HELP scat_bytes_captured_total Total bytes captured')
        output.append(f'# TYPE scat_bytes_captured_total counter')
        output.append(f'scat_bytes_captured_total {self.metrics["bytes_captured"]}')
        
        output.append(f'# HELP scat_connection_errors_total Connection errors')
        output.append(f'# TYPE scat_connection_errors_total counter')
        output.append(f'scat_connection_errors_total {self.metrics["connection_errors"]}')
        
        output.append(f'# HELP scat_devices_connected Currently connected devices')
        output.append(f'# TYPE scat_devices_connected gauge')
        output.append(f'scat_devices_connected {self.metrics["devices_connected"]}')
        
        output.append(f'# HELP scat_uptime_seconds Uptime in seconds')
        output.append(f'# TYPE scat_uptime_seconds gauge')
        output.append(f'scat_uptime_seconds {uptime:.2f}')
        
        output.append(f'# HELP scat_rrc_success_rate RRC connection success rate')
        output.append(f'# TYPE scat_rrc_success_rate gauge')
        output.append(f'scat_rrc_success_rate {self.metrics["rrc_success_rate"]}')
        
        output.append(f'# HELP scat_handover_success_rate Handover success rate')
        output.append(f'# TYPE scat_handover_success_rate gauge')
        output.append(f'scat_handover_success_rate {self.metrics["handover_success_rate"]}')
        
        output.append(f'# HELP scat_erab_success_rate E-RAB establishment success rate')
        output.append(f'# TYPE scat_erab_success_rate gauge')
        output.append(f'scat_erab_success_rate {self.metrics["erab_success_rate"]}')
        
        output.append(f'# HELP scat_rach_success_rate RACH success rate')
        output.append(f'# TYPE scat_rach_success_rate gauge')
        output.append(f'scat_rach_success_rate {self.metrics["rach_success_rate"]}')
        
        return '\n'.join(output)
    
    def start_server(self):
        class MetricsHandler(BaseHTTPRequestHandler):
            def __init__(self, collector, *args, **kwargs):
                self.collector = collector
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                if self.path == '/metrics':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(self.collector.get_metrics().encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            
            def log_message(self, format, *args):
                pass
        
        handler = lambda *args, **kwargs: MetricsHandler(self, *args, **kwargs)
        server = HTTPServer(('0.0.0.0', self.port), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server
