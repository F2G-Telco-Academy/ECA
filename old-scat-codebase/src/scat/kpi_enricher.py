#!/usr/bin/env python3
"""KPI Enricher - Maps raw metrics to telecom KPIs with thresholds and alerts"""

import pandas as pd
import time
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import json
import os

class KPIEnricher:
    """Enriches raw metrics with telecom KPI definitions and thresholds"""
    
    def __init__(self, kpi_csv_path="/app/config/telecom_kpis.csv", port=9093):
        self.port = port
        self.kpi_definitions = self.load_kpi_definitions(kpi_csv_path)
        self.prometheus_url = "http://prometheus:9090"
        self.enriched_metrics = {}
        
    def load_kpi_definitions(self, csv_path):
        """Load KPI definitions from CSV"""
        try:
            return pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"Warning: KPI definitions file not found at {csv_path}")
            return pd.DataFrame()
    
    def fetch_prometheus_metrics(self):
        """Fetch current metrics from Prometheus"""
        metrics = {}
        try:
            # Get all SCAT metrics
            response = requests.get(f"{self.prometheus_url}/api/v1/query", 
                                  params={"query": "scat_rrc_success_rate"})
            if response.status_code == 200:
                data = response.json()
                if data['data']['result']:
                    metrics['scat_rrc_success_rate'] = float(data['data']['result'][0]['value'][1])
            
            # Get ADB metrics
            for metric in ['device_rsrp', 'device_rsrq', 'device_sinr', 'device_cqi']:
                response = requests.get(f"{self.prometheus_url}/api/v1/query", 
                                      params={"query": metric})
                if response.status_code == 200:
                    data = response.json()
                    if data['data']['result']:
                        metrics[metric] = float(data['data']['result'][0]['value'][1])
        except:
            pass
        return metrics
    
    def enrich_metrics(self, raw_metrics):
        """Enrich metrics with KPI status and alerts"""
        enriched = {}
        
        for _, kpi in self.kpi_definitions.iterrows():
            metric_name = kpi['metric_name']
            if metric_name in raw_metrics:
                value = raw_metrics[metric_name]
                
                # Determine status based on thresholds
                if value >= kpi['threshold_good']:
                    status = "good"
                    status_code = 1
                elif value >= kpi['threshold_poor']:
                    status = "warning"
                    status_code = 0.5
                else:
                    status = "critical"
                    status_code = 0
                
                enriched[kpi['kpi_name']] = {
                    'value': value,
                    'unit': kpi['unit'],
                    'status': status,
                    'status_code': status_code,
                    'threshold_good': kpi['threshold_good'],
                    'threshold_poor': kpi['threshold_poor'],
                    'description': kpi['description']
                }
        
        return enriched
    
    def get_metrics(self):
        """Generate Prometheus metrics for enriched KPIs"""
        output = []
        
        # Fetch and enrich current metrics
        raw_metrics = self.fetch_prometheus_metrics()
        self.enriched_metrics = self.enrich_metrics(raw_metrics)
        
        for kpi_name, kpi_data in self.enriched_metrics.items():
            safe_name = kpi_name.lower().replace(' ', '_').replace('-', '_')
            
            # KPI value
            output.append(f'# HELP kpi_{safe_name}_value {kpi_data["description"]}')
            output.append(f'# TYPE kpi_{safe_name}_value gauge')
            output.append(f'kpi_{safe_name}_value {kpi_data["value"]}')
            
            # KPI status (0=critical, 0.5=warning, 1=good)
            output.append(f'# HELP kpi_{safe_name}_status KPI status (0=critical, 0.5=warning, 1=good)')
            output.append(f'# TYPE kpi_{safe_name}_status gauge')
            output.append(f'kpi_{safe_name}_status {kpi_data["status_code"]}')
        
        # Overall system health score
        if self.enriched_metrics:
            avg_status = sum(kpi['status_code'] for kpi in self.enriched_metrics.values()) / len(self.enriched_metrics)
            output.append(f'# HELP system_health_score Overall system health score (0-1)')
            output.append(f'# TYPE system_health_score gauge')
            output.append(f'system_health_score {avg_status:.2f}')
        
        return '\n'.join(output)
    
    def get_kpi_summary(self):
        """Get KPI summary as JSON"""
        return json.dumps(self.enriched_metrics, indent=2)
    
    def start_server(self):
        """Start KPI enricher server"""
        class KPIHandler(BaseHTTPRequestHandler):
            def __init__(self, enricher, *args, **kwargs):
                self.enricher = enricher
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                if self.path == '/metrics':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(self.enricher.get_metrics().encode())
                elif self.path == '/kpis':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(self.enricher.get_kpi_summary().encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            
            def log_message(self, format, *args):
                pass
        
        handler = lambda *args, **kwargs: KPIHandler(self, *args, **kwargs)
        server = HTTPServer(('0.0.0.0', self.port), handler)
        
        print(f"KPI Enricher running on port {self.port}")
        print("Endpoints: /metrics (Prometheus), /kpis (JSON)")
        server.serve_forever()

if __name__ == '__main__':
    enricher = KPIEnricher()
    enricher.start_server()
