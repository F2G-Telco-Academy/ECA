#!/usr/bin/env python3
"""
Real-Time KPI Extractor
Processes SCAT diagnostic messages in real-time to extract KPIs
Achieves parity with MobileInsight by parsing raw messages
"""

import sys
import json
import re
from datetime import datetime
from collections import defaultdict

class RealtimeKpiExtractor:
    def __init__(self):
        self.kpis = defaultdict(lambda: {
            'total': 0,
            'success': 0,
            'by_cause': defaultdict(int),
            'by_cell': defaultdict(lambda: {'total': 0, 'success': 0}),
            'measurements': [],
            'timestamps': []
        })
        
        self.current_cell = None
        self.rrc_state = None
        self.establishment_cause = None
        
    def process_line(self, line):
        """Process each line from SCAT output"""
        
        # LTE RRC Connection Request
        if 'RRCConnectionRequest' in line or 'rrcConnectionRequest' in line:
            cause = self._extract_establishment_cause(line)
            self.establishment_cause = cause
            self.kpis['LTE_RRC']['total'] += 1
            self.kpis['LTE_RRC']['by_cause'][cause] += 1
            self.kpis['LTE_RRC']['timestamps'].append(datetime.now().isoformat())
            
        # LTE RRC Connection Setup Complete
        elif 'RRCConnectionSetupComplete' in line or 'rrcConnectionSetupComplete' in line:
            self.kpis['LTE_RRC']['success'] += 1
            if self.establishment_cause:
                self.kpis['LTE_RRC']['by_cause'][self.establishment_cause + '_SUCCESS'] += 1
            
        # LTE RRC Connection Release
        elif 'RRCConnectionRelease' in line or 'rrcConnectionRelease' in line:
            release_cause = self._extract_release_cause(line)
            self.kpis['LTE_RRC_RELEASE']['by_cause'][release_cause] += 1
            
        # RSRP/RSRQ Measurements
        elif 'RSRP' in line or 'rsrp' in line:
            rsrp, rsrq, cell_id = self._extract_measurements(line)
            if rsrp:
                self.kpis['RSRP']['measurements'].append({
                    'value': rsrp,
                    'rsrq': rsrq,
                    'cell_id': cell_id,
                    'timestamp': datetime.now().isoformat()
                })
                if cell_id:
                    self.current_cell = cell_id
                    
        # Handover Command
        elif 'HandoverCommand' in line or 'mobilityFromEUTRACommand' in line:
            self.kpis['LTE_HO']['total'] += 1
            if self.current_cell:
                self.kpis['LTE_HO']['by_cell'][self.current_cell]['total'] += 1
                
        # Handover Complete
        elif 'HandoverComplete' in line or 'rrcConnectionReconfigurationComplete' in line:
            self.kpis['LTE_HO']['success'] += 1
            if self.current_cell:
                self.kpis['LTE_HO']['by_cell'][self.current_cell]['success'] += 1
                
        # Attach Request
        elif 'AttachRequest' in line or 'ATTACH REQUEST' in line:
            self.kpis['LTE_ATTACH']['total'] += 1
            
        # Attach Accept
        elif 'AttachAccept' in line or 'ATTACH ACCEPT' in line:
            self.kpis['LTE_ATTACH']['success'] += 1
            
        # TAU Request
        elif 'TAURequest' in line or 'TRACKING AREA UPDATE REQUEST' in line:
            self.kpis['LTE_TAU']['total'] += 1
            
        # TAU Accept
        elif 'TAUAccept' in line or 'TRACKING AREA UPDATE ACCEPT' in line:
            self.kpis['LTE_TAU']['success'] += 1
            
        # 5G RRC Setup
        elif 'RRCSetup' in line and 'NR' in line:
            self.kpis['5G_RRC']['total'] += 1
            
        elif 'RRCSetupComplete' in line and 'NR' in line:
            self.kpis['5G_RRC']['success'] += 1
            
    def _extract_establishment_cause(self, line):
        """Extract RRC establishment cause"""
        causes = {
            'emergency': 'EMERGENCY',
            'highPriorityAccess': 'HIGH_PRIORITY_ACCESS',
            'mt-Access': 'MT_ACCESS',
            'mo-Signalling': 'MO_SIGNAL',
            'mo-Data': 'MO_DATA'
        }
        for key, value in causes.items():
            if key in line:
                return value
        return 'UNKNOWN'
        
    def _extract_release_cause(self, line):
        """Extract RRC release cause"""
        causes = {
            'loadBalancingTAUrequired': 'LB_TAU',
            'cs-FallbackHighPriority': 'CSFB',
            'rrc-Suspend': 'SUSPEND'
        }
        for key, value in causes.items():
            if key in line:
                return value
        return 'OTHER'
        
    def _extract_measurements(self, line):
        """Extract RSRP/RSRQ measurements"""
        rsrp = None
        rsrq = None
        cell_id = None
        
        # Try to extract RSRP
        rsrp_match = re.search(r'RSRP[:\s=]+(-?\d+)', line, re.IGNORECASE)
        if rsrp_match:
            rsrp = float(rsrp_match.group(1))
            
        # Try to extract RSRQ
        rsrq_match = re.search(r'RSRQ[:\s=]+(-?\d+)', line, re.IGNORECASE)
        if rsrq_match:
            rsrq = float(rsrq_match.group(1))
            
        # Try to extract Cell ID
        cell_match = re.search(r'(?:Cell|PCI)[:\s=]+(\d+)', line, re.IGNORECASE)
        if cell_match:
            cell_id = cell_match.group(1)
            
        return rsrp, rsrq, cell_id
        
    def calculate_success_rates(self):
        """Calculate success rates for all KPIs"""
        results = {}
        
        for kpi_name, data in self.kpis.items():
            if data['total'] > 0:
                sr = (data['success'] / data['total']) * 100
                results[kpi_name] = {
                    'success_rate': sr,
                    'total': data['total'],
                    'success': data['success'],
                    'by_cause': dict(data['by_cause']),
                    'by_cell': {k: v for k, v in data['by_cell'].items()}
                }
                
                # Add measurement statistics
                if data['measurements']:
                    values = [m['value'] for m in data['measurements']]
                    results[kpi_name]['measurements'] = {
                        'min': min(values),
                        'max': max(values),
                        'avg': sum(values) / len(values),
                        'count': len(values),
                        'time_series': data['measurements'][-100:]  # Last 100
                    }
                    
        return results
        
    def export_json(self, output_path):
        """Export KPIs to JSON"""
        results = self.calculate_success_rates()
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        return results

def main():
    if len(sys.argv) < 2:
        print("Usage: python realtime_kpi_extractor.py <output_json>")
        print("Reads SCAT output from stdin")
        sys.exit(1)
        
    output_path = sys.argv[1]
    extractor = RealtimeKpiExtractor()
    
    print("Real-time KPI extraction started. Reading from stdin...", file=sys.stderr)
    
    try:
        for line in sys.stdin:
            extractor.process_line(line.strip())
            
            # Export every 100 lines
            if extractor.kpis['LTE_RRC']['total'] % 100 == 0 and extractor.kpis['LTE_RRC']['total'] > 0:
                extractor.export_json(output_path)
                print(f"Exported KPIs: {extractor.kpis['LTE_RRC']['total']} RRC attempts", file=sys.stderr)
                
    except KeyboardInterrupt:
        pass
        
    # Final export
    results = extractor.export_json(output_path)
    print(f"\nFinal KPI Summary:", file=sys.stderr)
    for kpi, data in results.items():
        if 'success_rate' in data:
            print(f"  {kpi}: {data['success_rate']:.2f}% ({data['success']}/{data['total']})", file=sys.stderr)

if __name__ == '__main__':
    main()
