#!/usr/bin/env python3
"""
Detailed Cellular Procedure Analyzer
Analyzes specific cellular procedures with full information element extraction
"""

import re
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

class CellularProcedureAnalyzer:
    """Analyze specific cellular procedures with detailed information elements"""
    
    def __init__(self):
        self.procedures = {
            'RACH': RACHAnalyzer(),
            'RRC_CONNECTION': RRCConnectionAnalyzer(),
            'NAS_ATTACH': NASAttachAnalyzer(),
            'AUTHENTICATION': AuthenticationAnalyzer(),
            'HANDOVER': HandoverAnalyzer(),
            'BEARER_SETUP': BearerSetupAnalyzer(),
            'TAU': TAUAnalyzer(),
            'SIB_DECODING': SIBAnalyzer()
        }
        
    def analyze_message(self, raw_message: str, packet_data: bytes = None) -> List[Dict]:
        """Analyze message for all relevant procedures"""
        results = []
        
        for proc_name, analyzer in self.procedures.items():
            analysis = analyzer.analyze(raw_message, packet_data)
            if analysis:
                analysis['procedure_type'] = proc_name
                analysis['timestamp'] = datetime.utcnow().isoformat()
                results.append(analysis)
                
        return results

class RACHAnalyzer:
    """Detailed RACH (Random Access Channel) Procedure Analysis"""
    
    def __init__(self):
        self.rach_state = {}
        
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        """Analyze RACH procedure messages"""
        
        # RACH Preamble Transmission
        preamble_match = re.search(r'preamble.*transmission.*attempt\s*(\d+)', message, re.IGNORECASE)
        if preamble_match:
            return {
                'event': 'RACH_PREAMBLE_TRANSMISSION',
                'information_elements': {
                    'attempt_number': int(preamble_match.group(1)),
                    'preamble_id': self._extract_preamble_id(message),
                    'prach_config_index': self._extract_prach_config(message),
                    'transmission_power': self._extract_tx_power(message),
                    'frequency_offset': self._extract_freq_offset(message)
                },
                'analysis': {
                    'procedure_step': 'Initial Access Attempt',
                    'expected_next': 'Random Access Response (RAR)',
                    'timeout_timer': 'ra-ResponseWindowSize'
                }
            }
        
        # Random Access Response (RAR)
        rar_match = re.search(r'random.*access.*response|RAR', message, re.IGNORECASE)
        if rar_match:
            return {
                'event': 'RANDOM_ACCESS_RESPONSE',
                'information_elements': {
                    'rapid': self._extract_rapid(message),
                    'timing_advance': self._extract_timing_advance(message),
                    'ul_grant': self._extract_ul_grant(message),
                    'temp_crnti': self._extract_temp_crnti(message)
                },
                'analysis': {
                    'procedure_step': 'Network Response to Preamble',
                    'expected_next': 'RRC Connection Request',
                    'success_indicator': True
                }
            }
        
        # Contention Resolution
        contention_match = re.search(r'contention.*resolution', message, re.IGNORECASE)
        if contention_match:
            return {
                'event': 'CONTENTION_RESOLUTION',
                'information_elements': {
                    'crnti_assignment': self._extract_crnti(message),
                    'resolution_status': self._extract_resolution_status(message)
                },
                'analysis': {
                    'procedure_step': 'Final RACH Step',
                    'procedure_result': 'SUCCESS' if 'success' in message.lower() else 'FAILURE'
                }
            }
            
        return None
    
    def _extract_preamble_id(self, message: str) -> Optional[int]:
        match = re.search(r'preamble.*id[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_timing_advance(self, message: str) -> Optional[int]:
        match = re.search(r'timing.*advance[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_tx_power(self, message: str) -> Optional[int]:
        match = re.search(r'(?:tx|transmission).*power[:\s=]*(-?\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_prach_config(self, message: str) -> Optional[int]:
        match = re.search(r'prach.*config[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_freq_offset(self, message: str) -> Optional[int]:
        match = re.search(r'freq(?:uency)?.*offset[:\s=]*(-?\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_rapid(self, message: str) -> Optional[int]:
        match = re.search(r'rapid[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_ul_grant(self, message: str) -> Optional[str]:
        match = re.search(r'ul.*grant[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_temp_crnti(self, message: str) -> Optional[str]:
        match = re.search(r'temp.*crnti[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_crnti(self, message: str) -> Optional[str]:
        match = re.search(r'crnti[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_resolution_status(self, message: str) -> str:
        if re.search(r'success|complete', message, re.IGNORECASE):
            return 'SUCCESS'
        elif re.search(r'fail|error', message, re.IGNORECASE):
            return 'FAILURE'
        return 'UNKNOWN'

class RRCConnectionAnalyzer:
    """Detailed RRC Connection Procedure Analysis"""
    
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        
        # RRC Connection Request
        if re.search(r'rrc.*connection.*request', message, re.IGNORECASE):
            return {
                'event': 'RRC_CONNECTION_REQUEST',
                'information_elements': {
                    'establishment_cause': self._extract_establishment_cause(message),
                    'ue_identity': self._extract_ue_identity(message),
                    'selected_plmn_identity': self._extract_plmn(message)
                },
                'analysis': {
                    'procedure_step': 'UE Initiates RRC Connection',
                    'expected_next': 'RRC Connection Setup',
                    'establishment_reason': self._get_establishment_reason(message)
                }
            }
        
        # RRC Connection Setup
        if re.search(r'rrc.*connection.*setup', message, re.IGNORECASE):
            return {
                'event': 'RRC_CONNECTION_SETUP',
                'information_elements': {
                    'rrc_transaction_id': self._extract_transaction_id(message),
                    'radio_resource_config': self._extract_radio_config(message),
                    'srb_config': self._extract_srb_config(message)
                },
                'analysis': {
                    'procedure_step': 'Network Configures Connection',
                    'expected_next': 'RRC Connection Setup Complete'
                }
            }
            
        return None
    
    def _extract_establishment_cause(self, message: str) -> Optional[str]:
        causes = ['emergency', 'highPriorityAccess', 'mt-Access', 'mo-Signalling', 'mo-Data']
        for cause in causes:
            if re.search(cause, message, re.IGNORECASE):
                return cause
        return None
        
    def _extract_ue_identity(self, message: str) -> Optional[str]:
        match = re.search(r'ue.*identity[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_plmn(self, message: str) -> Optional[str]:
        match = re.search(r'plmn[:\s=]*(\d+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _get_establishment_reason(self, message: str) -> str:
        if 'emergency' in message.lower():
            return 'Emergency Call'
        elif 'data' in message.lower():
            return 'Data Session'
        elif 'signalling' in message.lower():
            return 'Signalling'
        return 'Normal Access'
        
    def _extract_transaction_id(self, message: str) -> Optional[int]:
        match = re.search(r'transaction.*id[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_radio_config(self, message: str) -> Optional[Dict]:
        # Extract radio bearer configuration details
        return {'config_present': 'radioResourceConfig' in message}
        
    def _extract_srb_config(self, message: str) -> Optional[Dict]:
        # Extract signaling radio bearer configuration
        return {'srb1_configured': 'srb1' in message.lower()}

class NASAttachAnalyzer:
    """Detailed NAS Attach Procedure Analysis"""
    
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        
        if re.search(r'attach.*request', message, re.IGNORECASE):
            return {
                'event': 'NAS_ATTACH_REQUEST',
                'information_elements': {
                    'attach_type': self._extract_attach_type(message),
                    'eps_attach_type': self._extract_eps_attach_type(message),
                    'old_guti': self._extract_guti(message),
                    'last_visited_tai': self._extract_tai(message),
                    'ue_network_capability': self._extract_ue_capability(message),
                    'esm_message_container': self._extract_esm_container(message)
                },
                'analysis': {
                    'procedure_step': 'UE Requests Network Attachment',
                    'expected_next': 'Authentication Request or Attach Accept',
                    'attach_reason': self._get_attach_reason(message)
                }
            }
            
        return None
    
    def _extract_attach_type(self, message: str) -> Optional[str]:
        types = ['EPS attach', 'combined EPS/IMSI attach', 'emergency attach']
        for attach_type in types:
            if re.search(attach_type, message, re.IGNORECASE):
                return attach_type
        return None
        
    def _extract_eps_attach_type(self, message: str) -> Optional[int]:
        match = re.search(r'eps.*attach.*type[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_guti(self, message: str) -> Optional[str]:
        match = re.search(r'guti[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_tai(self, message: str) -> Optional[str]:
        match = re.search(r'tai[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_ue_capability(self, message: str) -> Optional[Dict]:
        return {'capability_present': 'ue.*network.*capability' in message.lower()}
        
    def _extract_esm_container(self, message: str) -> Optional[Dict]:
        return {'esm_present': 'esm.*message' in message.lower()}
        
    def _get_attach_reason(self, message: str) -> str:
        if 'emergency' in message.lower():
            return 'Emergency Services'
        elif 'roaming' in message.lower():
            return 'Roaming Attach'
        return 'Normal Attach'

class AuthenticationAnalyzer:
    """Detailed Authentication Procedure Analysis"""
    
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        
        if re.search(r'authentication.*request', message, re.IGNORECASE):
            return {
                'event': 'AUTHENTICATION_REQUEST',
                'information_elements': {
                    'rand': self._extract_rand(message),
                    'autn': self._extract_autn(message),
                    'key_set_identifier': self._extract_ksi(message)
                },
                'analysis': {
                    'procedure_step': 'Network Challenges UE',
                    'expected_next': 'Authentication Response',
                    'security_context': 'New authentication vector'
                }
            }
            
        return None
    
    def _extract_rand(self, message: str) -> Optional[str]:
        match = re.search(r'rand[:\s=]*([0-9a-fA-F]{32})', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_autn(self, message: str) -> Optional[str]:
        match = re.search(r'autn[:\s=]*([0-9a-fA-F]{32})', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_ksi(self, message: str) -> Optional[int]:
        match = re.search(r'ksi[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None

class HandoverAnalyzer:
    """Detailed Handover Procedure Analysis"""
    
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        
        if re.search(r'handover.*command', message, re.IGNORECASE):
            return {
                'event': 'HANDOVER_COMMAND',
                'information_elements': {
                    'target_cell_id': self._extract_target_cell(message),
                    'target_earfcn': self._extract_target_earfcn(message),
                    'handover_type': self._extract_ho_type(message),
                    'mobility_control_info': self._extract_mobility_info(message)
                },
                'analysis': {
                    'procedure_step': 'Network Orders Handover',
                    'expected_next': 'Handover Complete',
                    'handover_reason': self._get_ho_reason(message)
                }
            }
            
        return None
    
    def _extract_target_cell(self, message: str) -> Optional[int]:
        match = re.search(r'target.*cell[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_target_earfcn(self, message: str) -> Optional[int]:
        match = re.search(r'target.*earfcn[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_ho_type(self, message: str) -> str:
        if 'intra' in message.lower():
            return 'Intra-LTE'
        elif 'inter' in message.lower():
            return 'Inter-RAT'
        return 'Unknown'
        
    def _extract_mobility_info(self, message: str) -> Optional[Dict]:
        return {'mobility_info_present': 'mobility.*control' in message.lower()}
        
    def _get_ho_reason(self, message: str) -> str:
        if 'coverage' in message.lower():
            return 'Coverage Optimization'
        elif 'load' in message.lower():
            return 'Load Balancing'
        return 'Quality Optimization'

class BearerSetupAnalyzer:
    """Detailed Bearer Setup Procedure Analysis"""
    
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        
        if re.search(r'bearer.*setup', message, re.IGNORECASE):
            return {
                'event': 'BEARER_SETUP_REQUEST',
                'information_elements': {
                    'eps_bearer_id': self._extract_bearer_id(message),
                    'qci': self._extract_qci(message),
                    'apn': self._extract_apn(message),
                    'tft': self._extract_tft(message)
                },
                'analysis': {
                    'procedure_step': 'Bearer Context Activation',
                    'expected_next': 'Bearer Setup Complete',
                    'bearer_type': self._get_bearer_type(message)
                }
            }
            
        return None
    
    def _extract_bearer_id(self, message: str) -> Optional[int]:
        match = re.search(r'bearer.*id[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_qci(self, message: str) -> Optional[int]:
        match = re.search(r'qci[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_apn(self, message: str) -> Optional[str]:
        match = re.search(r'apn[:\s=]*([a-zA-Z0-9.]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_tft(self, message: str) -> Optional[Dict]:
        return {'tft_present': 'tft' in message.lower()}
        
    def _get_bearer_type(self, message: str) -> str:
        if 'default' in message.lower():
            return 'Default Bearer'
        elif 'dedicated' in message.lower():
            return 'Dedicated Bearer'
        return 'Unknown Bearer Type'

class TAUAnalyzer:
    """Detailed TAU (Tracking Area Update) Procedure Analysis"""
    
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        
        if re.search(r'tracking.*area.*update|tau.*request', message, re.IGNORECASE):
            return {
                'event': 'TAU_REQUEST',
                'information_elements': {
                    'tau_type': self._extract_tau_type(message),
                    'old_guti': self._extract_guti(message),
                    'last_visited_tai': self._extract_tai(message),
                    'update_type': self._extract_update_type(message)
                },
                'analysis': {
                    'procedure_step': 'Location Update Request',
                    'expected_next': 'TAU Accept',
                    'update_reason': self._get_update_reason(message)
                }
            }
            
        return None
    
    def _extract_tau_type(self, message: str) -> Optional[str]:
        types = ['TA updating', 'combined TA/LA updating', 'periodic updating']
        for tau_type in types:
            if re.search(tau_type, message, re.IGNORECASE):
                return tau_type
        return None
        
    def _extract_guti(self, message: str) -> Optional[str]:
        match = re.search(r'guti[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_tai(self, message: str) -> Optional[str]:
        match = re.search(r'tai[:\s=]*([0-9a-fA-F]+)', message, re.IGNORECASE)
        return match.group(1) if match else None
        
    def _extract_update_type(self, message: str) -> Optional[int]:
        match = re.search(r'update.*type[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _get_update_reason(self, message: str) -> str:
        if 'periodic' in message.lower():
            return 'Periodic Timer Expiry'
        elif 'mobility' in message.lower():
            return 'Mobility Event'
        return 'Normal Update'

class SIBAnalyzer:
    """Detailed SIB (System Information Block) Analysis"""
    
    def analyze(self, message: str, packet_data: bytes = None) -> Optional[Dict]:
        
        sib_match = re.search(r'sib[:\s]*(\d+)', message, re.IGNORECASE)
        if sib_match:
            sib_type = int(sib_match.group(1))
            return {
                'event': f'SIB{sib_type}_RECEPTION',
                'information_elements': {
                    'sib_type': sib_type,
                    'system_info_value_tag': self._extract_value_tag(message),
                    'scheduling_info': self._extract_scheduling_info(message),
                    'content_summary': self._get_sib_content(sib_type, message)
                },
                'analysis': {
                    'procedure_step': 'System Information Reception',
                    'sib_purpose': self._get_sib_purpose(sib_type),
                    'broadcast_schedule': self._get_broadcast_info(message)
                }
            }
            
        return None
    
    def _extract_value_tag(self, message: str) -> Optional[int]:
        match = re.search(r'value.*tag[:\s=]*(\d+)', message, re.IGNORECASE)
        return int(match.group(1)) if match else None
        
    def _extract_scheduling_info(self, message: str) -> Optional[Dict]:
        return {'scheduling_present': 'scheduling' in message.lower()}
        
    def _get_sib_content(self, sib_type: int, message: str) -> Dict:
        content_map = {
            1: {'contains': 'Cell access parameters, PLMN info'},
            2: {'contains': 'Radio resource configuration'},
            3: {'contains': 'Cell reselection info'},
            4: {'contains': 'Neighboring cell info'},
            5: {'contains': 'Inter-frequency cell info'}
        }
        return content_map.get(sib_type, {'contains': 'System information'})
        
    def _get_sib_purpose(self, sib_type: int) -> str:
        purposes = {
            1: 'Cell Access and PLMN Information',
            2: 'Radio Resource Configuration',
            3: 'Cell Reselection Parameters',
            4: 'Intra-frequency Neighbor Cells',
            5: 'Inter-frequency Neighbor Cells'
        }
        return purposes.get(sib_type, 'System Information')
        
    def _get_broadcast_info(self, message: str) -> str:
        if 'periodic' in message.lower():
            return 'Periodic Broadcast'
        return 'On-demand'

# Example usage
if __name__ == "__main__":
    analyzer = CellularProcedureAnalyzer()
    
    # Test messages
    test_messages = [
        "RACH preamble transmission attempt 1, preamble ID: 15, TX power: -10 dBm",
        "Random Access Response received, RAPID: 15, Timing Advance: 25, UL Grant: 0x1234",
        "RRC Connection Request, establishment cause: mo-Data, UE Identity: 0xABCD",
        "Authentication Request, RAND: 1234567890ABCDEF, AUTN: FEDCBA0987654321",
        "Handover Command, target cell: 302, target EARFCN: 1849, type: intra-LTE",
        "SIB 1 reception complete, value tag: 5, PLMN info present"
    ]
    
    print("=== DETAILED CELLULAR PROCEDURE ANALYSIS ===\n")
    
    for message in test_messages:
        results = analyzer.analyze_message(message)
        for result in results:
            print(f"Procedure: {result['procedure_type']}")
            print(f"Event: {result['event']}")
            print(f"Information Elements: {json.dumps(result['information_elements'], indent=2)}")
            print(f"Analysis: {json.dumps(result['analysis'], indent=2)}")
            print("=" * 50)
