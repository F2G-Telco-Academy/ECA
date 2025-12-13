#!/usr/bin/env python3
"""Extract telecom KPIs from SCAT logs"""

import re
from collections import defaultdict

class KPIExtractor:
    """Extracts telecom-relevant KPIs from SCAT packet logs"""
    
    def __init__(self):
        self.kpis = {
            # Coverage & Signal Quality
            'rsrp': [],
            'rsrq': [],
            'sinr': [],
            
            # Performance
            'throughput_dl': 0,
            'throughput_ul': 0,
            'latency': 0,
            
            # Accessibility
            'rrc_attempts': 0,
            'rrc_success': 0,
            'erab_attempts': 0,
            'erab_success': 0,
            'rach_attempts': 0,
            'rach_success': 0,
            
            # Retainability
            'call_drops': 0,
            'rrc_releases_abnormal': 0,
            
            # Mobility
            'handover_attempts': 0,
            'handover_success': 0,
            'handover_failures': 0,
        }
    
    def parse_measurement_report(self, packet_data):
        """Extract RSRP, RSRQ, SINR from measurement reports"""
        rsrp_match = re.search(r'rsrp[:\s]+(-?\d+)', packet_data, re.IGNORECASE)
        rsrq_match = re.search(r'rsrq[:\s]+(-?\d+)', packet_data, re.IGNORECASE)
        sinr_match = re.search(r'sinr[:\s]+(-?\d+)', packet_data, re.IGNORECASE)
        
        if rsrp_match:
            self.kpis['rsrp'].append(int(rsrp_match.group(1)))
        if rsrq_match:
            self.kpis['rsrq'].append(int(rsrq_match.group(1)))
        if sinr_match:
            self.kpis['sinr'].append(int(sinr_match.group(1)))
    
    def parse_rrc_connection(self, packet_data):
        """Track RRC connection establishment"""
        if 'RRCConnectionRequest' in packet_data:
            self.kpis['rrc_attempts'] += 1
        elif 'RRCConnectionSetupComplete' in packet_data:
            self.kpis['rrc_success'] += 1
    
    def parse_rach(self, packet_data):
        """Track RACH success rate"""
        if 'RACH' in packet_data and 'Attempt' in packet_data:
            self.kpis['rach_attempts'] += 1
        if 'RACH' in packet_data and 'Success' in packet_data:
            self.kpis['rach_success'] += 1
    
    def parse_handover(self, packet_data):
        """Track handover events"""
        if 'MobilityControlInfo' in packet_data:
            self.kpis['handover_attempts'] += 1
        if 'RRCConnectionReconfigurationComplete' in packet_data and 'handover' in packet_data.lower():
            self.kpis['handover_success'] += 1
    
    def parse_erab(self, packet_data):
        """Track E-RAB establishment"""
        if 'E-RAB' in packet_data and 'Setup' in packet_data:
            self.kpis['erab_attempts'] += 1
        if 'E-RAB' in packet_data and 'Complete' in packet_data:
            self.kpis['erab_success'] += 1
    
    def calculate_kpis(self):
        """Calculate derived KPIs"""
        kpi_results = {}
        
        # Signal quality averages
        kpi_results['rsrp_avg'] = sum(self.kpis['rsrp']) / len(self.kpis['rsrp']) if self.kpis['rsrp'] else 0
        kpi_results['rsrq_avg'] = sum(self.kpis['rsrq']) / len(self.kpis['rsrq']) if self.kpis['rsrq'] else 0
        kpi_results['sinr_avg'] = sum(self.kpis['sinr']) / len(self.kpis['sinr']) if self.kpis['sinr'] else 0
        
        # RRC Connection Establishment Rate
        if self.kpis['rrc_attempts'] > 0:
            kpi_results['rrc_success_rate'] = (self.kpis['rrc_success'] / self.kpis['rrc_attempts']) * 100
        else:
            kpi_results['rrc_success_rate'] = 0
        
        # RACH Success Rate
        if self.kpis['rach_attempts'] > 0:
            kpi_results['rach_success_rate'] = (self.kpis['rach_success'] / self.kpis['rach_attempts']) * 100
        else:
            kpi_results['rach_success_rate'] = 0
        
        # E-RAB Establishment Success Rate
        if self.kpis['erab_attempts'] > 0:
            kpi_results['erab_success_rate'] = (self.kpis['erab_success'] / self.kpis['erab_attempts']) * 100
        else:
            kpi_results['erab_success_rate'] = 0
        
        # Handover Success Rate
        if self.kpis['handover_attempts'] > 0:
            kpi_results['handover_success_rate'] = (self.kpis['handover_success'] / self.kpis['handover_attempts']) * 100
        else:
            kpi_results['handover_success_rate'] = 0
        
        return kpi_results
