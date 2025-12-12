#!/usr/bin/env python3
"""
File Converter - Convert offline logs (QMDL2, SDM, LOGE) to PCAP
Matches reference: backend-scat-old-codebase/scripts/process_offline_traces.py
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

class FileConverter:
    """Convert various log formats to PCAP using SCAT"""

    def __init__(self, scat_path=None):
        self.scat_path = scat_path or self._find_scat()
        self.supported_formats = {
            '.qmdl': 'qualcomm',
            '.qmdl2': 'qualcomm',
            '.sdm': 'samsung',
            '.loge': 'generic',
            '.pcap': 'pcap',
            '.pcapng': 'pcap'
        }

    def _find_scat(self):
        """Find SCAT executable"""
        # Check if scat module is available
        try:
            import scat
            return sys.executable + ' -m scat'
        except ImportError:
            return 'python -m scat'

    def detect_file_type(self, filepath):
        """Detect file type from extension"""
        ext = Path(filepath).suffix.lower()
        return self.supported_formats.get(ext, 'unknown')

    def convert_to_pcap(self, input_file, output_file=None):
        """Convert input file to PCAP format"""
        file_type = self.detect_file_type(input_file)

        if file_type == 'unknown':
            raise ValueError(f"Unsupported file format: {input_file}")

        if file_type == 'pcap':
            print(f"File is already PCAP format: {input_file}")
            return input_file

        # Generate output filename
        if not output_file:
            output_file = str(Path(input_file).with_suffix('.pcap'))

        # Convert using SCAT
        if file_type == 'qualcomm':
            return self._convert_qualcomm(input_file, output_file)
        elif file_type == 'samsung':
            return self._convert_samsung(input_file, output_file)
        else:
            raise ValueError(f"Conversion not supported for {file_type}")

    def _convert_qualcomm(self, input_file, output_file):
        """Convert Qualcomm QMDL/QMDL2 to PCAP with GSMTAP headers"""
        print(f"Converting Qualcomm file: {input_file}")
        # SCAT command: scat -t qc -d input.qmdl -F output.pcap -L layers
        cmd = [
            sys.executable, '-m', 'scat.main',
            '-t', 'qc',  # Qualcomm parser
            '-d', input_file,
            '-F', output_file,  # Write GSMTAP to PCAP file
            '-L', 'ip,mac,rlc,pdcp,rrc,nas',  # All protocol layers
        ]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            if result.returncode == 0 and os.path.exists(output_file):
                print(f"✓ Converted to: {output_file}")
                return output_file
            else:
                print(f"✗ Conversion failed: {result.stderr}")
                return None
        except Exception as e:
            print(f"✗ Error: {e}")
            return None

    def _convert_samsung(self, input_file, output_file):
        """Convert Samsung SDM to PCAP with GSMTAP headers"""
        print(f"Converting Samsung file: {input_file}")
        # SCAT command: scat -t sec -d input.sdm -F output.pcap -L layers
        cmd = [
            sys.executable, '-m', 'scat.main',
            '-t', 'sec',  # Samsung parser
            '-d', input_file,
            '-F', output_file,  # Write GSMTAP to PCAP file
            '-L', 'ip,mac,rlc,pdcp,rrc,nas',  # All protocol layers
        ]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            if result.returncode == 0 and os.path.exists(output_file):
                print(f"✓ Converted to: {output_file}")
                return output_file
            else:
                print(f"✗ Conversion failed: {result.stderr}")
                return None
        except Exception as e:
            print(f"✗ Error: {e}")
            return None

    def get_file_info(self, filepath):
        """Get information about the file"""
        file_type = self.detect_file_type(filepath)
        file_size = os.path.getsize(filepath) / (1024 * 1024)  # MB

        return {
            'filepath': filepath,
            'filename': os.path.basename(filepath),
            'type': file_type,
            'size_mb': round(file_size, 2),
            'can_convert': file_type in ['qualcomm', 'samsung']
        }

if __name__ == '__main__':
    converter = FileConverter()

    if len(sys.argv) < 2:
        print("Usage: python file_converter.py <input_file> [output_file]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    # Show file info
    info = converter.get_file_info(input_file)
    print(f"File: {info['filename']}")
    print(f"Type: {info['type']}")
    print(f"Size: {info['size_mb']} MB")
    print()

    # Convert
    if info['can_convert']:
        result = converter.convert_to_pcap(input_file, output_file)
        sys.exit(0 if result else 1)
    else:
        print(f"Cannot convert {info['type']} files")
        sys.exit(1)
