#!/usr/bin/env python3
"""Post-processing script for offline traces (QMDL2, SDM, LOGE, PCAP)"""

import os
import sys
import json
import subprocess
import pandas as pd
from datetime import datetime
import argparse

class OfflineTraceProcessor:
    """Process offline trace files and extract KPIs"""
    
    def __init__(self, output_dir="/app/post_processed"):
        self.output_dir = output_dir
        self.supported_formats = ['.qmdl', '.qmdl2', '.sdm', '.loge', '.pcap', '.pcapng']
        
    def detect_file_type(self, filepath):
        """Detect trace file type"""
        ext = os.path.splitext(filepath)[1].lower()
        if ext in ['.qmdl', '.qmdl2']:
            return 'qualcomm'
        elif ext == '.sdm':
            return 'samsung'
        elif ext == '.loge':
            return 'generic_log'
        elif ext in ['.pcap', '.pcapng']:
            return 'pcap'
        else:
            return 'unknown'
    
    def process_qualcomm_trace(self, filepath):
        """Process Qualcomm QMDL/QMDL2 files"""
        print(f"Processing Qualcomm trace: {filepath}")
        
        # Simulate KPI extraction (replace with actual QMDL parser)
        kpis = {
            'timestamp': datetime.now().isoformat(),
            'file_type': 'qualcomm',
            'source_file': filepath,
            'kpis': {
                'rrc_success_rate': 94.5,
                'handover_success_rate': 89.2,
                'erab_success_rate': 96.8,
                'avg_rsrp': -85,
                'avg_rsrq': -12,
                'avg_sinr': 15,
                'call_drop_rate': 1.2,
                'packet_loss_rate': 0.8
            }
        }
        
        return kpis
    
    def process_samsung_trace(self, filepath):
        """Process Samsung SDM files"""
        print(f"Processing Samsung trace: {filepath}")
        
        # Simulate KPI extraction (replace with actual SDM parser)
        kpis = {
            'timestamp': datetime.now().isoformat(),
            'file_type': 'samsung',
            'source_file': filepath,
            'kpis': {
                'rrc_success_rate': 93.8,
                'handover_success_rate': 91.5,
                'erab_success_rate': 97.2,
                'avg_rsrp': -88,
                'avg_rsrq': -11,
                'avg_sinr': 18,
                'call_drop_rate': 1.5,
                'packet_loss_rate': 0.6
            }
        }
        
        return kpis
    
    def process_pcap_trace(self, filepath):
        """Process PCAP files using tshark"""
        print(f"Processing PCAP trace: {filepath}")
        
        try:
            # Extract basic statistics using tshark
            cmd = ['tshark', '-r', filepath, '-q', '-z', 'conv,ip']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            # Parse tshark output (simplified)
            lines = result.stdout.split('\n')
            packet_count = len([l for l in lines if '->' in l])
            
            kpis = {
                'timestamp': datetime.now().isoformat(),
                'file_type': 'pcap',
                'source_file': filepath,
                'kpis': {
                    'total_packets': packet_count,
                    'file_size_mb': os.path.getsize(filepath) / (1024*1024),
                    'estimated_duration_min': packet_count / 1000,  # Rough estimate
                    'avg_packet_rate': packet_count / max(1, packet_count / 1000)
                }
            }
            
        except Exception as e:
            print(f"Error processing PCAP: {e}")
            kpis = {
                'timestamp': datetime.now().isoformat(),
                'file_type': 'pcap',
                'source_file': filepath,
                'error': str(e),
                'kpis': {}
            }
        
        return kpis
    
    def process_generic_log(self, filepath):
        """Process generic log files"""
        print(f"Processing generic log: {filepath}")
        
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
            
            # Simple log analysis
            error_count = len([l for l in lines if 'ERROR' in l.upper()])
            warning_count = len([l for l in lines if 'WARNING' in l.upper()])
            
            kpis = {
                'timestamp': datetime.now().isoformat(),
                'file_type': 'generic_log',
                'source_file': filepath,
                'kpis': {
                    'total_lines': len(lines),
                    'error_count': error_count,
                    'warning_count': warning_count,
                    'error_rate': (error_count / len(lines)) * 100 if lines else 0
                }
            }
            
        except Exception as e:
            kpis = {
                'timestamp': datetime.now().isoformat(),
                'file_type': 'generic_log',
                'source_file': filepath,
                'error': str(e),
                'kpis': {}
            }
        
        return kpis
    
    def process_file(self, filepath):
        """Process a single trace file"""
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            return None
        
        file_type = self.detect_file_type(filepath)
        
        if file_type == 'qualcomm':
            return self.process_qualcomm_trace(filepath)
        elif file_type == 'samsung':
            return self.process_samsung_trace(filepath)
        elif file_type == 'pcap':
            return self.process_pcap_trace(filepath)
        elif file_type == 'generic_log':
            return self.process_generic_log(filepath)
        else:
            print(f"Unsupported file type: {filepath}")
            return None
    
    def save_results(self, kpis, output_name=None):
        """Save KPI results to JSON and CSV"""
        if not kpis:
            return
        
        os.makedirs(self.output_dir, exist_ok=True)
        
        if not output_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_name = f"kpis_{timestamp}"
        
        # Save as JSON
        json_path = os.path.join(self.output_dir, f"{output_name}.json")
        with open(json_path, 'w') as f:
            json.dump(kpis, f, indent=2)
        
        # Save KPIs as CSV
        if 'kpis' in kpis and kpis['kpis']:
            csv_path = os.path.join(self.output_dir, f"{output_name}.csv")
            df = pd.DataFrame([kpis['kpis']])
            df.to_csv(csv_path, index=False)
        
        print(f"Results saved to: {json_path}")
        return json_path

def main():
    parser = argparse.ArgumentParser(description='Process offline trace files')
    parser.add_argument('input_file', help='Path to trace file')
    parser.add_argument('--output-dir', default='/app/post_processed', 
                       help='Output directory for results')
    parser.add_argument('--output-name', help='Output filename prefix')
    
    args = parser.parse_args()
    
    processor = OfflineTraceProcessor(args.output_dir)
    kpis = processor.process_file(args.input_file)
    
    if kpis:
        processor.save_results(kpis, args.output_name)
        print("Processing completed successfully")
    else:
        print("Processing failed")
        sys.exit(1)

if __name__ == '__main__':
    main()
