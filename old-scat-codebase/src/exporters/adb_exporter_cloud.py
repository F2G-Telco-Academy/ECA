#!/usr/bin/env python3
"""
Cloud-enabled ADB Exporter
Pushes metrics to Railway backend instead of local Prometheus
"""

import os
import time
import requests
from adb_exporter import DeviceMetrics

class CloudMetricsExporter:
    def __init__(self, railway_url: str, device_id: str):
        self.railway_url = railway_url.rstrip('/')
        self.device_id = device_id
        self.device_metrics = DeviceMetrics()
        
    def push_metrics(self):
        """Push current metrics to Railway backend"""
        try:
            # Get all metrics from device
            metrics_text = self.device_metrics.get_metrics()
            
            # Parse Prometheus format and send to Railway
            for line in metrics_text.split('\n'):
                if line.startswith('#') or not line.strip():
                    continue
                    
                # Parse metric line: metric_name{labels} value
                parts = line.split()
                if len(parts) < 2:
                    continue
                    
                metric_name = parts[0].split('{')[0]
                metric_value = float(parts[-1])
                
                # Extract labels if present
                labels = {}
                if '{' in parts[0]:
                    label_str = parts[0].split('{')[1].split('}')[0]
                    for label in label_str.split(','):
                        if '=' in label:
                            key, val = label.split('=', 1)
                            labels[key.strip()] = val.strip('"')
                
                # Send to Railway
                payload = {
                    'device_id': self.device_id,
                    'metric_name': metric_name,
                    'metric_value': metric_value,
                    'timestamp': int(time.time()),
                    'labels': labels
                }
                
                response = requests.post(
                    f'{self.railway_url}/metrics',
                    json=payload,
                    timeout=5
                )
                
                if response.status_code != 200:
                    print(f"Failed to push {metric_name}: {response.status_code}")
                    
        except Exception as e:
            print(f"Error pushing metrics: {e}")
    
    def run(self, interval: int = 5):
        """Continuously update and push metrics"""
        print(f"Cloud ADB Exporter started")
        print(f"Device ID: {self.device_id}")
        print(f"Railway URL: {self.railway_url}")
        print(f"Push interval: {interval}s")
        
        while True:
            try:
                # Update device metrics
                self.device_metrics.update_all()
                
                # Push to Railway
                self.push_metrics()
                
                print(f"Metrics pushed at {time.strftime('%H:%M:%S')}")
                
            except Exception as e:
                print(f"Error in metrics loop: {e}")
            
            time.sleep(interval)

if __name__ == '__main__':
    # Get configuration from environment or defaults
    railway_url = os.getenv(
        'RAILWAY_API_URL',
        'https://extended-cellular-analyzer-production.up.railway.app'
    )
    device_id = os.getenv('DEVICE_ID', 'default-device')
    interval = int(os.getenv('PUSH_INTERVAL', '5'))
    
    exporter = CloudMetricsExporter(railway_url, device_id)
    
    try:
        exporter.run(interval)
    except KeyboardInterrupt:
        print("\nShutting down...")
