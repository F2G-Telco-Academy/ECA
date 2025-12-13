#!/usr/bin/env python3
"""
KPI Calculator for Railway - Receives metrics via HTTP POST
Exposes aggregated KPIs via Prometheus /metrics endpoint
"""

import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST
from collections import defaultdict
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# LTE KPIs
lte_rrc_attempts = Gauge('scat_lte_rrc_attempts', 'LTE RRC Attempts', ['rat'])
lte_rrc_success = Gauge('scat_lte_rrc_success', 'LTE RRC Successes', ['rat'])
lte_rrc_success_rate = Gauge('scat_lte_rrc_success_rate', 'LTE RRC Success Rate (%)', ['rat'])

lte_attach_attempts = Gauge('scat_lte_attach_attempts', 'LTE Attach Attempts', ['rat'])
lte_attach_success = Gauge('scat_lte_attach_success', 'LTE Attach Successes', ['rat'])
lte_attach_success_rate = Gauge('scat_lte_attach_success_rate', 'LTE Attach Success Rate (%)', ['rat'])

lte_tau_attempts = Gauge('scat_lte_tau_attempts', 'LTE TAU Attempts', ['rat'])
lte_tau_success = Gauge('scat_lte_tau_success', 'LTE TAU Successes', ['rat'])
lte_tau_success_rate = Gauge('scat_lte_tau_success_rate', 'LTE TAU Success Rate (%)', ['rat'])

lte_erab_attempts = Gauge('scat_lte_erab_attempts', 'LTE E-RAB Attempts', ['rat'])
lte_erab_success = Gauge('scat_lte_erab_success', 'LTE E-RAB Successes', ['rat'])
lte_erab_success_rate = Gauge('scat_lte_erab_success_rate', 'LTE E-RAB Success Rate (%)', ['rat'])

lte_rach_attempts = Gauge('scat_lte_rach_attempts', 'LTE RACH Attempts', ['rat'])
lte_rach_success = Gauge('scat_lte_rach_success', 'LTE RACH Successes', ['rat'])
lte_rach_success_rate = Gauge('scat_lte_rach_success_rate', 'LTE RACH Success Rate (%)', ['rat'])

lte_ho_attempts = Gauge('scat_lte_ho_attempts', 'LTE Handover Attempts', ['rat'])
lte_ho_success = Gauge('scat_lte_ho_success', 'LTE Handover Successes', ['rat'])
lte_ho_success_rate = Gauge('scat_lte_handover_success_rate', 'LTE Handover Success Rate (%)', ['rat'])

lte_call_attempts = Gauge('scat_lte_call_attempts', 'LTE Call Attempts', ['rat'])
lte_call_success = Gauge('scat_lte_call_success', 'LTE Call Successes', ['rat'])
lte_call_success_rate = Gauge('scat_lte_call_success_rate', 'LTE Call Success Rate (%)', ['rat'])

lte_call_drops = Gauge('scat_lte_call_drops', 'LTE Call Drops', ['rat'])
lte_call_drop_rate = Gauge('scat_lte_call_drop_rate', 'LTE Call Drop Rate (%)', ['rat'])

# WCDMA KPIs
wcdma_rrc_attempts = Gauge('scat_wcdma_rrc_attempts', 'WCDMA RRC Attempts', ['rat'])
wcdma_rrc_success = Gauge('scat_wcdma_rrc_success', 'WCDMA RRC Successes', ['rat'])
wcdma_rrc_success_rate = Gauge('scat_wcdma_rrc_success_rate', 'WCDMA RRC Success Rate (%)', ['rat'])

wcdma_rab_attempts = Gauge('scat_wcdma_rab_attempts', 'WCDMA RAB Attempts', ['rat'])
wcdma_rab_success = Gauge('scat_wcdma_rab_success', 'WCDMA RAB Successes', ['rat'])
wcdma_rab_success_rate = Gauge('scat_wcdma_rab_success_rate', 'WCDMA RAB Success Rate (%)', ['rat'])

wcdma_call_attempts = Gauge('scat_wcdma_call_attempts', 'WCDMA Call Attempts', ['rat'])
wcdma_call_success = Gauge('scat_wcdma_call_success', 'WCDMA Call Successes', ['rat'])
wcdma_call_success_rate = Gauge('scat_wcdma_call_success_rate', 'WCDMA Call Success Rate (%)', ['rat'])

wcdma_ho_attempts = Gauge('scat_wcdma_ho_attempts', 'WCDMA Handover Attempts', ['rat'])
wcdma_ho_success = Gauge('scat_wcdma_ho_success', 'WCDMA Handover Successes', ['rat'])
wcdma_ho_success_rate = Gauge('scat_wcdma_handover_success_rate', 'WCDMA Handover Success Rate (%)', ['rat'])

