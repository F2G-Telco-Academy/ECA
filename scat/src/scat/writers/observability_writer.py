#!/usr/bin/env python3
"""Writer that wraps existing writers and adds observability with Wireshark-level protocol analysis"""

from typing import List, Dict, Optional
from ..logger import StructuredLogger
from ..metrics import MetricsCollector
from ..kpi_extractor import KPIExtractor
from ..telecom_parser import TelecomMessageParser
from ..protocol_correlator import ProtocolMessageCorrelator
import json
import time
from datetime import datetime

class ObservabilityWriter:
    """Wraps any writer and adds logging, metrics, KPI extraction, and Wireshark-level protocol analysis"""
    
    def __init__(self, base_writer):
        self.base_writer = base_writer
        self.logger = StructuredLogger()
        self.metrics = MetricsCollector()
        self.kpi_extractor = KPIExtractor()
        self.telecom_parser = TelecomMessageParser()
        self.protocol_correlator = ProtocolMessageCorrelator()
        
        # Start metrics server
        self.metrics.start_server()
        self.logger.info("Observability writer with Wireshark-level protocol correlator initialized")
    
    def __enter__(self):
        return self
    
    def write_cp(self, sock_content, radio_id=0, ts=None):
        """Write control plane packet with Wireshark-level observability"""
        # Update basic metrics
        self.metrics.increment('packets_captured')
        self.metrics.increment('bytes_captured', len(sock_content))
        
        # Convert packet to string for analysis
        try:
            packet_str = str(sock_content)
            timestamp = ts or time.time()
            
            # Wireshark-level protocol analysis
            protocol_analysis = self.protocol_correlator.analyze_protocol_message(
                raw_message=packet_str,
                packet_data=sock_content,
                timestamp=timestamp
            )
            
            # Log Wireshark-level details for KPI drill-down
            protocol_log_entry = {
                'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                'level': 'INFO',
                'source': 'SCAT_PROTOCOL_CORRELATOR',
                'message': f"{protocol_analysis['message_type']} | {protocol_analysis['direction']['source_node']} → {protocol_analysis['direction']['destination_node']}",
                'protocol_analysis': protocol_analysis,
                'kpi_tags': '|'.join([f"kpi:{kpi.lower()}" for kpi in protocol_analysis['related_kpis']]),
                'search_tags': '|'.join(protocol_analysis['tags']),
                'raw_message': packet_str[:500] + '...' if len(packet_str) > 500 else packet_str
            }
            
            # Write to protocol analysis log file
            import os
            log_dir = os.path.join(os.getcwd(), 'logs')
            os.makedirs(log_dir, exist_ok=True)
            
            with open(f'{log_dir}/protocol_analysis.log', 'a') as f:
                f.write(json.dumps(protocol_log_entry) + '\n')
            
            # Also log to structured logger
            self.logger.info("Protocol message analyzed", **{
                'message_type': protocol_analysis['message_type'],
                'procedure': protocol_analysis['procedure'],
                'direction': protocol_analysis['direction']['link_direction'],
                'source_node': protocol_analysis['direction']['source_node'],
                'dest_node': protocol_analysis['direction']['destination_node'],
                'related_kpis': '|'.join(protocol_analysis['related_kpis']),
                'kpi_tags': '|'.join([f"kpi:{kpi.lower()}" for kpi in protocol_analysis['related_kpis']]),
                'search_tags': '|'.join(protocol_analysis['tags']),
                'radio_id': radio_id,
                'timestamp': timestamp
            })
            
            # Parse telecom-specific messages (existing functionality)
            telecom_msg = self.telecom_parser.parse_message(packet_str)
            if telecom_msg:
                # Update telecom-specific metrics
                msg_type = telecom_msg['message_type']
                self.metrics.increment(f'telecom_messages_{msg_type.lower()}')
                
                if telecom_msg['measurements']:
                    for metric, value in telecom_msg['measurements'].items():
                        self.metrics.set(f'telecom_{metric}', value)
            
            # Extract KPIs from packet data (existing functionality)
            self.kpi_extractor.parse_measurement_report(packet_str)
            self.kpi_extractor.parse_rrc_connection(packet_str)
            self.kpi_extractor.parse_rach(packet_str)
            self.kpi_extractor.parse_handover(packet_str)
            self.kpi_extractor.parse_erab(packet_str)
            
            # Update protocol-level metrics
            if protocol_analysis['related_kpis']:
                for kpi in protocol_analysis['related_kpis']:
                    self.metrics.increment(f'kpi_messages_{kpi.lower()}')
            
        except Exception as e:
            self.logger.error("Error in Wireshark-level protocol analysis", error=str(e))
        
        # Write to base writer
        self.base_writer.write_cp(sock_content, radio_id, ts)
    
    def write_up(self, sock_content, radio_id=0, ts=None):
        """Write user plane packet with observability"""
        self.metrics.increment('packets_captured')
        self.metrics.increment('bytes_captured', len(sock_content))
        
        self.logger.debug("User plane packet",
                         size=len(sock_content),
                         radio_id=radio_id)
        
        self.base_writer.write_up(sock_content, radio_id, ts)
    
    def get_kpi_drill_down(self, kpi_name: str, time_range: tuple = None) -> List[Dict]:
        """Get all protocol messages related to a specific KPI for drill-down analysis"""
        return self.protocol_correlator.get_messages_for_kpi(kpi_name, time_range)
    
    def __exit__(self, exc_type, exc_value, traceback):
        # Log final KPIs
        kpis = self.kpi_extractor.calculate_kpis()
        self.logger.info("Session KPIs", **kpis)
        
        # Log telecom message statistics
        telecom_metrics = self.telecom_parser.get_metrics()
        self.logger.info("Telecom message statistics", **telecom_metrics)
        
        # Log protocol correlation summary
        correlation_summary = self.protocol_correlator.get_correlation_summary()
        self.logger.info("Protocol correlation summary", **correlation_summary)
        
        # Update metrics with KPIs
        self.metrics.set('rrc_success_rate', kpis.get('rrc_success_rate', 0))
        self.metrics.set('handover_success_rate', kpis.get('handover_success_rate', 0))
        
        if hasattr(self.base_writer, '__exit__'):
            self.base_writer.__exit__(exc_type, exc_value, traceback)
