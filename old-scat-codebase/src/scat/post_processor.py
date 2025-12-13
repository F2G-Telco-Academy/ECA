#!/usr/bin/env python3
"""Post-processor for offline trace files (QMDL2, SDM, LOGE)"""

import os
import json
from datetime import datetime
from .kpi_extractor import KPIExtractor
from .logger import StructuredLogger

class TracePostProcessor:
    """Process offline trace files and export to observability stack"""
    
    def __init__(self, trace_file, output_dir='./post_processed'):
        self.trace_file = trace_file
        self.output_dir = output_dir
        self.kpi_extractor = KPIExtractor()
        self.logger = StructuredLogger(f"{output_dir}/trace_events.log")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Detect file type
        self.file_type = self._detect_type()
    
    def _detect_type(self):
        """Detect trace file type"""
        ext = os.path.splitext(self.trace_file)[1].lower()
        if ext in ['.qmdl', '.qmdl2']:
            return 'qmdl'
        elif ext == '.sdm':
            return 'sdm'
        elif ext == '.loge':
            return 'loge'
        return 'unknown'
    
    def process(self):
        """Process trace file and extract KPIs"""
        print(f"📂 Processing {self.file_type.upper()} file: {self.trace_file}")
        
        # Use SCAT's existing parsers
        from .iodevices import FileIO
        from .parsers import QualcommParser, SamsungParser
        
        io_device = FileIO([self.trace_file])
        
        if self.file_type == 'qmdl':
            parser = QualcommParser()
        elif self.file_type == 'sdm':
            parser = SamsungParser()
        else:
            print(f"❌ Unsupported file type: {self.file_type}")
            return
        
        parser.set_io_device(io_device)
        
        # Process packets and extract KPIs
        packet_count = 0
        try:
            for packet in parser.read_dump():
                packet_count += 1
                
                # Extract KPIs
                packet_str = str(packet)
                self.kpi_extractor.parse_measurement_report(packet_str)
                self.kpi_extractor.parse_rrc_connection(packet_str)
                self.kpi_extractor.parse_rach(packet_str)
                self.kpi_extractor.parse_handover(packet_str)
                self.kpi_extractor.parse_erab(packet_str)
                
                # Log event
                self.logger.info("Trace event", 
                               packet_id=packet_count,
                               source=self.trace_file)
        except:
            pass
        
        print(f"✅ Processed {packet_count} packets")
        
        # Calculate and export KPIs
        self._export_kpis()
        self._export_metrics()
    
    def _export_kpis(self):
        """Export KPIs to JSON"""
        kpis = self.kpi_extractor.calculate_kpis()
        
        output_file = f"{self.output_dir}/kpis.json"
        with open(output_file, 'w') as f:
            json.dump({
                'source_file': self.trace_file,
                'processed_at': datetime.utcnow().isoformat(),
                'kpis': kpis
            }, f, indent=2)
        
        print(f"📊 KPIs exported to: {output_file}")
        
        # Print summary
        print("\n📈 KPI Summary:")
        print(f"   RSRP avg: {kpis.get('rsrp_avg', 0):.1f} dBm")
        print(f"   RRC success rate: {kpis.get('rrc_success_rate', 0):.1f}%")
        print(f"   Handover success rate: {kpis.get('handover_success_rate', 0):.1f}%")
    
    def _export_metrics(self):
        """Export metrics in Prometheus format"""
        kpis = self.kpi_extractor.calculate_kpis()
        
        output_file = f"{self.output_dir}/metrics.prom"
        with open(output_file, 'w') as f:
            f.write(f'# HELP trace_rsrp_avg Average RSRP\n')
            f.write(f'# TYPE trace_rsrp_avg gauge\n')
            f.write(f'trace_rsrp_avg{{file="{self.trace_file}"}} {kpis.get("rsrp_avg", 0)}\n\n')
            
            f.write(f'# HELP trace_rrc_success_rate RRC success rate\n')
            f.write(f'# TYPE trace_rrc_success_rate gauge\n')
            f.write(f'trace_rrc_success_rate{{file="{self.trace_file}"}} {kpis.get("rrc_success_rate", 0)}\n\n')
            
            f.write(f'# HELP trace_handover_success_rate Handover success rate\n')
            f.write(f'# TYPE trace_handover_success_rate gauge\n')
            f.write(f'trace_handover_success_rate{{file="{self.trace_file}"}} {kpis.get("handover_success_rate", 0)}\n')
        
        print(f"📊 Metrics exported to: {output_file}")

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python -m scat.post_processor <trace_file>")
        sys.exit(1)
    
    processor = TracePostProcessor(sys.argv[1])
    processor.process()