# GSM KPIs
gsm_call_attempts = Gauge('scat_gsm_call_attempts', 'GSM Call Attempts', ['rat'])
gsm_call_success = Gauge('scat_gsm_call_success', 'GSM Call Successes', ['rat'])
gsm_call_success_rate = Gauge('scat_gsm_call_success_rate', 'GSM Call Success Rate (%)', ['rat'])

gsm_ho_attempts = Gauge('scat_gsm_ho_attempts', 'GSM Handover Attempts', ['rat'])
gsm_ho_success = Gauge('scat_gsm_ho_success', 'GSM Handover Successes', ['rat'])
gsm_ho_success_rate = Gauge('scat_gsm_handover_success_rate', 'GSM Handover Success Rate (%)', ['rat'])

# 5G NR KPIs
nr_rrc_attempts = Gauge('scat_nr_rrc_attempts', '5G NR RRC Attempts', ['rat'])
nr_rrc_success = Gauge('scat_nr_rrc_success', '5G NR RRC Successes', ['rat'])
nr_rrc_success_rate = Gauge('scat_nr_rrc_success_rate', '5G NR RRC Success Rate (%)', ['rat'])

nr_registration_attempts = Gauge('scat_nr_registration_attempts', '5G NR Registration Attempts', ['rat'])
nr_registration_success = Gauge('scat_nr_registration_success', '5G NR Registration Successes', ['rat'])
nr_registration_success_rate = Gauge('scat_nr_registration_success_rate', '5G NR Registration Success Rate (%)', ['rat'])

# Counters
counters = defaultdict(lambda: defaultdict(int))

