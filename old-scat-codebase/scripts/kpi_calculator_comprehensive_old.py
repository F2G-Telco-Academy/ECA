#!/usr/bin/env python3
"""
Comprehensive Multi-RAT KPI Calculator
Based on kpi indicators.csv - Supports 2G/3G/4G/5G
"""

import subprocess
import time
from collections import defaultdict
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class ComprehensiveKPICalculator:
    def __init__(self):
        # LTE (4G) KPIs
        self.lte_rrc_request = 0
        self.lte_rrc_setup_complete = 0
        self.lte_rrc_reject = 0
        self.lte_attach_request = 0
        self.lte_attach_accept = 0
        self.lte_attach_reject = 0
        self.lte_tau_request = 0
        self.lte_tau_accept = 0
        self.lte_tau_reject = 0
        self.lte_service_request = 0
        self.lte_erab_setup_request = 0
        self.lte_erab_setup_response = 0
        self.lte_rach_attempt = 0
        self.lte_rach_response = 0
        self.lte_handover_command = 0
        self.lte_handover_complete = 0
        self.lte_handover_failure = 0
        self.lte_call_setup = 0
        self.lte_call_connect = 0
        self.lte_call_disconnect = 0
        self.lte_rrc_release_normal = 0
        self.lte_rrc_release_abnormal = 0
        self.lte_pdn_request = 0
        self.lte_pdn_accept = 0
        self.lte_pdn_reject = 0
        self.lte_bearer_modify_request = 0
        self.lte_bearer_modify_accept = 0
        
        # Radio Quality Metrics (LTE)
        self.lte_rsrp_samples = []
        self.lte_rsrq_samples = []
        
        # WCDMA (3G) KPIs
        self.wcdma_rrc_request = 0
        self.wcdma_rrc_setup_complete = 0
        self.wcdma_rab_request = 0
        self.wcdma_rab_complete = 0
        self.wcdma_call_setup = 0
        self.wcdma_call_connect = 0
        self.wcdma_handover_command = 0
        self.wcdma_handover_complete = 0
        self.wcdma_rscp_samples = []
        self.wcdma_ecno_samples = []
        
        # GSM (2G) KPIs
        self.gsm_call_setup = 0
        self.gsm_call_connect = 0
        self.gsm_handover_command = 0
        self.gsm_handover_complete = 0
        
        # 5G NR KPIs
        self.nr_rrc_request = 0
        self.nr_rrc_setup_complete = 0
        self.nr_registration_request = 0
        self.nr_registration_accept = 0
        
        # Common
        self.measurement_reports = 0
        self.total_packets = 0
        self.start_time = time.time()
        
        # Frame tracking to avoid double counting in verbose mode
        self.current_frame = None
        self.frame_messages = set()
        
    def process_packet(self, line):
        """Process tshark decoded packet"""
        self.total_packets += 1
        line_upper = line.upper()
        
        # Track frame numbers to avoid double counting
        import re
        frame_match = re.match(r'^FRAME (\d+):', line_upper)
        if frame_match:
            # New frame - reset tracking
            self.current_frame = frame_match.group(1)
            self.frame_messages = set()
            return  # Don't process frame header line
        
        # Helper to count once per frame
        def count_once(message_type):
            key = f"{self.current_frame}:{message_type}"
            if key not in self.frame_messages:
                self.frame_messages.add(key)
                return True
            return False
        
        # Debug: log first match
        if self.total_packets <= 5 and ('RRCCONNECTIONREQUEST' in line_upper or 'ATTACH' in line_upper):
            logger.info(f"DEBUG Line {self.total_packets}: {line[:100]}")
        
        # LTE (4G) Messages - check for LTE context OR specific LTE RRC message patterns
        is_lte_context = 'LTE' in line_upper or 'EUTRAN' in line_upper or 'NAS EPS' in line_upper or 'EPS MOBILITY' in line_upper
        is_lte_rrc_msg = 'C1: RRCCONNECTIONREQUEST' in line_upper or 'C1: RRCCONNECTIONSETUP' in line_upper or 'C1: RRCCONNECTIONREJECT' in line_upper
        
        if is_lte_context or is_lte_rrc_msg:
            if 'C1: RRCCONNECTIONREQUEST' in line_upper and count_once('lte_rrc_request'):
                self.lte_rrc_request += 1
            elif 'C1: RRCCONNECTIONSETUP' in line_upper and count_once('lte_rrc_setup'):
                self.lte_rrc_setup_complete += 1
            elif 'C1: RRCCONNECTIONREJECT' in line_upper and count_once('lte_rrc_reject'):
                self.lte_rrc_reject += 1
            elif 'RRCCONNECTIONREJECT' in line_upper:
                self.lte_rrc_reject += 1
            elif 'RRCCONNECTIONRELEASE' in line_upper:
                if 'NORMAL' in line_upper or 'MO-SIGNALLING' in line_upper:
                    self.lte_rrc_release_normal += 1
                else:
                    self.lte_rrc_release_abnormal += 1
            elif 'ATTACH' in line_upper:
                if 'REQUEST' in line_upper and count_once('lte_attach_request'):
                    self.lte_attach_request += 1
                elif 'ACCEPT' in line_upper and count_once('lte_attach_accept'):
                    self.lte_attach_accept += 1
                elif 'REJECT' in line_upper and count_once('lte_attach_reject'):
                    self.lte_attach_reject += 1
            elif 'TAU' in line_upper or 'TRACKING AREA UPDATE' in line_upper:
                if 'REQUEST' in line_upper and count_once('lte_tau_request'):
                    self.lte_tau_request += 1
                elif 'ACCEPT' in line_upper and count_once('lte_tau_accept'):
                    self.lte_tau_accept += 1
                elif 'REJECT' in line_upper and count_once('lte_tau_reject'):
                    self.lte_tau_reject += 1
            elif 'SERVICE REQUEST' in line_upper:
                self.lte_service_request += 1
            elif 'E-RAB' in line_upper or 'ERAB' in line_upper:
                if 'SETUP' in line_upper:
                    if 'REQUEST' in line_upper:
                        self.lte_erab_setup_request += 1
                    elif 'RESPONSE' in line_upper or 'COMPLETE' in line_upper:
                        self.lte_erab_setup_response += 1
            elif 'RACH' in line_upper:
                if 'ATTEMPT' in line_upper or 'REQUEST' in line_upper:
                    self.lte_rach_attempt += 1
                elif 'RESPONSE' in line_upper:
                    self.lte_rach_response += 1
            elif 'HANDOVER' in line_upper:
                if 'COMMAND' in line_upper:
                    self.lte_handover_command += 1
                elif 'COMPLETE' in line_upper:
                    self.lte_handover_complete += 1
                elif 'FAILURE' in line_upper:
                    self.lte_handover_failure += 1
            elif 'PDN CONNECTIVITY' in line_upper or 'PDN CONNECTION' in line_upper:
                if 'REQUEST' in line_upper:
                    self.lte_pdn_request += 1
                elif 'ACCEPT' in line_upper:
                    self.lte_pdn_accept += 1
                elif 'REJECT' in line_upper:
                    self.lte_pdn_reject += 1
            elif 'BEARER' in line_upper and 'MODIFY' in line_upper:
                if 'REQUEST' in line_upper:
                    self.lte_bearer_modify_request += 1
                elif 'ACCEPT' in line_upper or 'COMPLETE' in line_upper:
                    self.lte_bearer_modify_accept += 1
            elif 'MEASUREMENTREPORT' in line_upper:
                # Extract RSRP/RSRQ values
                import re
                rsrp_match = re.search(r'RSRP[^\d-]*(-?\d+)', line_upper)
                rsrq_match = re.search(r'RSRQ[^\d-]*(-?\d+)', line_upper)
                if rsrp_match:
                    self.lte_rsrp_samples.append(int(rsrp_match.group(1)))
                if rsrq_match:
                    self.lte_rsrq_samples.append(int(rsrq_match.group(1)))
        
        # WCDMA (3G) Messages - look for "message:" format (not "c1:")
        is_wcdma_context = 'WCDMA' in line_upper or 'UMTS' in line_upper or 'UTRAN' in line_upper or 'MESSAGE: RRCCONNECTIONREQUEST' in line_upper or 'MESSAGE: RRCCONNECTIONSETUP' in line_upper
        
        if is_wcdma_context:
            if 'MESSAGE: RRCCONNECTIONREQUEST' in line_upper and count_once('wcdma_rrc_request'):
                self.wcdma_rrc_request += 1
            elif 'MESSAGE: RRCCONNECTIONSETUP' in line_upper and count_once('wcdma_rrc_setup'):
                self.wcdma_rrc_setup_complete += 1
            elif 'RAB' in line_upper:
                if 'ASSIGNMENT' in line_upper:
                    if 'REQUEST' in line_upper:
                        self.wcdma_rab_request += 1
                    elif 'COMPLETE' in line_upper:
                        self.wcdma_rab_complete += 1
            elif 'HANDOVER' in line_upper:
                if 'COMMAND' in line_upper:
                    self.wcdma_handover_command += 1
                elif 'COMPLETE' in line_upper:
                    self.wcdma_handover_complete += 1
            elif 'MEASUREMENTREPORT' in line_upper:
                # Extract RSCP/EcNo values
                import re
                rscp_match = re.search(r'RSCP[^\d-]*(-?\d+)', line_upper)
                ecno_match = re.search(r'EC[/-]?NO[^\d-]*(-?\d+)', line_upper)
                if rscp_match:
                    self.wcdma_rscp_samples.append(int(rscp_match.group(1)))
                if ecno_match:
                    self.wcdma_ecno_samples.append(int(ecno_match.group(1)))
                if ecno_match:
                    self.wcdma_ecno_samples.append(int(ecno_match.group(1)))
        
        # GSM (2G) Messages
        if 'GSM' in line_upper:
            if 'HANDOVER' in line_upper:
                if 'COMMAND' in line_upper:
                    self.gsm_handover_command += 1
                elif 'COMPLETE' in line_upper:
                    self.gsm_handover_complete += 1
        
        # 5G NR Messages
        if '5G' in line_upper or 'NR' in line_upper:
            if 'RRCSETUP' in line_upper:
                if 'REQUEST' in line_upper:
                    self.nr_rrc_request += 1
                elif 'COMPLETE' in line_upper:
                    self.nr_rrc_setup_complete += 1
            elif 'REGISTRATION' in line_upper:
                if 'REQUEST' in line_upper:
                    self.nr_registration_request += 1
                elif 'ACCEPT' in line_upper:
                    self.nr_registration_accept += 1
        
        # Call Control (all RATs)
        if 'CC' in line_upper or 'CALL CONTROL' in line_upper:
            if 'SETUP' in line_upper and 'COMPLETE' not in line_upper:
                if 'LTE' in line_upper or 'EUTRAN' in line_upper:
                    self.lte_call_setup += 1
                elif 'WCDMA' in line_upper or 'UMTS' in line_upper:
                    self.wcdma_call_setup += 1
                elif 'GSM' in line_upper:
                    self.gsm_call_setup += 1
            elif 'CONNECT' in line_upper and 'ACKNOWLEDGE' not in line_upper:
                if 'LTE' in line_upper or 'EUTRAN' in line_upper:
                    self.lte_call_connect += 1
                elif 'WCDMA' in line_upper or 'UMTS' in line_upper:
                    self.wcdma_call_connect += 1
                elif 'GSM' in line_upper:
                    self.gsm_call_connect += 1
            elif 'DISCONNECT' in line_upper:
                if 'LTE' in line_upper or 'EUTRAN' in line_upper:
                    self.lte_call_disconnect += 1
        
        # Measurement Reports (all RATs)
        if 'MEASUREMENT' in line_upper and 'REPORT' in line_upper:
            self.measurement_reports += 1
    
    def calculate_kpis(self):
        """Calculate all KPIs"""
        kpis = {}
        
        # LTE KPIs
        kpis['lte_rrc_success_rate'] = (self.lte_rrc_setup_complete / max(self.lte_rrc_request, 1)) * 100
        kpis['lte_attach_success_rate'] = (self.lte_attach_accept / max(self.lte_attach_request, 1)) * 100
        kpis['lte_tau_success_rate'] = (self.lte_tau_accept / max(self.lte_tau_request, 1)) * 100
        kpis['lte_erab_success_rate'] = (self.lte_erab_setup_response / max(self.lte_erab_setup_request, 1)) * 100
        kpis['lte_rach_success_rate'] = (self.lte_rach_response / max(self.lte_rach_attempt, 1)) * 100
        kpis['lte_handover_success_rate'] = (self.lte_handover_complete / max(self.lte_handover_command, 1)) * 100
        kpis['lte_call_success_rate'] = (self.lte_call_connect / max(self.lte_call_setup, 1)) * 100
        kpis['lte_call_drop_rate'] = (self.lte_call_disconnect / max(self.lte_call_connect, 1)) * 100
        kpis['lte_rrc_abnormal_release_rate'] = (self.lte_rrc_release_abnormal / max(self.lte_rrc_release_normal + self.lte_rrc_release_abnormal, 1)) * 100
        kpis['lte_pdn_success_rate'] = (self.lte_pdn_accept / max(self.lte_pdn_request, 1)) * 100
        kpis['lte_bearer_modify_success_rate'] = (self.lte_bearer_modify_accept / max(self.lte_bearer_modify_request, 1)) * 100
        kpis['lte_rsrp_avg'] = sum(self.lte_rsrp_samples) / len(self.lte_rsrp_samples) if self.lte_rsrp_samples else 0
        kpis['lte_rsrq_avg'] = sum(self.lte_rsrq_samples) / len(self.lte_rsrq_samples) if self.lte_rsrq_samples else 0
        
        # WCDMA KPIs
        kpis['wcdma_rrc_success_rate'] = (self.wcdma_rrc_setup_complete / max(self.wcdma_rrc_request, 1)) * 100
        kpis['wcdma_rab_success_rate'] = (self.wcdma_rab_complete / max(self.wcdma_rab_request, 1)) * 100
        kpis['wcdma_call_success_rate'] = (self.wcdma_call_connect / max(self.wcdma_call_setup, 1)) * 100
        kpis['wcdma_handover_success_rate'] = (self.wcdma_handover_complete / max(self.wcdma_handover_command, 1)) * 100
        kpis['wcdma_rscp_avg'] = sum(self.wcdma_rscp_samples) / len(self.wcdma_rscp_samples) if self.wcdma_rscp_samples else 0
        kpis['wcdma_ecno_avg'] = sum(self.wcdma_ecno_samples) / len(self.wcdma_ecno_samples) if self.wcdma_ecno_samples else 0
        
        # GSM KPIs
        kpis['gsm_call_success_rate'] = (self.gsm_call_connect / max(self.gsm_call_setup, 1)) * 100
        kpis['gsm_handover_success_rate'] = (self.gsm_handover_complete / max(self.gsm_handover_command, 1)) * 100
        
        # 5G NR KPIs
        kpis['nr_rrc_success_rate'] = (self.nr_rrc_setup_complete / max(self.nr_rrc_request, 1)) * 100
        kpis['nr_registration_success_rate'] = (self.nr_registration_accept / max(self.nr_registration_request, 1)) * 100
        
        return kpis

