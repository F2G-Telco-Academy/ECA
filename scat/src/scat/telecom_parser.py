#!/usr/bin/env python3
"""
Enhanced Telecom Message Parser for SCAT
Comprehensive cellular protocol monitoring including all critical procedures
"""

import re
import json
from datetime import datetime
from typing import Dict, List, Optional

class TelecomMessageParser:
    """Parse and categorize comprehensive cellular protocol messages from SCAT output"""
    
    # Extended Subsystem IDs from qc_debug_monitor
    SUBSYSTEM_MAP = {
        0x1394: "AT_COMMANDS",
        0x13a1: "PDN_CONNECTIVITY", 
        0x251c: "LTE_SECURITY",
        0x251d: "LTE_RRC",
        0x2521: "LTE_RLC_UL",
        0x2522: "LTE_RLC_DL", 
        0x2523: "LTE_PDCP_UL",
        0x2524: "LTE_PDCP_DL",
        0x2525: "LTE_MEASUREMENT",
        0x1388: "NAS_EMM",
        0x1450: "NAS_ESM",
        0x0040: "POWER_MANAGEMENT",
        0x1194: "FREQUENCY_SYNC",
        0x12c0: "AUTHENTICATION",
        0x1b58: "MOBILITY_MANAGEMENT",
        0x1ce8: "BEARER_MANAGEMENT"
    }
    
    # Comprehensive Message Patterns
    MESSAGE_PATTERNS = {
        # Basic RRC and Access
        'RACH': [
            r'rach.*preamble', r'random.*access', r'RACH.*attempt', 
            r'preamble.*transmission', r'contention.*resolution'
        ],
        'RRC_CONNECTION': [
            r'RRC.*connection.*request', r'RRC.*connection.*setup',
            r'RRC.*connection.*complete', r'rrc.*establishment',
            r'RRC.*connection.*release', r'connection.*reconfiguration'
        ],
        
        # NAS and Attach Procedures
        'NAS_ATTACH': [
            r'attach.*request', r'attach.*accept', r'attach.*complete',
            r'EMM.*attach', r'ESM.*bearer', r'attach.*reject'
        ],
        'TAU': [
            r'tracking.*area.*update', r'TAU.*request', r'TAU.*accept',
            r'TAU.*complete', r'TAU.*reject', r'periodic.*TAU'
        ],
        'LAU': [
            r'location.*area.*update', r'LAU.*request', r'LAU.*accept',
            r'LAU.*complete', r'LAU.*reject', r'periodic.*LAU'
        ],
        
        # Authentication and Security
        'AUTHENTICATION': [
            r'authentication.*request', r'authentication.*response',
            r'authentication.*challenge', r'AUTN', r'RAND', r'SRES',
            r'authentication.*failure', r'authentication.*reject'
        ],
        'CIPHERING': [
            r'security.*mode.*command', r'security.*mode.*complete',
            r'ciphering.*algorithm', r'integrity.*algorithm',
            r'security.*context', r'cipher.*key', r'integrity.*key'
        ],
        'SECURITY': [
            r'security.*activation', r'security.*deactivation',
            r'security.*capability', r'encryption.*started',
            r'integrity.*protection', r'security.*failure'
        ],
        
        # Frequency and Synchronization
        'FREQ_SYNC_UL': [
            r'uplink.*frequency', r'UL.*frequency', r'uplink.*sync',
            r'timing.*advance', r'UL.*power.*control', r'frequency.*offset.*UL'
        ],
        'FREQ_SYNC_DL': [
            r'downlink.*frequency', r'DL.*frequency', r'downlink.*sync',
            r'frame.*sync', r'symbol.*sync', r'frequency.*offset.*DL'
        ],
        
        # UE Capabilities
        'UE_CAPABILITY': [
            r'UE.*capability.*enquiry', r'UE.*capability.*information',
            r'capability.*transfer', r'feature.*group.*indicator',
            r'supported.*bands', r'RF.*capability', r'protocol.*capability'
        ],
        
        # Mobility Procedures
        'HANDOVER': [
            r'handover.*command', r'handover.*complete', r'handover.*request',
            r'HO.*preparation', r'handover.*failure', r'X2.*handover',
            r'S1.*handover', r'intra.*LTE.*handover'
        ],
        'RESELECTION': [
            r'cell.*reselection', r'reselection.*criteria',
            r'neighbor.*cell.*measurement', r'reselection.*priority',
            r'inter.*frequency.*reselection', r'inter.*RAT.*reselection'
        ],
        'CSFB': [
            r'CSFB.*procedure', r'circuit.*switched.*fallback',
            r'CSFB.*call.*setup', r'CSFB.*redirection', r'SRVCC'
        ],
        
        # Bearer Management
        'BEARER_SETUP': [
            r'bearer.*setup', r'bearer.*establishment', r'default.*bearer',
            r'dedicated.*bearer', r'EPS.*bearer', r'bearer.*context'
        ],
        'BEARER_MODIFY': [
            r'bearer.*modification', r'bearer.*update', r'QoS.*update',
            r'bearer.*reconfiguration', r'TFT.*modification'
        ],
        'BEARER_RELEASE': [
            r'bearer.*release', r'bearer.*deactivation', r'bearer.*deletion',
            r'context.*deactivation', r'bearer.*cleanup'
        ],
        
        # System Information
        'SIB_INFO': [
            r'SIB.*1', r'SIB.*2', r'SIB.*3', r'SIB.*4', r'SIB.*5',
            r'system.*information.*block', r'SIB.*reception',
            r'SIB.*decoding', r'SIB.*update', r'SIB.*scheduling'
        ],
        'MIB_INFO': [
            r'MIB.*reception', r'master.*information.*block',
            r'MIB.*decoding', r'PBCH.*decoding', r'system.*frame.*number'
        ],
        
        # Measurements and Quality
        'MEASUREMENT': [
            r'RSRP.*measurement', r'RSRQ.*measurement', r'SINR.*measurement',
            r'serving.*cell.*measurement', r'neighbor.*cell.*measurement',
            r'measurement.*report', r'measurement.*configuration'
        ]
    }
    
    def __init__(self, logger=None):
        self.logger = logger
        self.message_counts = {}
        self.procedure_states = {}
        
    def parse_message(self, raw_message: str) -> Optional[Dict]:
        """Parse a raw SCAT message and extract comprehensive telecom information"""
        
        # Extract subsystem ID if present
        subsystem_match = re.search(r'0x([0-9a-fA-F]{4})', raw_message)
        subsystem_id = None
        subsystem_name = "UNKNOWN"
        
        if subsystem_match:
            subsystem_id = int(subsystem_match.group(1), 16)
            subsystem_name = self.SUBSYSTEM_MAP.get(subsystem_id, f"SSID_{subsystem_id:04X}")
        
        # Detect message type
        message_type = self._detect_message_type(raw_message)
        
        if message_type or subsystem_id:
            # Extract comprehensive measurements
            measurements = self._extract_measurements(raw_message)
            
            # Extract procedure-specific information
            procedure_info = self._extract_procedure_info(raw_message, message_type)
            
            # Extract security information
            security_info = self._extract_security_info(raw_message)
            
            # Extract frequency information
            frequency_info = self._extract_frequency_info(raw_message)
            
            # Create comprehensive structured message
            parsed_msg = {
                'timestamp': datetime.utcnow().isoformat(),
                'level': 'INFO',
                'message_type': message_type or 'CELLULAR_DEBUG',
                'subsystem_id': f"0x{subsystem_id:04X}" if subsystem_id else None,
                'subsystem_name': subsystem_name,
                'raw_message': raw_message.strip(),
                'measurements': measurements,
                'procedure_info': procedure_info,
                'security_info': security_info,
                'frequency_info': frequency_info,
                'source': 'SCAT_ENHANCED_TELECOM_PARSER'
            }
            
            # Update counters and states
            self._update_counters(message_type, subsystem_name)
            self._update_procedure_states(message_type, procedure_info)
            
            return parsed_msg
            
        return None
    
    def _detect_message_type(self, message: str) -> Optional[str]:
        """Detect the type of cellular message"""
        message_lower = message.lower()
        
        for msg_type, patterns in self.MESSAGE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return msg_type
        
        return None
    
    def _extract_measurements(self, message: str) -> Dict:
        """Extract comprehensive signal measurements"""
        measurements = {}
        
        # Signal strength measurements
        rsrp_match = re.search(r'rsrp[:\s=]*(-?\d+)', message, re.IGNORECASE)
        if rsrp_match:
            measurements['rsrp_dbm'] = int(rsrp_match.group(1))
        
        rsrq_match = re.search(r'rsrq[:\s=]*(-?\d+)', message, re.IGNORECASE)
        if rsrq_match:
            measurements['rsrq_db'] = int(rsrq_match.group(1))
            
        sinr_match = re.search(r'sinr[:\s=]*(-?\d+)', message, re.IGNORECASE)
        if sinr_match:
            measurements['sinr_db'] = int(sinr_match.group(1))
        
        # Cell information
        cell_match = re.search(r'cell[_\s]*id[:\s=]*(\d+)', message, re.IGNORECASE)
        if cell_match:
            measurements['cell_id'] = int(cell_match.group(1))
            
        pci_match = re.search(r'pci[:\s=]*(\d+)', message, re.IGNORECASE)
        if pci_match:
            measurements['pci'] = int(pci_match.group(1))
            
        # Timing measurements
        ta_match = re.search(r'timing.*advance[:\s=]*(\d+)', message, re.IGNORECASE)
        if ta_match:
            measurements['timing_advance'] = int(ta_match.group(1))
            
        return measurements
    
    def _extract_procedure_info(self, message: str, msg_type: str) -> Dict:
        """Extract procedure-specific information"""
        info = {}
        
        if msg_type and 'BEARER' in msg_type:
            # Bearer ID
            bearer_match = re.search(r'bearer[_\s]*id[:\s=]*(\d+)', message, re.IGNORECASE)
            if bearer_match:
                info['bearer_id'] = int(bearer_match.group(1))
                
            # QoS information
            qci_match = re.search(r'qci[:\s=]*(\d+)', message, re.IGNORECASE)
            if qci_match:
                info['qci'] = int(qci_match.group(1))
        
        elif msg_type and 'TAU' in msg_type:
            # TAC information
            tac_match = re.search(r'tac[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
            if tac_match:
                info['tac'] = tac_match.group(1)
        
        elif msg_type and 'SIB' in msg_type:
            # SIB type
            sib_match = re.search(r'sib[:\s]*(\d+)', message, re.IGNORECASE)
            if sib_match:
                info['sib_type'] = int(sib_match.group(1))
        
        return info
    
    def _extract_security_info(self, message: str) -> Dict:
        """Extract security and authentication information"""
        security = {}
        
        # Ciphering algorithm
        cipher_match = re.search(r'cipher.*algorithm[:\s=]*(\w+)', message, re.IGNORECASE)
        if cipher_match:
            security['cipher_algorithm'] = cipher_match.group(1)
            
        # Integrity algorithm
        integrity_match = re.search(r'integrity.*algorithm[:\s=]*(\w+)', message, re.IGNORECASE)
        if integrity_match:
            security['integrity_algorithm'] = integrity_match.group(1)
            
        # Authentication vectors
        if re.search(r'RAND|AUTN|SRES|XRES', message, re.IGNORECASE):
            security['auth_vector_present'] = True
            
        return security
    
    def _extract_frequency_info(self, message: str) -> Dict:
        """Extract frequency and synchronization information"""
        freq_info = {}
        
        # EARFCN
        earfcn_match = re.search(r'earfcn[:\s=]*(\d+)', message, re.IGNORECASE)
        if earfcn_match:
            freq_info['earfcn'] = int(earfcn_match.group(1))
            
        # Frequency offset
        offset_match = re.search(r'frequency.*offset[:\s=]*(-?\d+)', message, re.IGNORECASE)
        if offset_match:
            freq_info['frequency_offset_hz'] = int(offset_match.group(1))
            
        # Band information
        band_match = re.search(r'band[:\s=]*(\d+)', message, re.IGNORECASE)
        if band_match:
            freq_info['band'] = int(band_match.group(1))
            
        return freq_info
    
    def _update_counters(self, message_type: str, subsystem: str):
        """Update message counters for metrics"""
        if message_type:
            self.message_counts[message_type] = self.message_counts.get(message_type, 0) + 1
        
        subsystem_key = f"subsystem_{subsystem}"
        self.message_counts[subsystem_key] = self.message_counts.get(subsystem_key, 0) + 1
    
    def _update_procedure_states(self, message_type: str, procedure_info: Dict):
        """Track procedure states for KPI calculation"""
        if message_type:
            if 'REQUEST' in message_type or 'ATTEMPT' in message_type:
                self.procedure_states[f"{message_type}_attempts"] = \
                    self.procedure_states.get(f"{message_type}_attempts", 0) + 1
            elif 'COMPLETE' in message_type or 'ACCEPT' in message_type:
                self.procedure_states[f"{message_type}_success"] = \
                    self.procedure_states.get(f"{message_type}_success", 0) + 1
            elif 'FAILURE' in message_type or 'REJECT' in message_type:
                self.procedure_states[f"{message_type}_failures"] = \
                    self.procedure_states.get(f"{message_type}_failures", 0) + 1
    
    def get_metrics(self) -> Dict:
        """Get current message counters and KPIs for Prometheus metrics"""
        metrics = self.message_counts.copy()
        metrics.update(self.procedure_states)
        
        # Calculate success rates
        for procedure in ['RACH', 'RRC_CONNECTION', 'NAS_ATTACH', 'HANDOVER', 'TAU']:
            attempts = metrics.get(f"{procedure}_attempts", 0)
            success = metrics.get(f"{procedure}_success", 0)
            if attempts > 0:
                metrics[f"{procedure}_success_rate"] = (success / attempts) * 100
        
        return metrics
    
    def get_procedure_summary(self) -> Dict:
        """Get summary of all cellular procedures"""
        return {
            'message_counts': self.message_counts,
            'procedure_states': self.procedure_states,
            'active_subsystems': list(set([k.replace('subsystem_', '') 
                                         for k in self.message_counts.keys() 
                                         if k.startswith('subsystem_')]))
        }

# Example usage and testing
if __name__ == "__main__":
    parser = TelecomMessageParser()
    
    # Comprehensive test messages
    test_messages = [
        "[19:56:21] 0x251d : RRC connection request initiated, Cell ID: 12345",
        "[19:56:22] 0x13a1 : Attach request sent, TAC: FFFE, Bearer ID: 5", 
        "[19:56:23] 0x2525 : RSRP measurement: -95 dBm, RSRQ: -12 dB, PCI: 150",
        "[19:56:24] 0x251c : Security mode command, Cipher algorithm: AES, Integrity: SNOW3G",
        "[19:56:25] 0x1194 : Uplink frequency sync, EARFCN: 1800, Timing advance: 15",
        "[19:56:26] 0x1388 : TAU request, TAC: ABCD, Periodic update",
        "[19:56:27] 0x251d : SIB 1 reception complete, Band: 7",
        "[19:56:28] 0x1450 : Bearer setup request, QCI: 9, Bearer ID: 6",
        "[19:56:29] 0x12c0 : Authentication challenge, RAND present",
        "[19:56:30] 0x1b58 : Handover command received, Target PCI: 200"
    ]
    
    print("=== COMPREHENSIVE TELECOM MESSAGE PARSING ===\n")
    
    for msg in test_messages:
        parsed = parser.parse_message(msg)
        if parsed:
            print(f"Message Type: {parsed['message_type']}")
            print(f"Subsystem: {parsed['subsystem_name']}")
            if parsed['measurements']:
                print(f"Measurements: {parsed['measurements']}")
            if parsed['procedure_info']:
                print(f"Procedure Info: {parsed['procedure_info']}")
            if parsed['security_info']:
                print(f"Security Info: {parsed['security_info']}")
            if parsed['frequency_info']:
                print(f"Frequency Info: {parsed['frequency_info']}")
            print("---")
    
    print("\n=== METRICS SUMMARY ===")
    print(json.dumps(parser.get_metrics(), indent=2))
    
    print("\n=== PROCEDURE SUMMARY ===")
    print(json.dumps(parser.get_procedure_summary(), indent=2))