def update_metrics():
    """Update Prometheus metrics from counters"""
    
    # LTE
    lte_rrc_attempts.labels(rat='LTE').set(counters['LTE']['rrc_attempts'])
    lte_rrc_success.labels(rat='LTE').set(counters['LTE']['rrc_success'])
    if counters['LTE']['rrc_attempts'] > 0:
        rate = (counters['LTE']['rrc_success'] / counters['LTE']['rrc_attempts']) * 100
        lte_rrc_success_rate.labels(rat='LTE').set(rate)
    
    lte_attach_attempts.labels(rat='LTE').set(counters['LTE']['attach_attempts'])
    lte_attach_success.labels(rat='LTE').set(counters['LTE']['attach_success'])
    if counters['LTE']['attach_attempts'] > 0:
        rate = (counters['LTE']['attach_success'] / counters['LTE']['attach_attempts']) * 100
        lte_attach_success_rate.labels(rat='LTE').set(rate)
    
    lte_tau_attempts.labels(rat='LTE').set(counters['LTE']['tau_attempts'])
    lte_tau_success.labels(rat='LTE').set(counters['LTE']['tau_success'])
    if counters['LTE']['tau_attempts'] > 0:
        rate = (counters['LTE']['tau_success'] / counters['LTE']['tau_attempts']) * 100
        lte_tau_success_rate.labels(rat='LTE').set(rate)
    
    lte_erab_attempts.labels(rat='LTE').set(counters['LTE']['erab_attempts'])
    lte_erab_success.labels(rat='LTE').set(counters['LTE']['erab_success'])
    if counters['LTE']['erab_attempts'] > 0:
        rate = (counters['LTE']['erab_success'] / counters['LTE']['erab_attempts']) * 100
        lte_erab_success_rate.labels(rat='LTE').set(rate)
    
    lte_rach_attempts.labels(rat='LTE').set(counters['LTE']['rach_attempts'])
    lte_rach_success.labels(rat='LTE').set(counters['LTE']['rach_success'])
    if counters['LTE']['rach_attempts'] > 0:
        rate = (counters['LTE']['rach_success'] / counters['LTE']['rach_attempts']) * 100
        lte_rach_success_rate.labels(rat='LTE').set(rate)
    
    lte_ho_attempts.labels(rat='LTE').set(counters['LTE']['ho_attempts'])
    lte_ho_success.labels(rat='LTE').set(counters['LTE']['ho_success'])
    if counters['LTE']['ho_attempts'] > 0:
        rate = (counters['LTE']['ho_success'] / counters['LTE']['ho_attempts']) * 100
        lte_ho_success_rate.labels(rat='LTE').set(rate)
    
    lte_call_attempts.labels(rat='LTE').set(counters['LTE']['call_attempts'])
    lte_call_success.labels(rat='LTE').set(counters['LTE']['call_success'])
    if counters['LTE']['call_attempts'] > 0:
        rate = (counters['LTE']['call_success'] / counters['LTE']['call_attempts']) * 100
        lte_call_success_rate.labels(rat='LTE').set(rate)
    
    lte_call_drops.labels(rat='LTE').set(counters['LTE']['call_drops'])
    if counters['LTE']['call_attempts'] > 0:
        rate = (counters['LTE']['call_drops'] / counters['LTE']['call_attempts']) * 100
        lte_call_drop_rate.labels(rat='LTE').set(rate)
    
    # WCDMA
    wcdma_rrc_attempts.labels(rat='WCDMA').set(counters['WCDMA']['rrc_attempts'])
    wcdma_rrc_success.labels(rat='WCDMA').set(counters['WCDMA']['rrc_success'])
    if counters['WCDMA']['rrc_attempts'] > 0:
        rate = (counters['WCDMA']['rrc_success'] / counters['WCDMA']['rrc_attempts']) * 100
        wcdma_rrc_success_rate.labels(rat='WCDMA').set(rate)
    
    wcdma_rab_attempts.labels(rat='WCDMA').set(counters['WCDMA']['rab_attempts'])
    wcdma_rab_success.labels(rat='WCDMA').set(counters['WCDMA']['rab_success'])
    if counters['WCDMA']['rab_attempts'] > 0:
        rate = (counters['WCDMA']['rab_success'] / counters['WCDMA']['rab_attempts']) * 100
        wcdma_rab_success_rate.labels(rat='WCDMA').set(rate)
    
    wcdma_call_attempts.labels(rat='WCDMA').set(counters['WCDMA']['call_attempts'])
    wcdma_call_success.labels(rat='WCDMA').set(counters['WCDMA']['call_success'])
    if counters['WCDMA']['call_attempts'] > 0:
        rate = (counters['WCDMA']['call_success'] / counters['WCDMA']['call_attempts']) * 100
        wcdma_call_success_rate.labels(rat='WCDMA').set(rate)
    
    wcdma_ho_attempts.labels(rat='WCDMA').set(counters['WCDMA']['ho_attempts'])
    wcdma_ho_success.labels(rat='WCDMA').set(counters['WCDMA']['ho_success'])
    if counters['WCDMA']['ho_attempts'] > 0:
        rate = (counters['WCDMA']['ho_success'] / counters['WCDMA']['ho_attempts']) * 100
        wcdma_ho_success_rate.labels(rat='WCDMA').set(rate)
    
    # GSM
    gsm_call_attempts.labels(rat='GSM').set(counters['GSM']['call_attempts'])
    gsm_call_success.labels(rat='GSM').set(counters['GSM']['call_success'])
    if counters['GSM']['call_attempts'] > 0:
        rate = (counters['GSM']['call_success'] / counters['GSM']['call_attempts']) * 100
        gsm_call_success_rate.labels(rat='GSM').set(rate)
    
    gsm_ho_attempts.labels(rat='GSM').set(counters['GSM']['ho_attempts'])
    gsm_ho_success.labels(rat='GSM').set(counters['GSM']['ho_success'])
    if counters['GSM']['ho_attempts'] > 0:
        rate = (counters['GSM']['ho_success'] / counters['GSM']['ho_attempts']) * 100
        gsm_ho_success_rate.labels(rat='GSM').set(rate)
    
    # 5G NR
    nr_rrc_attempts.labels(rat='NR').set(counters['NR']['rrc_attempts'])
    nr_rrc_success.labels(rat='NR').set(counters['NR']['rrc_success'])
    if counters['NR']['rrc_attempts'] > 0:
        rate = (counters['NR']['rrc_success'] / counters['NR']['rrc_attempts']) * 100
        nr_rrc_success_rate.labels(rat='NR').set(rate)
    
    nr_registration_attempts.labels(rat='NR').set(counters['NR']['registration_attempts'])
    nr_registration_success.labels(rat='NR').set(counters['NR']['registration_success'])
    if counters['NR']['registration_attempts'] > 0:
        rate = (counters['NR']['registration_success'] / counters['NR']['registration_attempts']) * 100
        nr_registration_success_rate.labels(rat='NR').set(rate)

class KPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            update_metrics()
            self.send_response(200)
            self.send_header('Content-Type', CONTENT_TYPE_LATEST)
            self.end_headers()
            self.wfile.write(generate_latest())
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'healthy'}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/kpi':
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode())
            
            # Update counters based on received KPI event
            rat = data.get('rat', 'LTE')
            event_type = data.get('event_type')
            
            if event_type:
                counters[rat][event_type] += 1
                logger.info(f"KPI event: {rat} - {event_type}")
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

if __name__ == '__main__':
    port = int(os.getenv('PORT', 9095))
    server = HTTPServer(('0.0.0.0', port), KPIHandler)
    logger.info(f'KPI Calculator running on http://0.0.0.0:{port}')
    logger.info(f'Metrics: http://0.0.0.0:{port}/metrics')
    logger.info(f'Health: http://0.0.0.0:{port}/health')
    logger.info(f'POST KPI events to: http://0.0.0.0:{port}/kpi')
    server.serve_forever()
