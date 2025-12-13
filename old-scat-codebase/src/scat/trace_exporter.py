#!/usr/bin/env python3
"""Prometheus exporter for post-processed trace files"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import os
import glob
import json

class TraceExporter:
    """Exposes post-processed trace KPIs as Prometheus metrics"""
    
    def __init__(self, traces_dir='./post_processed', port=9092):
        self.traces_dir = traces_dir
        self.port = port
    
    def get_metrics(self):
        """Read all KPI files and generate Prometheus metrics"""
        output = []
        
        # Find all KPI files
        kpi_files = glob.glob(f"{self.traces_dir}/**/kpis.json", recursive=True)
        
        for kpi_file in kpi_files:
            try:
                with open(kpi_file, 'r') as f:
                    data = json.load(f)
                    source = os.path.basename(data.get('source_file', 'unknown'))
                    kpis = data.get('kpis', {})
                    
                    # Export each KPI
                    for kpi_name, kpi_value in kpis.items():
                        metric_name = f'trace_{kpi_name}'
                        output.append(f'{metric_name}{{source="{source}"}} {kpi_value}')
            except:
                pass
        
        return '\n'.join(output) if output else '# No trace data available\n'
    
    def start_server(self):
        """Start HTTP server for Prometheus scraping"""
        class MetricsHandler(BaseHTTPRequestHandler):
            def __init__(self, exporter, *args, **kwargs):
                self.exporter = exporter
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                if self.path == '/metrics':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(self.exporter.get_metrics().encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            
            def log_message(self, format, *args):
                pass
        
        handler = lambda *args, **kwargs: MetricsHandler(self, *args, **kwargs)
        server = HTTPServer(('0.0.0.0', self.port), handler)
        
        print(f"📊 Trace Exporter running on port {self.port}")
        print(f"📂 Watching directory: {self.traces_dir}")
        server.serve_forever()

if __name__ == '__main__':
    exporter = TraceExporter()
    exporter.start_server()
