#!/usr/bin/env python3
"""
Protocol Message Correlator - Wireshark-level Analysis for KPI Drill-down
Captures detailed protocol stack information for each message like Wireshark
"""

import re
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

class ProtocolMessageCorrelator:
    """
    Correlates cellular messages with KPIs and provides Wireshark-level detail
    Enables drill-down from KPI values to see all related protocol messages
    """
    
    def __init__(self):
        self.message_store = []
        self.kpi_correlations = {}
        
    def analyze_protocol_message(self, raw_message: str, packet_data: bytes = None, 
                                timestamp: float = None) -> Dict:
        """
        Analyze protocol message with Wireshark-level detail
        """
        
        if timestamp is None:
            timestamp = time.time()
            
        # Extract protocol stack information
        protocol_stack = self._extract_protocol_stack(raw_message, packet_data)
        
        # Extract message direction and nodes
        direction_info = self._extract_direction_info(raw_message)
        
        # Extract frequency and channel information
        frequency_info = self._extract_frequency_info(raw_message)
        
        # Extract information elements (like Wireshark)
        information_elements = self._extract_information_elements(raw_message)
        
        # Determine related KPIs
        related_kpis = self._correlate_with_kpis(raw_message, information_elements)
        
        # Create comprehensive message record
        message_record = {
            'timestamp': timestamp,
            'datetime': datetime.fromtimestamp(timestamp).isoformat(),
            'raw_message': raw_message,
            
            # Protocol Stack (like Wireshark layers)
            'protocol_stack': protocol_stack,
            
            # Message Direction and Nodes
            'direction': direction_info,
            
            # Frequency and Channel Information
            'frequency': frequency_info,
            
            # Information Elements (nested like Wireshark)
            'information_elements': information_elements,
            
            # KPI Correlations
            'related_kpis': related_kpis,
            
            # Message Classification
            'message_type': self._classify_message(raw_message),
            'procedure': self._identify_procedure(raw_message),
            
            # Searchable tags for Grafana queries
            'tags': self._generate_search_tags(raw_message, information_elements, related_kpis)
        }
        
        # Store for correlation
        self.message_store.append(message_record)
        
        # Update KPI correlations
        self._update_kpi_correlations(message_record)
        
        return message_record
    
    def _extract_protocol_stack(self, message: str, packet_data: bytes = None) -> Dict:
        """Extract protocol stack information like Wireshark"""
        
        stack = {
            'layer1': {},  # Physical Layer
            'layer2': {},  # MAC/RLC/PDCP
            'layer3': {},  # RRC/NAS
            'application': {}  # Higher layers
        }
        
        # Layer 1 - Physical Layer
        if re.search(r'rsrp|rsrq|sinr|cqi|pci|earfcn', message, re.IGNORECASE):
            stack['layer1'] = {
                'protocol': 'LTE-PHY',
                'rsrp': self._extract_value(message, r'rsrp[:\s=]*(-?\d+)'),
                'rsrq': self._extract_value(message, r'rsrq[:\s=]*(-?\d+)'),
                'sinr': self._extract_value(message, r'sinr[:\s=]*(-?\d+)'),
                'pci': self._extract_value(message, r'pci[:\s=]*(\d+)'),
                'earfcn': self._extract_value(message, r'earfcn[:\s=]*(\d+)')
            }
        
        # Layer 2 - MAC/RLC/PDCP
        if re.search(r'mac|rlc|pdcp|harq|bsr|phr', message, re.IGNORECASE):
            stack['layer2'] = {
                'mac': self._extract_mac_info(message),
                'rlc': self._extract_rlc_info(message),
                'pdcp': self._extract_pdcp_info(message)
            }
        
        # Layer 3 - RRC/NAS
        if re.search(r'rrc|nas|emm|esm', message, re.IGNORECASE):
            stack['layer3'] = {
                'rrc': self._extract_rrc_info(message),
                'nas': self._extract_nas_info(message)
            }
        
        return stack
    
    def _extract_direction_info(self, message: str) -> Dict:
        """Extract message direction and node information"""
        
        direction = {
            'link_direction': 'UNKNOWN',  # UL/DL
            'source_node': 'UNKNOWN',
            'destination_node': 'UNKNOWN',
            'interface': 'UNKNOWN'  # Uu, S1, X2, etc.
        }
        
        # Determine UL/DL
        if re.search(r'uplink|ul[^a-z]|transmission|tx', message, re.IGNORECASE):
            direction['link_direction'] = 'UPLINK'
            direction['source_node'] = 'UE'
            direction['destination_node'] = 'eNodeB'
        elif re.search(r'downlink|dl[^a-z]|reception|rx', message, re.IGNORECASE):
            direction['link_direction'] = 'DOWNLINK'
            direction['source_node'] = 'eNodeB'
            direction['destination_node'] = 'UE'
        
        # Determine interface
        if re.search(r'rrc|mac|phy', message, re.IGNORECASE):
            direction['interface'] = 'Uu'  # Air interface
        elif re.search(r's1|mme|sgw', message, re.IGNORECASE):
            direction['interface'] = 'S1'
        elif re.search(r'x2|handover', message, re.IGNORECASE):
            direction['interface'] = 'X2'
        
        return direction
    
    def _extract_frequency_info(self, message: str) -> Dict:
        """Extract frequency and channel information"""
        
        return {
            'earfcn': self._extract_value(message, r'earfcn[:\s=]*(\d+)'),
            'frequency_mhz': self._calculate_frequency_from_earfcn(
                self._extract_value(message, r'earfcn[:\s=]*(\d+)')
            ),
            'band': self._extract_value(message, r'band[:\s=]*(\d+)'),
            'bandwidth': self._extract_value(message, r'bandwidth[:\s=]*(\d+)'),
            'carrier_frequency': self._extract_value(message, r'carrier[:\s=]*(\d+)')
        }
    
    def _extract_information_elements(self, message: str) -> Dict:
        """Extract detailed Information Elements like Wireshark"""
        
        ies = {}
        
        # RRC Information Elements
        if 'rrc' in message.lower():
            ies['rrc'] = {
                'message_type': self._extract_rrc_message_type(message),
                'transaction_id': self._extract_value(message, r'transaction[:\s=]*(\d+)'),
                'establishment_cause': self._extract_establishment_cause(message),
                'ue_capability': self._extract_ue_capability(message),
                'security_config': self._extract_security_config(message)
            }
        
        # NAS Information Elements
        if 'nas' in message.lower():
            ies['nas'] = {
                'message_type': self._extract_nas_message_type(message),
                'protocol_discriminator': self._extract_protocol_discriminator(message),
                'security_header': self._extract_security_header(message),
                'eps_bearer_id': self._extract_value(message, r'bearer.*id[:\s=]*(\d+)'),
                'procedure_transaction_id': self._extract_value(message, r'pti[:\s=]*(\d+)')
            }
        
        # Mobility Information Elements
        if re.search(r'handover|measurement|reselection', message, re.IGNORECASE):
            ies['mobility'] = {
                'measurement_id': self._extract_value(message, r'measurement.*id[:\s=]*(\d+)'),
                'target_cell_id': self._extract_value(message, r'target.*cell[:\s=]*(\d+)'),
                'source_cell_id': self._extract_value(message, r'source.*cell[:\s=]*(\d+)'),
                'handover_type': self._extract_handover_type(message),
                'cause': self._extract_mobility_cause(message)
            }
        
        # Bearer Information Elements
        if re.search(r'bearer|qos|qci', message, re.IGNORECASE):
            ies['bearer'] = {
                'eps_bearer_id': self._extract_value(message, r'bearer.*id[:\s=]*(\d+)'),
                'qci': self._extract_value(message, r'qci[:\s=]*(\d+)'),
                'gbr_ul': self._extract_value(message, r'gbr.*ul[:\s=]*(\d+)'),
                'gbr_dl': self._extract_value(message, r'gbr.*dl[:\s=]*(\d+)'),
                'apn': self._extract_apn(message)
            }
        
        return ies
    
    def _correlate_with_kpis(self, message: str, ies: Dict) -> List[str]:
        """Correlate message with specific KPIs from telecom_kpis.csv"""
        
        related_kpis = []
        
        # Signal Quality KPIs
        if re.search(r'rsrp|rsrq|sinr|cqi', message, re.IGNORECASE):
            related_kpis.extend(['RSRP', 'RSRQ', 'SINR', 'CQI'])
        
        # RRC Success Rate KPI
        if re.search(r'rrc.*connection', message, re.IGNORECASE):
            related_kpis.append('RRC_Success_Rate')
        
        # Handover Success Rate KPI
        if re.search(r'handover', message, re.IGNORECASE):
            related_kpis.append('Handover_Success_Rate')
        
        # ERAB Success Rate KPI
        if re.search(r'bearer.*setup|erab', message, re.IGNORECASE):
            related_kpis.append('ERAB_Success_Rate')
        
        # RACH Success Rate KPI
        if re.search(r'rach|random.*access|preamble', message, re.IGNORECASE):
            related_kpis.append('RACH_Success_Rate')
        
        # Throughput KPIs
        if re.search(r'throughput|data.*rate|mbps', message, re.IGNORECASE):
            related_kpis.extend(['Throughput_DL', 'Throughput_UL'])
        
        # Location KPIs
        if re.search(r'gps|latitude|longitude|location', message, re.IGNORECASE):
            related_kpis.extend(['GPS_Latitude', 'GPS_Longitude'])
        
        # Cell Information KPIs
        if re.search(r'cell.*id|pci|earfcn|mcc|mnc', message, re.IGNORECASE):
            related_kpis.extend(['Cell_ID', 'PCI', 'EARFCN', 'MCC', 'MNC'])
        
        return related_kpis
    
    def _generate_search_tags(self, message: str, ies: Dict, kpis: List[str]) -> List[str]:
        """Generate searchable tags for Grafana LogQL queries"""
        
        tags = []
        
        # Add KPI tags
        tags.extend([f"kpi:{kpi.lower()}" for kpi in kpis])
        
        # Add protocol tags
        if 'rrc' in ies:
            tags.append("protocol:rrc")
        if 'nas' in ies:
            tags.append("protocol:nas")
        if 'mobility' in ies:
            tags.append("protocol:mobility")
        
        # Add procedure tags
        procedure = self._identify_procedure(message)
        if procedure:
            tags.append(f"procedure:{procedure.lower()}")
        
        # Add direction tags
        if re.search(r'uplink|ul[^a-z]', message, re.IGNORECASE):
            tags.append("direction:uplink")
        elif re.search(r'downlink|dl[^a-z]', message, re.IGNORECASE):
            tags.append("direction:downlink")
        
        return tags
    
    def get_kpi_related_messages(self, kpi_name: str, time_range: tuple = None) -> List[Dict]:
        """Get all messages related to a specific KPI (for Grafana drill-down)"""
        
        related_messages = []
        
        for message in self.message_store:
            if kpi_name in message['related_kpis']:
                if time_range:
                    start_time, end_time = time_range
                    if start_time <= message['timestamp'] <= end_time:
                        related_messages.append(message)
                else:
                    related_messages.append(message)
        
        return related_messages
    
    def generate_grafana_query(self, kpi_name: str) -> str:
        """Generate LogQL query for Grafana to show all messages for a KPI"""
        
        kpi_tag = f"kpi:{kpi_name.lower()}"
        
        query = f'''{{job="scat"}} |= "{kpi_tag}" | json 
| line_format "{{{{.datetime}}}} [{{{{.direction.link_direction}}}}] {{{{.message_type}}}} | {{{{.direction.source_node}}}} → {{{{.direction.destination_node}}}} | {{{{.frequency.earfcn}}}} | {{{{.information_elements}}}}"'''
        
        return query
    
    # Helper methods for extraction
    def _extract_value(self, message: str, pattern: str) -> Optional[int]:
        match = re.search(pattern, message, re.IGNORECASE)
        return int(match.group(1)) if match else None
    
    def _extract_mac_info(self, message: str) -> Dict:
        return {
            'harq_process_id': self._extract_value(message, r'harq.*process[:\s=]*(\d+)'),
            'bsr': self._extract_value(message, r'bsr[:\s=]*(\d+)'),
            'phr': self._extract_value(message, r'phr[:\s=]*(\d+)')
        }
    
    def _extract_rlc_info(self, message: str) -> Dict:
        return {
            'sequence_number': self._extract_value(message, r'sn[:\s=]*(\d+)'),
            'rlc_mode': 'AM' if 'am' in message.lower() else 'UM' if 'um' in message.lower() else None
        }
    
    def _extract_pdcp_info(self, message: str) -> Dict:
        return {
            'sequence_number': self._extract_value(message, r'pdcp.*sn[:\s=]*(\d+)'),
            'rohc_enabled': 'rohc' in message.lower()
        }
    
    def _extract_rrc_info(self, message: str) -> Dict:
        return {
            'message_type': self._extract_rrc_message_type(message),
            'transaction_id': self._extract_value(message, r'transaction[:\s=]*(\d+)')
        }
    
    def _extract_nas_info(self, message: str) -> Dict:
        return {
            'message_type': self._extract_nas_message_type(message),
            'security_protected': 'security' in message.lower()
        }
    
    def _extract_rrc_message_type(self, message: str) -> Optional[str]:
        rrc_types = ['connectionRequest', 'connectionSetup', 'connectionSetupComplete', 
                    'connectionReconfiguration', 'measurementReport', 'handoverCommand']
        for msg_type in rrc_types:
            if re.search(msg_type, message, re.IGNORECASE):
                return msg_type
        return None
    
    def _extract_nas_message_type(self, message: str) -> Optional[str]:
        nas_types = ['attachRequest', 'attachAccept', 'authenticationRequest', 
                    'authenticationResponse', 'securityModeCommand', 'tauRequest']
        for msg_type in nas_types:
            if re.search(msg_type, message, re.IGNORECASE):
                return msg_type
        return None
    
    def _classify_message(self, message: str) -> str:
        if re.search(r'rrc', message, re.IGNORECASE):
            return 'RRC'
        elif re.search(r'nas', message, re.IGNORECASE):
            return 'NAS'
        elif re.search(r'mac', message, re.IGNORECASE):
            return 'MAC'
        elif re.search(r'phy|rsrp|rsrq', message, re.IGNORECASE):
            return 'PHY'
        return 'UNKNOWN'
    
    def _identify_procedure(self, message: str) -> Optional[str]:
        procedures = ['RACH', 'RRC_CONNECTION', 'AUTHENTICATION', 'HANDOVER', 
                     'BEARER_SETUP', 'TAU', 'ATTACH']
        for proc in procedures:
            if re.search(proc.replace('_', '.*'), message, re.IGNORECASE):
                return proc
        return None
    
    def _calculate_frequency_from_earfcn(self, earfcn: Optional[int]) -> Optional[float]:
        """Calculate frequency in MHz from EARFCN"""
        if earfcn is None:
            return None
        
        # Simplified EARFCN to frequency conversion for common bands
        if 0 <= earfcn <= 599:  # Band 1
            return 2110 + 0.1 * earfcn
        elif 600 <= earfcn <= 1199:  # Band 2
            return 1930 + 0.1 * (earfcn - 600)
        elif 1200 <= earfcn <= 1949:  # Band 3
            return 1805 + 0.1 * (earfcn - 1200)
        elif 1950 <= earfcn <= 2399:  # Band 4
            return 2110 + 0.1 * (earfcn - 1950)
        elif 2400 <= earfcn <= 2649:  # Band 7
            return 2620 + 0.1 * (earfcn - 2400)
        else:
            return None
    
    def _extract_establishment_cause(self, message: str) -> Optional[str]:
        causes = ['emergency', 'highPriorityAccess', 'mt-Access', 'mo-Signalling', 'mo-Data']
        for cause in causes:
            if re.search(cause, message, re.IGNORECASE):
                return cause
        return None
    
    def _extract_ue_capability(self, message: str) -> Optional[Dict]:
        return {'present': 'capability' in message.lower()}
    
    def _extract_security_config(self, message: str) -> Optional[Dict]:
        return {'present': 'security' in message.lower()}
    
    def _extract_protocol_discriminator(self, message: str) -> Optional[str]:
        if 'emm' in message.lower():
            return 'EMM'
        elif 'esm' in message.lower():
            return 'ESM'
        return None
    
    def _extract_security_header(self, message: str) -> Optional[str]:
        if 'integrity' in message.lower():
            return 'integrity_protected'
        elif 'ciphered' in message.lower():
            return 'ciphered'
        return None
    
    def _extract_handover_type(self, message: str) -> Optional[str]:
        if 'intra' in message.lower():
            return 'intra-LTE'
        elif 'inter' in message.lower():
            return 'inter-RAT'
        return None
    
    def _extract_mobility_cause(self, message: str) -> Optional[str]:
        causes = ['coverage', 'quality', 'load', 'interference']
        for cause in causes:
            if re.search(cause, message, re.IGNORECASE):
                return cause
        return None
    
    def _extract_apn(self, message: str) -> Optional[str]:
        match = re.search(r'apn[:\s=]*([a-zA-Z0-9.]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
    
    def _update_kpi_correlations(self, message_record: Dict):
        """Update KPI correlation tracking"""
        for kpi in message_record['related_kpis']:
            if kpi not in self.kpi_correlations:
                self.kpi_correlations[kpi] = []
            self.kpi_correlations[kpi].append(message_record['timestamp'])

# Example usage
if __name__ == "__main__":
    correlator = ProtocolMessageCorrelator()
    
    # Test with sample messages
    test_messages = [
        "RRC Connection Request, establishment cause: mo-Data, UE Identity: 0x1234, EARFCN: 1849, RSRP: -95 dBm",
        "Handover Command, target cell: 302, source cell: 150, EARFCN: 1850, cause: quality",
        "NAS Attach Request, EPS attach type: 1, GUTI: 0xABCD, security protected",
        "MAC HARQ process 3, BSR: 15, uplink transmission, PCI: 302"
    ]
    
    print("=== PROTOCOL MESSAGE CORRELATION ANALYSIS ===\n")
    
    for i, message in enumerate(test_messages):
        result = correlator.analyze_protocol_message(message, timestamp=time.time() + i)
        
        print(f"Message {i+1}: {message}")
        print(f"Protocol Stack: {json.dumps(result['protocol_stack'], indent=2)}")
        print(f"Direction: {result['direction']}")
        print(f"Related KPIs: {result['related_kpis']}")
        print(f"Search Tags: {result['tags']}")
        print(f"Grafana Query: {correlator.generate_grafana_query('Handover_Success_Rate')}")
        print("=" * 80)
    
    # Show KPI drill-down example
    handover_messages = correlator.get_kpi_related_messages('Handover_Success_Rate')
    print(f"\nHandover-related messages: {len(handover_messages)}")
    for msg in handover_messages:
        print(f"  - {msg['datetime']}: {msg['message_type']} | {msg['direction']['source_node']} → {msg['direction']['destination_node']}")