# Global calculator
calc = ComprehensiveKPICalculator()

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            kpis = calc.calculate_kpis()
            
            metrics = f"""# LTE (4G) KPIs
# HELP scat_lte_rrc_success_rate LTE RRC Connection Success Rate (%)
# TYPE scat_lte_rrc_success_rate gauge
scat_lte_rrc_success_rate{{rat="LTE"}} {kpis['lte_rrc_success_rate']:.2f}

# HELP scat_lte_attach_success_rate LTE Attach Success Rate (%)
# TYPE scat_lte_attach_success_rate gauge
scat_lte_attach_success_rate{{rat="LTE"}} {kpis['lte_attach_success_rate']:.2f}

# HELP scat_lte_tau_success_rate LTE TAU Success Rate (%)
# TYPE scat_lte_tau_success_rate gauge
scat_lte_tau_success_rate{{rat="LTE"}} {kpis['lte_tau_success_rate']:.2f}

# HELP scat_lte_erab_success_rate LTE E-RAB Setup Success Rate (%)
# TYPE scat_lte_erab_success_rate gauge
scat_lte_erab_success_rate{{rat="LTE"}} {kpis['lte_erab_success_rate']:.2f}

# HELP scat_lte_rach_success_rate LTE RACH Success Rate (%)
# TYPE scat_lte_rach_success_rate gauge
scat_lte_rach_success_rate{{rat="LTE"}} {kpis['lte_rach_success_rate']:.2f}

# HELP scat_lte_handover_success_rate LTE Handover Success Rate (%)
# TYPE scat_lte_handover_success_rate gauge
scat_lte_handover_success_rate{{rat="LTE"}} {kpis['lte_handover_success_rate']:.2f}

# HELP scat_lte_call_success_rate LTE Call Setup Success Rate (%)
# TYPE scat_lte_call_success_rate gauge
scat_lte_call_success_rate{{rat="LTE"}} {kpis['lte_call_success_rate']:.2f}

# HELP scat_lte_call_drop_rate LTE Call Drop Rate (%)
# TYPE scat_lte_call_drop_rate gauge
scat_lte_call_drop_rate{{rat="LTE"}} {kpis['lte_call_drop_rate']:.2f}

# HELP scat_lte_pdn_success_rate LTE PDN Connectivity Success Rate (%)
# TYPE scat_lte_pdn_success_rate gauge
scat_lte_pdn_success_rate{{rat="LTE"}} {kpis['lte_pdn_success_rate']:.2f}

# HELP scat_lte_bearer_modify_success_rate LTE Bearer Modification Success Rate (%)
# TYPE scat_lte_bearer_modify_success_rate gauge
scat_lte_bearer_modify_success_rate{{rat="LTE"}} {kpis['lte_bearer_modify_success_rate']:.2f}

# HELP scat_lte_rsrp_avg LTE Average RSRP (dBm)
# TYPE scat_lte_rsrp_avg gauge
scat_lte_rsrp_avg{{rat="LTE"}} {kpis['lte_rsrp_avg']:.2f}

# HELP scat_lte_rsrq_avg LTE Average RSRQ (dB)
# TYPE scat_lte_rsrq_avg gauge
scat_lte_rsrq_avg{{rat="LTE"}} {kpis['lte_rsrq_avg']:.2f}

# WCDMA (3G) KPIs
# HELP scat_wcdma_rrc_success_rate WCDMA RRC Success Rate (%)
# TYPE scat_wcdma_rrc_success_rate gauge
scat_wcdma_rrc_success_rate{{rat="WCDMA"}} {kpis['wcdma_rrc_success_rate']:.2f}

# HELP scat_wcdma_rab_success_rate WCDMA RAB Success Rate (%)
# TYPE scat_wcdma_rab_success_rate gauge
scat_wcdma_rab_success_rate{{rat="WCDMA"}} {kpis['wcdma_rab_success_rate']:.2f}

# HELP scat_wcdma_call_success_rate WCDMA Call Success Rate (%)
# TYPE scat_wcdma_call_success_rate gauge
scat_wcdma_call_success_rate{{rat="WCDMA"}} {kpis['wcdma_call_success_rate']:.2f}

# HELP scat_wcdma_handover_success_rate WCDMA Handover Success Rate (%)
# TYPE scat_wcdma_handover_success_rate gauge
scat_wcdma_handover_success_rate{{rat="WCDMA"}} {kpis['wcdma_handover_success_rate']:.2f}

# HELP scat_wcdma_rscp_avg WCDMA Average RSCP (dBm)
# TYPE scat_wcdma_rscp_avg gauge
scat_wcdma_rscp_avg{{rat="WCDMA"}} {kpis['wcdma_rscp_avg']:.2f}

# HELP scat_wcdma_ecno_avg WCDMA Average Ec/No (dB)
# TYPE scat_wcdma_ecno_avg gauge
scat_wcdma_ecno_avg{{rat="WCDMA"}} {kpis['wcdma_ecno_avg']:.2f}

# GSM (2G) KPIs
# HELP scat_gsm_call_success_rate GSM Call Success Rate (%)
# TYPE scat_gsm_call_success_rate gauge
scat_gsm_call_success_rate{{rat="GSM"}} {kpis['gsm_call_success_rate']:.2f}

# HELP scat_gsm_handover_success_rate GSM Handover Success Rate (%)
# TYPE scat_gsm_handover_success_rate gauge
scat_gsm_handover_success_rate{{rat="GSM"}} {kpis['gsm_handover_success_rate']:.2f}

# 5G NR KPIs
# HELP scat_nr_rrc_success_rate 5G NR RRC Success Rate (%)
# TYPE scat_nr_rrc_success_rate gauge
scat_nr_rrc_success_rate{{rat="NR"}} {kpis['nr_rrc_success_rate']:.2f}

# HELP scat_nr_registration_success_rate 5G NR Registration Success Rate (%)
# TYPE scat_nr_registration_success_rate gauge
scat_nr_registration_success_rate{{rat="NR"}} {kpis['nr_registration_success_rate']:.2f}

# HELP scat_total_packets Total Packets Processed
# TYPE scat_total_packets counter
scat_total_packets {calc.total_packets}
"""
            
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(metrics.encode())
            
        elif self.path == '/debug':
            kpis = calc.calculate_kpis()
            runtime = time.time() - calc.start_time
            
            debug = f"""COMPREHENSIVE MULTI-RAT KPI CALCULATOR
============================================================

LTE (4G) KPIs:
  RRC Success Rate: {kpis['lte_rrc_success_rate']:.2f}% [Target: >99%]
  Attach Success Rate: {kpis['lte_attach_success_rate']:.2f}% [Target: >98%]
  TAU Success Rate: {kpis['lte_tau_success_rate']:.2f}% [Target: >99%]
  E-RAB Success Rate: {kpis['lte_erab_success_rate']:.2f}% [Target: >98%]
  RACH Success Rate: {kpis['lte_rach_success_rate']:.2f}% [Target: >99%]
  Handover Success Rate: {kpis['lte_handover_success_rate']:.2f}% [Target: >95%]
  Call Success Rate: {kpis['lte_call_success_rate']:.2f}% [Target: >95%]
  Call Drop Rate: {kpis['lte_call_drop_rate']:.2f}% [Target: <2%]
  PDN Connectivity Success Rate: {kpis['lte_pdn_success_rate']:.2f}% [Target: >98%]
  Bearer Modify Success Rate: {kpis['lte_bearer_modify_success_rate']:.2f}% [Target: >98%]
  Average RSRP: {kpis['lte_rsrp_avg']:.2f} dBm
  Average RSRQ: {kpis['lte_rsrq_avg']:.2f} dB

WCDMA (3G) KPIs:
  RRC Success Rate: {kpis['wcdma_rrc_success_rate']:.2f}% [Target: >99%]
  RAB Success Rate: {kpis['wcdma_rab_success_rate']:.2f}% [Target: >98%]
  Call Success Rate: {kpis['wcdma_call_success_rate']:.2f}% [Target: >95%]
  Handover Success Rate: {kpis['wcdma_handover_success_rate']:.2f}% [Target: >95%]
  Average RSCP: {kpis['wcdma_rscp_avg']:.2f} dBm
  Average Ec/No: {kpis['wcdma_ecno_avg']:.2f} dB

GSM (2G) KPIs:
  Call Success Rate: {kpis['gsm_call_success_rate']:.2f}% [Target: >95%]
  Handover Success Rate: {kpis['gsm_handover_success_rate']:.2f}% [Target: >95%]

5G NR KPIs:
  RRC Success Rate: {kpis['nr_rrc_success_rate']:.2f}% [Target: >99%]
  Registration Success Rate: {kpis['nr_registration_success_rate']:.2f}% [Target: >98%]

Counters:
  LTE: RRC={calc.lte_rrc_request}/{calc.lte_rrc_setup_complete}/{calc.lte_rrc_reject}, Attach={calc.lte_attach_request}/{calc.lte_attach_accept}/{calc.lte_attach_reject}, TAU={calc.lte_tau_request}/{calc.lte_tau_accept}/{calc.lte_tau_reject}
  WCDMA: RRC={calc.wcdma_rrc_request}/{calc.wcdma_rrc_setup_complete}, RAB={calc.wcdma_rab_request}/{calc.wcdma_rab_complete}
  GSM: Calls={calc.gsm_call_setup}/{calc.gsm_call_connect}
  5G NR: RRC={calc.nr_rrc_request}/{calc.nr_rrc_setup_complete}
  Measurement Reports: {calc.measurement_reports}

Total Packets: {calc.total_packets}
Runtime: {runtime:.1f}s
"""
            
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(debug.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

def sniff_with_tshark(pcap_file=None):
    """Use tshark to decode GSMTAP packets"""
    if pcap_file:
        logger.info(f"Reading from file: {pcap_file}")
        cmd = ['tshark', '-r', pcap_file, '-Y', 'gsmtap', '-V']
    else:
        logger.info("Starting tshark to decode GSMTAP packets...")
        cmd = ['tshark', '-i', 'lo', '-f', 'udp port 4729', '-Y', 'gsmtap', '-V']
    
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    
    for line in process.stdout:
        calc.process_packet(line)
    
    if pcap_file:
        process.wait()
        logger.info(f"Finished processing {calc.total_packets} packets")

if __name__ == '__main__':
    import sys
    
    logger.info("=" * 60)
    logger.info("COMPREHENSIVE MULTI-RAT KPI CALCULATOR")
    logger.info("Supports: 2G (GSM) / 3G (WCDMA) / 4G (LTE) / 5G (NR)")
    logger.info("=" * 60)
    
    pcap_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Reset calculator for new run
    calc = ComprehensiveKPICalculator()
    
    # Start HTTP server
    server = HTTPServer(('0.0.0.0', 9100), MetricsHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    
    logger.info(f"✓ Metrics: http://localhost:9100/metrics")
    logger.info(f"✓ Debug: http://localhost:9100/debug")
    if pcap_file:
        logger.info(f"✓ Processing file: {pcap_file}")
    else:
        logger.info(f"✓ Decoding GSMTAP with tshark...")
    
    try:
        sniff_with_tshark(pcap_file)
        if pcap_file:
            logger.info("File processing complete. Server running for metrics access.")
            logger.info("Press Ctrl+C to stop.")
            while True:
                time.sleep(1)
    except KeyboardInterrupt:
        logger.info("\nStopping...")
