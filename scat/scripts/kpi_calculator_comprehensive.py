#!/usr/bin/env python3
"""
Simple Accurate KPI Calculator - Uses tshark field extraction for precise counting
"""
import subprocess
import sys
import time
import json
import os
import signal
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleKPICalculator:
    def __init__(self):
        self.kpis = {}
        self.event_details = {}
        self.start_time = time.time()
        
    def count_packets(self, pcap_file, filter_expr):
        """Count packets matching a tshark filter"""
        cmd = ['tshark', '-r', pcap_file, '-d', 'udp.port==4729,gsmtap', '-Y', filter_expr, '-T', 'fields', '-e', 'frame.number']
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
            # Filter out "Cannot find dissector" errors and empty lines
            lines = [line for line in result.stdout.strip().split('\n') 
                    if line.strip() and not line.startswith('Cannot')]
            return len(lines)
        except Exception as e:
            logger.error(f"Error counting packets with filter '{filter_expr}': {e}")
            return 0
    
    def get_packet_details(self, pcap_file, filter_expr):
        """Get detailed packet info with timestamps"""
        cmd = ['tshark', '-r', pcap_file, '-d', 'udp.port==4729,gsmtap', '-Y', filter_expr, '-T', 'fields', 
               '-e', 'frame.number', '-e', 'frame.time_epoch', '-E', 'separator=|']
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
            details = []
            for line in result.stdout.strip().split('\n'):
                if line.strip() and not line.startswith('Cannot'):
                    parts = line.split('|')
                    if len(parts) >= 2:
                        details.append({'frame': int(parts[0]), 'timestamp': float(parts[1])})
            return details
        except Exception as e:
            logger.error(f"Error getting packet details: {e}")
            return []
    
    def analyze(self, pcap_file):
        """Analyze capture file and calculate KPIs"""
        logger.info(f"Analyzing: {pcap_file}")
        
        # Store event details with timestamps
        self.event_details = {}
        
        # LTE RRC
        lte_rrc_req = self.count_packets(pcap_file, 'lte-rrc.rrcConnectionRequest_element')
        lte_rrc_setup = self.count_packets(pcap_file, 'lte-rrc.rrcConnectionSetup_element')
        self.event_details['lte_rrc_req'] = self.get_packet_details(pcap_file, 'lte-rrc.rrcConnectionRequest_element')
        self.event_details['lte_rrc_setup'] = self.get_packet_details(pcap_file, 'lte-rrc.rrcConnectionSetup_element')
        
        # LTE NAS
        lte_attach_req = self.count_packets(pcap_file, 'nas_eps.nas_msg_emm_type == 0x41')
        lte_attach_acc = self.count_packets(pcap_file, 'nas_eps.nas_msg_emm_type == 0x42')
        lte_tau_req = self.count_packets(pcap_file, 'nas_eps.nas_msg_emm_type == 0x48')
        lte_tau_acc = self.count_packets(pcap_file, 'nas_eps.nas_msg_emm_type == 0x49')
        self.event_details['lte_attach_req'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_emm_type == 0x41')
        self.event_details['lte_attach_acc'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_emm_type == 0x42')
        self.event_details['lte_tau_req'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_emm_type == 0x48')
        self.event_details['lte_tau_acc'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_emm_type == 0x49')
        
        # LTE E-RAB (Priority 1)
        lte_erab_setup = self.count_packets(pcap_file, 'lte-rrc.rrcConnectionReconfiguration_element')
        self.event_details['lte_erab_setup'] = self.get_packet_details(pcap_file, 'lte-rrc.rrcConnectionReconfiguration_element')
        
        # LTE PDN Connectivity (Priority 1)
        lte_pdn_req = self.count_packets(pcap_file, 'nas_eps.nas_msg_esm_type == 0xd0')
        lte_pdn_acc = self.count_packets(pcap_file, 'nas_eps.nas_msg_esm_type == 0xd1')
        self.event_details['lte_pdn_req'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_esm_type == 0xd0')
        self.event_details['lte_pdn_acc'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_esm_type == 0xd1')
        
        # LTE Service Request (Priority 1)
        lte_service_req = self.count_packets(pcap_file, 'nas_eps.nas_msg_emm_type == 0x4c')
        lte_service_acc = self.count_packets(pcap_file, 'nas_eps.nas_msg_emm_type == 0x4d')
        self.event_details['lte_service_req'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_emm_type == 0x4c')
        self.event_details['lte_service_acc'] = self.get_packet_details(pcap_file, 'nas_eps.nas_msg_emm_type == 0x4d')
        
        # WCDMA RRC
        wcdma_rrc_req = self.count_packets(pcap_file, 'rrc.rrcConnectionRequest_element')
        wcdma_rrc_setup = self.count_packets(pcap_file, 'rrc.rrcConnectionSetup_element')
        self.event_details['wcdma_rrc_req'] = self.get_packet_details(pcap_file, 'rrc.rrcConnectionRequest_element')
        self.event_details['wcdma_rrc_setup'] = self.get_packet_details(pcap_file, 'rrc.rrcConnectionSetup_element')
        
        # WCDMA RAB Assignment
        wcdma_rab_assign = self.count_packets(pcap_file, 'rrc.radioBearerSetup')
        wcdma_rab_complete = self.count_packets(pcap_file, 'rrc.radioBearerSetupComplete_element')
        self.event_details['wcdma_rab_assign'] = self.get_packet_details(pcap_file, 'rrc.radioBearerSetup')
        self.event_details['wcdma_rab_complete'] = self.get_packet_details(pcap_file, 'rrc.radioBearerSetupComplete_element')
        
        # WCDMA Handovers
        wcdma_ho_cmd = self.count_packets(pcap_file, 'rrc.physicalChannelReconfiguration')
        wcdma_ho_complete = self.count_packets(pcap_file, 'rrc.physicalChannelReconfigurationComplete_element')
        self.event_details['wcdma_ho_cmd'] = self.get_packet_details(pcap_file, 'rrc.physicalChannelReconfiguration')
        self.event_details['wcdma_ho_complete'] = self.get_packet_details(pcap_file, 'rrc.physicalChannelReconfigurationComplete_element')
        
        # Call Control
        call_setup = self.count_packets(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x05')
        call_connect = self.count_packets(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x0f')
        call_disconnect = self.count_packets(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x25')
        self.event_details['call_setup'] = self.get_packet_details(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x05')
        self.event_details['call_connect'] = self.get_packet_details(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x0f')
        self.event_details['call_disconnect'] = self.get_packet_details(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x25')
        
        # GSM RACH
        rach_attempts = self.count_packets(pcap_file, 'gsm_a.rach')
        self.event_details['rach_attempts'] = self.get_packet_details(pcap_file, 'gsm_a.rach')
        
        # Call Control
        call_setup = self.count_packets(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x05')
        call_connect = self.count_packets(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x0f')
        call_disconnect = self.count_packets(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x25')
        self.event_details['call_setup'] = self.get_packet_details(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x05')
        self.event_details['call_connect'] = self.get_packet_details(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x0f')
        self.event_details['call_disconnect'] = self.get_packet_details(pcap_file, 'gsm_a.dtap.msg_cc_type == 0x25')
        
        # NEW KPIs - LTE Measurement Reports (handover preparation)
        lte_meas_report = self.count_packets(pcap_file, 'lte-rrc.measurementReport_element')
        self.event_details['lte_meas_report'] = self.get_packet_details(pcap_file, 'lte-rrc.measurementReport_element')
        
        # NEW KPIs - LTE Handovers
        lte_ho_cmd = self.count_packets(pcap_file, 'lte-rrc.mobilityFromEUTRACommand_element')
        lte_ho_complete = self.count_packets(pcap_file, 'lte-rrc.rrcConnectionReconfigurationComplete_element')
        self.event_details['lte_ho_cmd'] = self.get_packet_details(pcap_file, 'lte-rrc.mobilityFromEUTRACommand_element')
        self.event_details['lte_ho_complete'] = self.get_packet_details(pcap_file, 'lte-rrc.rrcConnectionReconfigurationComplete_element')
        
        # NEW KPIs - WCDMA Active Set Update (soft handover)
        wcdma_asu_cmd = self.count_packets(pcap_file, 'rrc.activeSetUpdate_element')
        wcdma_asu_complete = self.count_packets(pcap_file, 'rrc.activeSetUpdateComplete_element')
        self.event_details['wcdma_asu_cmd'] = self.get_packet_details(pcap_file, 'rrc.activeSetUpdate_element')
        self.event_details['wcdma_asu_complete'] = self.get_packet_details(pcap_file, 'rrc.activeSetUpdateComplete_element')
        
        # NEW KPIs - WCDMA Cell Reselection
        wcdma_cell_update = self.count_packets(pcap_file, 'rrc.cellUpdate_element')
        wcdma_cell_update_confirm = self.count_packets(pcap_file, 'rrc.cellUpdateConfirm_element')
        self.event_details['wcdma_cell_update'] = self.get_packet_details(pcap_file, 'rrc.cellUpdate_element')
        self.event_details['wcdma_cell_update_confirm'] = self.get_packet_details(pcap_file, 'rrc.cellUpdateConfirm_element')
        
        # NEW KPIs - 3G PDP Context (data session)
        pdp_req = self.count_packets(pcap_file, 'gsm_a.gm.sm.msg_type == 0x41')  # Activate PDP Context Request
        pdp_acc = self.count_packets(pcap_file, 'gsm_a.gm.sm.msg_type == 0x42')  # Activate PDP Context Accept
        self.event_details['pdp_req'] = self.get_packet_details(pcap_file, 'gsm_a.gm.sm.msg_type == 0x41')
        self.event_details['pdp_acc'] = self.get_packet_details(pcap_file, 'gsm_a.gm.sm.msg_type == 0x42')
        
        # NEW KPIs - Security Mode Command/Complete
        lte_sec_cmd = self.count_packets(pcap_file, 'lte-rrc.securityModeCommand_element')
        lte_sec_complete = self.count_packets(pcap_file, 'lte-rrc.securityModeComplete_element')
        wcdma_sec_cmd = self.count_packets(pcap_file, 'rrc.securityModeCommand_element')
        wcdma_sec_complete = self.count_packets(pcap_file, 'rrc.securityModeComplete_element')
        self.event_details['lte_sec_cmd'] = self.get_packet_details(pcap_file, 'lte-rrc.securityModeCommand_element')
        self.event_details['lte_sec_complete'] = self.get_packet_details(pcap_file, 'lte-rrc.securityModeComplete_element')
        self.event_details['wcdma_sec_cmd'] = self.get_packet_details(pcap_file, 'rrc.securityModeCommand_element')
        self.event_details['wcdma_sec_complete'] = self.get_packet_details(pcap_file, 'rrc.securityModeComplete_element')
        
        # NEW KPIs - 3G/4G Location/Routing Area Update
        lte_location_update = self.count_packets(pcap_file, 'gsm_a.dtap.msg_mm_type == 0x08')  # Location Update Request
        wcdma_rau_req = self.count_packets(pcap_file, 'gsm_a.gm.gmm.msg_type == 0x08')  # Routing Area Update Request
        wcdma_rau_acc = self.count_packets(pcap_file, 'gsm_a.gm.gmm.msg_type == 0x09')  # Routing Area Update Accept
        self.event_details['lte_location_update'] = self.get_packet_details(pcap_file, 'gsm_a.dtap.msg_mm_type == 0x08')
        self.event_details['wcdma_rau_req'] = self.get_packet_details(pcap_file, 'gsm_a.gm.gmm.msg_type == 0x08')
        self.event_details['wcdma_rau_acc'] = self.get_packet_details(pcap_file, 'gsm_a.gm.gmm.msg_type == 0x09')
        
        # Calculate success rates
        self.kpis = {
            'lte_rrc_success': (lte_rrc_setup / max(lte_rrc_req, 1)) * 100,
            'lte_rrc_req': lte_rrc_req,
            'lte_rrc_setup': lte_rrc_setup,
            
            'lte_attach_success': (lte_attach_acc / max(lte_attach_req, 1)) * 100,
            'lte_attach_req': lte_attach_req,
            'lte_attach_acc': lte_attach_acc,
            
            'lte_tau_success': (lte_tau_acc / max(lte_tau_req, 1)) * 100,
            'lte_tau_req': lte_tau_req,
            'lte_tau_acc': lte_tau_acc,
            
            'lte_erab_setup': lte_erab_setup,
            
            'lte_pdn_success': (lte_pdn_acc / max(lte_pdn_req, 1)) * 100,
            'lte_pdn_req': lte_pdn_req,
            'lte_pdn_acc': lte_pdn_acc,
            
            'lte_service_success': (lte_service_acc / max(lte_service_req, 1)) * 100,
            'lte_service_req': lte_service_req,
            'lte_service_acc': lte_service_acc,
            
            'wcdma_rrc_success': (wcdma_rrc_setup / max(wcdma_rrc_req, 1)) * 100,
            'wcdma_rrc_req': wcdma_rrc_req,
            'wcdma_rrc_setup': wcdma_rrc_setup,
            
            'wcdma_rab_success': (wcdma_rab_complete / max(wcdma_rab_assign, 1)) * 100,
            'wcdma_rab_assign': wcdma_rab_assign,
            'wcdma_rab_complete': wcdma_rab_complete,
            
            'wcdma_ho_success': (wcdma_ho_complete / max(wcdma_ho_cmd, 1)) * 100,
            'wcdma_ho_cmd': wcdma_ho_cmd,
            'wcdma_ho_complete': wcdma_ho_complete,
            
            'call_success': (call_connect / max(call_setup, 1)) * 100,
            'call_setup': call_setup,
            'call_connect': call_connect,
            'call_disconnect': call_disconnect,
            'call_drop_rate': (call_disconnect / max(call_connect, 1)) * 100,
            
            'rach_attempts': rach_attempts,
            
            # NEW KPIs
            'lte_meas_report': lte_meas_report,
            'lte_ho_success': (lte_ho_complete / lte_ho_cmd * 100) if lte_ho_cmd > 0 else 0,
            'lte_ho_cmd': lte_ho_cmd,
            'lte_ho_complete': lte_ho_complete,
            
            'wcdma_asu_success': (wcdma_asu_complete / wcdma_asu_cmd * 100) if wcdma_asu_cmd > 0 else 0,
            'wcdma_asu_cmd': wcdma_asu_cmd,
            'wcdma_asu_complete': wcdma_asu_complete,
            
            'wcdma_cell_resel_success': (wcdma_cell_update_confirm / wcdma_cell_update * 100) if wcdma_cell_update > 0 else 0,
            'wcdma_cell_update': wcdma_cell_update,
            'wcdma_cell_update_confirm': wcdma_cell_update_confirm,
            
            'pdp_success': (pdp_acc / pdp_req * 100) if pdp_req > 0 else 0,
            'pdp_req': pdp_req,
            'pdp_acc': pdp_acc,
            
            'lte_sec_success': (lte_sec_complete / lte_sec_cmd * 100) if lte_sec_cmd > 0 else 0,
            'lte_sec_cmd': lte_sec_cmd,
            'lte_sec_complete': lte_sec_complete,
            
            'wcdma_sec_success': (wcdma_sec_complete / wcdma_sec_cmd * 100) if wcdma_sec_cmd > 0 else 0,
            'wcdma_sec_cmd': wcdma_sec_cmd,
            'wcdma_sec_complete': wcdma_sec_complete,
            
            'wcdma_rau_success': (wcdma_rau_acc / wcdma_rau_req * 100) if wcdma_rau_req > 0 else 0,
            'wcdma_rau_req': wcdma_rau_req,
            'wcdma_rau_acc': wcdma_rau_acc,
            'lte_location_update': lte_location_update,
        }
        
        total_procedures = sum([lte_rrc_req, lte_attach_req, lte_pdn_req, lte_service_req, 
                               wcdma_rrc_req, call_setup, pdp_req, wcdma_rau_req, 
                               lte_ho_cmd, wcdma_asu_cmd, wcdma_cell_update])
        logger.info(f"Analysis complete. Found {total_procedures} procedures")
        
    def get_report(self):
        """Generate text report"""
        runtime = time.time() - self.start_time
        
        return f"""
ACCURATE KPI CALCULATOR
============================================================

LTE (4G) KPIs:
  RRC Success Rate: {self.kpis.get('lte_rrc_success', 0):.2f}% [Target: >99%]
    Requests: {self.kpis.get('lte_rrc_req', 0)}, Setups: {self.kpis.get('lte_rrc_setup', 0)}
  
  Attach Success Rate: {self.kpis.get('lte_attach_success', 0):.2f}% [Target: >98%]
    Requests: {self.kpis.get('lte_attach_req', 0)}, Accepts: {self.kpis.get('lte_attach_acc', 0)}
  
  TAU Success Rate: {self.kpis.get('lte_tau_success', 0):.2f}% [Target: >99%]
    Requests: {self.kpis.get('lte_tau_req', 0)}, Accepts: {self.kpis.get('lte_tau_acc', 0)}
  
  E-RAB Setups: {self.kpis.get('lte_erab_setup', 0)} (after {self.kpis.get('lte_rrc_setup', 0)} RRC setups)
  
  PDN Connectivity Success: {self.kpis.get('lte_pdn_success', 0):.2f}% [Target: >98%]
    Requests: {self.kpis.get('lte_pdn_req', 0)}, Accepts: {self.kpis.get('lte_pdn_acc', 0)}
  
  Service Request Success: {self.kpis.get('lte_service_success', 0):.2f}% [Target: >95%]
    Requests: {self.kpis.get('lte_service_req', 0)}, Accepts: {self.kpis.get('lte_service_acc', 0)}
  
  Handover Success Rate: {self.kpis.get('lte_ho_success', 0):.2f}% [Target: >98%]
    Commands: {self.kpis.get('lte_ho_cmd', 0)}, Completes: {self.kpis.get('lte_ho_complete', 0)}
  
  Measurement Reports: {self.kpis.get('lte_meas_report', 0)}
  
  Security Mode Success: {self.kpis.get('lte_sec_success', 0):.2f}% [Target: >99%]
    Commands: {self.kpis.get('lte_sec_cmd', 0)}, Completes: {self.kpis.get('lte_sec_complete', 0)}

WCDMA (3G) KPIs:
  RRC Success Rate: {self.kpis.get('wcdma_rrc_success', 0):.2f}% [Target: >99%]
    Requests: {self.kpis.get('wcdma_rrc_req', 0)}, Setups: {self.kpis.get('wcdma_rrc_setup', 0)}
  
  RAB Assignment Success: {self.kpis.get('wcdma_rab_success', 0):.2f}% [Target: >98%]
    Assignments: {self.kpis.get('wcdma_rab_assign', 0)}, Completes: {self.kpis.get('wcdma_rab_complete', 0)}
  
  Handover Success Rate: {self.kpis.get('wcdma_ho_success', 0):.2f}% [Target: >98%]
    Commands: {self.kpis.get('wcdma_ho_cmd', 0)}, Completes: {self.kpis.get('wcdma_ho_complete', 0)}
  
  Active Set Update Success: {self.kpis.get('wcdma_asu_success', 0):.2f}% [Target: >98%]
    Commands: {self.kpis.get('wcdma_asu_cmd', 0)}, Completes: {self.kpis.get('wcdma_asu_complete', 0)}
  
  Cell Reselection Success: {self.kpis.get('wcdma_cell_resel_success', 0):.2f}% [Target: >95%]
    Updates: {self.kpis.get('wcdma_cell_update', 0)}, Confirms: {self.kpis.get('wcdma_cell_update_confirm', 0)}
  
  PDP Context Success: {self.kpis.get('pdp_success', 0):.2f}% [Target: >98%]
    Requests: {self.kpis.get('pdp_req', 0)}, Accepts: {self.kpis.get('pdp_acc', 0)}
  
  Routing Area Update Success: {self.kpis.get('wcdma_rau_success', 0):.2f}% [Target: >99%]
    Requests: {self.kpis.get('wcdma_rau_req', 0)}, Accepts: {self.kpis.get('wcdma_rau_acc', 0)}
  
  Security Mode Success: {self.kpis.get('wcdma_sec_success', 0):.2f}% [Target: >99%]
    Commands: {self.kpis.get('wcdma_sec_cmd', 0)}, Completes: {self.kpis.get('wcdma_sec_complete', 0)}

Call Control (All RATs):
  Call Success Rate: {self.kpis.get('call_success', 0):.2f}% [Target: >95%]
    Setups: {self.kpis.get('call_setup', 0)}, Connects: {self.kpis.get('call_connect', 0)}
  
  Call Drop Rate: {self.kpis.get('call_drop_rate', 0):.2f}% [Target: <2%]
    Disconnects: {self.kpis.get('call_disconnect', 0)} (after {self.kpis.get('call_connect', 0)} connects)

GSM (2G):
  RACH Attempts: {self.kpis.get('rach_attempts', 0)}

Runtime: {runtime:.1f}s
"""

calc = SimpleKPICalculator()

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain; version=0.0.4')
            self.end_headers()
            metrics = self.get_prometheus_metrics()
            self.wfile.write(metrics.encode())
        elif self.path == '/debug':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(calc.get_report().encode())
        elif self.path == '/statistics':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            stats = self.get_detailed_statistics()
            self.wfile.write(json.dumps(stats, indent=2).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def get_detailed_statistics(self):
        """Generate detailed statistics with all KPI breakdowns"""
        return MetricsHandler.get_detailed_statistics_static()
    
    @staticmethod
    def get_detailed_statistics_static():
        """Generate detailed statistics with all KPI breakdowns"""
        runtime = time.time() - calc.start_time
        return {
            'timestamp': time.time(),
            'runtime_seconds': round(runtime, 1),
            'lte': {
                'rrc': {
                    'success_rate': round(calc.kpis.get('lte_rrc_success', 0), 2),
                    'requests': calc.kpis.get('lte_rrc_req', 0),
                    'setups': calc.kpis.get('lte_rrc_setup', 0),
                    'failures': calc.kpis.get('lte_rrc_req', 0) - calc.kpis.get('lte_rrc_setup', 0),
                    'events': {
                        'requests': calc.event_details.get('lte_rrc_req', []),
                        'setups': calc.event_details.get('lte_rrc_setup', [])
                    }
                },
                'attach': {
                    'success_rate': round(calc.kpis.get('lte_attach_success', 0), 2),
                    'requests': calc.kpis.get('lte_attach_req', 0),
                    'accepts': calc.kpis.get('lte_attach_acc', 0),
                    'failures': calc.kpis.get('lte_attach_req', 0) - calc.kpis.get('lte_attach_acc', 0),
                    'events': {
                        'requests': calc.event_details.get('lte_attach_req', []),
                        'accepts': calc.event_details.get('lte_attach_acc', [])
                    }
                },
                'tau': {
                    'success_rate': round(calc.kpis.get('lte_tau_success', 0), 2),
                    'requests': calc.kpis.get('lte_tau_req', 0),
                    'accepts': calc.kpis.get('lte_tau_acc', 0),
                    'failures': calc.kpis.get('lte_tau_req', 0) - calc.kpis.get('lte_tau_acc', 0),
                    'events': {
                        'requests': calc.event_details.get('lte_tau_req', []),
                        'accepts': calc.event_details.get('lte_tau_acc', [])
                    }
                },
                'erab': {
                    'setups': calc.kpis.get('lte_erab_setup', 0),
                    'events': {
                        'setups': calc.event_details.get('lte_erab_setup', [])
                    }
                },
                'pdn': {
                    'success_rate': round(calc.kpis.get('lte_pdn_success', 0), 2),
                    'requests': calc.kpis.get('lte_pdn_req', 0),
                    'accepts': calc.kpis.get('lte_pdn_acc', 0),
                    'failures': calc.kpis.get('lte_pdn_req', 0) - calc.kpis.get('lte_pdn_acc', 0),
                    'events': {
                        'requests': calc.event_details.get('lte_pdn_req', []),
                        'accepts': calc.event_details.get('lte_pdn_acc', [])
                    }
                },
                'service': {
                    'success_rate': round(calc.kpis.get('lte_service_success', 0), 2),
                    'requests': calc.kpis.get('lte_service_req', 0),
                    'accepts': calc.kpis.get('lte_service_acc', 0),
                    'failures': calc.kpis.get('lte_service_req', 0) - calc.kpis.get('lte_service_acc', 0),
                    'events': {
                        'requests': calc.event_details.get('lte_service_req', []),
                        'accepts': calc.event_details.get('lte_service_acc', [])
                    }
                }
            },
            'wcdma': {
                'rrc': {
                    'success_rate': round(calc.kpis.get('wcdma_rrc_success', 0), 2),
                    'requests': calc.kpis.get('wcdma_rrc_req', 0),
                    'setups': calc.kpis.get('wcdma_rrc_setup', 0),
                    'failures': calc.kpis.get('wcdma_rrc_req', 0) - calc.kpis.get('wcdma_rrc_setup', 0),
                    'events': {
                        'requests': calc.event_details.get('wcdma_rrc_req', []),
                        'setups': calc.event_details.get('wcdma_rrc_setup', [])
                    }
                },
                'rab': {
                    'success_rate': round(calc.kpis.get('wcdma_rab_success', 0), 2),
                    'assignments': calc.kpis.get('wcdma_rab_assign', 0),
                    'completes': calc.kpis.get('wcdma_rab_complete', 0),
                    'failures': calc.kpis.get('wcdma_rab_assign', 0) - calc.kpis.get('wcdma_rab_complete', 0),
                    'events': {
                        'assignments': calc.event_details.get('wcdma_rab_assign', []),
                        'completes': calc.event_details.get('wcdma_rab_complete', [])
                    }
                },
                'handover': {
                    'success_rate': round(calc.kpis.get('wcdma_ho_success', 0), 2),
                    'commands': calc.kpis.get('wcdma_ho_cmd', 0),
                    'completes': calc.kpis.get('wcdma_ho_complete', 0),
                    'failures': calc.kpis.get('wcdma_ho_cmd', 0) - calc.kpis.get('wcdma_ho_complete', 0),
                    'events': {
                        'commands': calc.event_details.get('wcdma_ho_cmd', []),
                        'completes': calc.event_details.get('wcdma_ho_complete', [])
                    }
                },
                'active_set_update': {
                    'success_rate': round(calc.kpis.get('wcdma_asu_success', 0), 2),
                    'commands': calc.kpis.get('wcdma_asu_cmd', 0),
                    'completes': calc.kpis.get('wcdma_asu_complete', 0),
                    'events': {
                        'commands': calc.event_details.get('wcdma_asu_cmd', []),
                        'completes': calc.event_details.get('wcdma_asu_complete', [])
                    }
                },
                'cell_reselection': {
                    'success_rate': round(calc.kpis.get('wcdma_cell_resel_success', 0), 2),
                    'updates': calc.kpis.get('wcdma_cell_update', 0),
                    'confirms': calc.kpis.get('wcdma_cell_update_confirm', 0),
                    'events': {
                        'updates': calc.event_details.get('wcdma_cell_update', []),
                        'confirms': calc.event_details.get('wcdma_cell_update_confirm', [])
                    }
                },
                'pdp_context': {
                    'success_rate': round(calc.kpis.get('pdp_success', 0), 2),
                    'requests': calc.kpis.get('pdp_req', 0),
                    'accepts': calc.kpis.get('pdp_acc', 0),
                    'events': {
                        'requests': calc.event_details.get('pdp_req', []),
                        'accepts': calc.event_details.get('pdp_acc', [])
                    }
                },
                'routing_area_update': {
                    'success_rate': round(calc.kpis.get('wcdma_rau_success', 0), 2),
                    'requests': calc.kpis.get('wcdma_rau_req', 0),
                    'accepts': calc.kpis.get('wcdma_rau_acc', 0),
                    'events': {
                        'requests': calc.event_details.get('wcdma_rau_req', []),
                        'accepts': calc.event_details.get('wcdma_rau_acc', [])
                    }
                },
                'security_mode': {
                    'success_rate': round(calc.kpis.get('wcdma_sec_success', 0), 2),
                    'commands': calc.kpis.get('wcdma_sec_cmd', 0),
                    'completes': calc.kpis.get('wcdma_sec_complete', 0),
                    'events': {
                        'commands': calc.event_details.get('wcdma_sec_cmd', []),
                        'completes': calc.event_details.get('wcdma_sec_complete', [])
                    }
                }
            },
            'lte_additional': {
                'handover': {
                    'success_rate': round(calc.kpis.get('lte_ho_success', 0), 2),
                    'commands': calc.kpis.get('lte_ho_cmd', 0),
                    'completes': calc.kpis.get('lte_ho_complete', 0),
                    'events': {
                        'commands': calc.event_details.get('lte_ho_cmd', []),
                        'completes': calc.event_details.get('lte_ho_complete', [])
                    }
                },
                'measurement_reports': calc.kpis.get('lte_meas_report', 0),
                'security_mode': {
                    'success_rate': round(calc.kpis.get('lte_sec_success', 0), 2),
                    'commands': calc.kpis.get('lte_sec_cmd', 0),
                    'completes': calc.kpis.get('lte_sec_complete', 0),
                    'events': {
                        'commands': calc.event_details.get('lte_sec_cmd', []),
                        'completes': calc.event_details.get('lte_sec_complete', [])
                    }
                }
            },
            'call_control': {
                'success_rate': round(calc.kpis.get('call_success', 0), 2),
                'setups': calc.kpis.get('call_setup', 0),
                'connects': calc.kpis.get('call_connect', 0),
                'disconnects': calc.kpis.get('call_disconnect', 0),
                'drop_rate': round(calc.kpis.get('call_drop_rate', 0), 2),
                'failures': calc.kpis.get('call_setup', 0) - calc.kpis.get('call_connect', 0),
                'events': {
                    'setups': calc.event_details.get('call_setup', []),
                    'connects': calc.event_details.get('call_connect', []),
                    'disconnects': calc.event_details.get('call_disconnect', [])
                }
            },
            'gsm': {
                'rach_attempts': calc.kpis.get('rach_attempts', 0),
                'events': {
                    'rach': calc.event_details.get('rach_attempts', [])
                }
            }
        }
    
    def get_prometheus_metrics(self):
        """Generate Prometheus format metrics from statistics data"""
        stats = self.get_detailed_statistics_static()
        lines = []
        
        # LTE KPIs
        lines.append("# TYPE scat_lte_rrc_success_rate gauge")
        lines.append(f"scat_lte_rrc_success_rate {stats['lte']['rrc']['success_rate']}")
        
        lines.append("# TYPE scat_lte_attach_success_rate gauge")
        lines.append(f"scat_lte_attach_success_rate {stats['lte']['attach']['success_rate']}")
        
        lines.append("# TYPE scat_lte_tau_success_rate gauge")
        lines.append(f"scat_lte_tau_success_rate {stats['lte']['tau']['success_rate']}")
        
        lines.append("# TYPE scat_lte_erab_setups counter")
        lines.append(f"scat_lte_erab_setups {stats['lte']['erab']['setups']}")
        
        lines.append("# TYPE scat_lte_pdn_success_rate gauge")
        lines.append(f"scat_lte_pdn_success_rate {stats['lte']['pdn']['success_rate']}")
        
        lines.append("# TYPE scat_lte_service_success_rate gauge")
        lines.append(f"scat_lte_service_success_rate {stats['lte']['service']['success_rate']}")
        
        lines.append("# TYPE scat_lte_handover_success_rate gauge")
        lines.append(f"scat_lte_handover_success_rate {stats['lte_additional']['handover']['success_rate']}")
        
        lines.append("# TYPE scat_lte_security_success_rate gauge")
        lines.append(f"scat_lte_security_success_rate {stats['lte_additional']['security_mode']['success_rate']}")
        
        lines.append("# TYPE scat_lte_measurement_reports counter")
        lines.append(f"scat_lte_measurement_reports {stats['lte_additional']['measurement_reports']}")
        
        # WCDMA KPIs
        lines.append("# TYPE scat_wcdma_rrc_success_rate gauge")
        lines.append(f"scat_wcdma_rrc_success_rate {stats['wcdma']['rrc']['success_rate']}")
        
        lines.append("# TYPE scat_wcdma_rab_success_rate gauge")
        lines.append(f"scat_wcdma_rab_success_rate {stats['wcdma']['rab']['success_rate']}")
        
        lines.append("# TYPE scat_wcdma_handover_success_rate gauge")
        lines.append(f"scat_wcdma_handover_success_rate {stats['wcdma']['handover']['success_rate']}")
        
        lines.append("# TYPE scat_wcdma_asu_success_rate gauge")
        lines.append(f"scat_wcdma_asu_success_rate {stats['wcdma']['active_set_update']['success_rate']}")
        
        lines.append("# TYPE scat_wcdma_cell_resel_success_rate gauge")
        lines.append(f"scat_wcdma_cell_resel_success_rate {stats['wcdma']['cell_reselection']['success_rate']}")
        
        lines.append("# TYPE scat_wcdma_pdp_success_rate gauge")
        lines.append(f"scat_wcdma_pdp_success_rate {stats['wcdma']['pdp_context']['success_rate']}")
        
        lines.append("# TYPE scat_wcdma_rau_success_rate gauge")
        lines.append(f"scat_wcdma_rau_success_rate {stats['wcdma']['routing_area_update']['success_rate']}")
        
        lines.append("# TYPE scat_wcdma_security_success_rate gauge")
        lines.append(f"scat_wcdma_security_success_rate {stats['wcdma']['security_mode']['success_rate']}")
        
        # Call Control KPIs
        lines.append("# TYPE scat_call_success_rate gauge")
        lines.append(f"scat_call_success_rate {stats['call_control']['success_rate']}")
        
        lines.append("# TYPE scat_lte_call_drop_rate gauge")
        lines.append(f"scat_lte_call_drop_rate {stats['call_control']['drop_rate']}")
        
        lines.append("# TYPE scat_call_disconnects counter")
        lines.append(f"scat_call_disconnects {stats['call_control']['disconnects']}")
        
        # GSM KPIs
        lines.append("# TYPE scat_gsm_rach_attempts counter")
        lines.append(f"scat_gsm_rach_attempts {stats['gsm']['rach_attempts']}")
        
        # Total procedures
        total = stats['lte']['rrc']['requests'] + stats['wcdma']['rrc']['requests'] + stats['call_control']['setups']
        lines.append("# TYPE scat_total_procedures counter")
        lines.append(f"scat_total_procedures {total}")
        
        return '\n'.join(lines) + '\n'
    
    def log_message(self, format, *args):
        pass

# Global flag for graceful shutdown
shutdown_flag = False
server_instance = None

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global shutdown_flag, server_instance
    shutdown_flag = True
    logger.info("Received shutdown signal, cleaning up...")
    if server_instance:
        server_instance.shutdown()
    sys.exit(0)

if __name__ == '__main__':
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    logger.info("=" * 60)
    logger.info("ACCURATE KPI CALCULATOR")
    logger.info("=" * 60)
    
    # Start HTTP server
    server_instance = HTTPServer(('127.0.0.1', 9100), MetricsHandler)
    server_thread = threading.Thread(target=server_instance.serve_forever, daemon=True)
    server_thread.start()
    
    logger.info(f"✓ Metrics: http://localhost:9100/metrics")
    logger.info(f"✓ Statistics: http://localhost:9100/statistics")
    logger.info(f"✓ Debug: http://localhost:9100/debug")
    
    # Check if file provided
    if len(sys.argv) >= 2:
        pcap_file = sys.argv[1]
        
        # Check if --live flag for continuous monitoring
        live_mode = '--live' in sys.argv
        
        if live_mode:
            # Live monitoring mode: re-analyze file every 5 seconds
            logger.info(f"✓ Live monitoring: {pcap_file}")
            logger.info("  (Re-analyzing every 5 seconds)")
            
            # Setup statistics directory
            stats_dir = os.path.join(os.path.dirname(os.path.dirname(pcap_file)), 'statistics')
            os.makedirs(stats_dir, exist_ok=True)
            capture_name = os.path.splitext(os.path.basename(pcap_file))[0]
            
            try:
                while True:
                    if os.path.exists(pcap_file):
                        try:
                            calc.analyze(pcap_file)
                            logger.info(f"✓ Updated KPIs from {pcap_file}")
                            
                            # Save statistics during live monitoring
                            timestamp_str = time.strftime('%Y%m%d_%H%M%S')
                            stats_filename = f"KPI_Stats_{capture_name}_live.json"
                            stats_path = os.path.join(stats_dir, stats_filename)
                            
                            stats_data = MetricsHandler.get_detailed_statistics_static()
                            stats_data['capture_file'] = pcap_file
                            stats_data['capture_name'] = capture_name
                            stats_data['live_mode'] = True
                            
                            with open(stats_path, 'w') as f:
                                json.dump(stats_data, f, indent=2)
                            
                        except Exception as e:
                            logger.error(f"Error analyzing: {e}")
                    time.sleep(5)
            except KeyboardInterrupt:
                logger.info("\nStopping live monitoring...")
                # Save final statistics
                timestamp_str = time.strftime('%Y%m%d_%H%M%S')
                stats_filename = f"KPI_Stats_{capture_name}_{timestamp_str}.json"
                stats_path = os.path.join(stats_dir, stats_filename)
                
                stats_data = MetricsHandler.get_detailed_statistics_static()
                stats_data['capture_file'] = pcap_file
                stats_data['capture_name'] = capture_name
                stats_data['live_mode'] = False
                
                with open(stats_path, 'w') as f:
                    json.dump(stats_data, f, indent=2)
                
                logger.info(f"✓ Final statistics saved: {stats_path}")
        else:
            # Post-processing mode: analyze once
            logger.info(f"✓ Processing file: {pcap_file}")
            
            # Analyze file
            calc.analyze(pcap_file)
            
            # Save statistics to file
            stats_dir = os.path.join(os.path.dirname(os.path.dirname(pcap_file)), 'statistics')
            os.makedirs(stats_dir, exist_ok=True)
            
            capture_name = os.path.splitext(os.path.basename(pcap_file))[0]
            timestamp_str = time.strftime('%Y%m%d_%H%M%S')
            stats_filename = f"KPI_Stats_{capture_name}_{timestamp_str}.json"
            stats_path = os.path.join(stats_dir, stats_filename)
            
            # Get statistics without instantiating handler
            stats_data = MetricsHandler.get_detailed_statistics_static()
            stats_data['capture_file'] = pcap_file
            stats_data['capture_name'] = capture_name
            
            with open(stats_path, 'w') as f:
                json.dump(stats_data, f, indent=2)
            
            logger.info(f"✓ Statistics saved: {stats_path}")
            logger.info("File processing complete. Server running for metrics access.")
            logger.info("Press Ctrl+C to stop.")
            
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("\nStopping...")
    else:
        # No file: just run server (for manual testing)
        logger.info("✓ Server mode: Waiting for HTTP requests...")
        logger.info("  Usage: python3 kpi_calculator_comprehensive.py <file.pcapng> [--live]")
        logger.info("Press Ctrl+C to stop.")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("\nStopping...")
