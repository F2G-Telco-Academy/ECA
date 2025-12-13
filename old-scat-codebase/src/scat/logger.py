#!/usr/bin/env python3
import logging
import json
import os
from datetime import datetime

class StructuredLogger:
    """Outputs structured JSON logs for Loki ingestion"""
    
    def __init__(self, log_file=None):
        self.log_file = log_file or os.getenv('LOG_FILE', './logs/scat.log')
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        
    def log(self, level, message, **kwargs):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'message': message,
            **kwargs
        }
        
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def info(self, message, **kwargs):
        self.log('INFO', message, **kwargs)
    
    def error(self, message, **kwargs):
        self.log('ERROR', message, **kwargs)
    
    def warning(self, message, **kwargs):
        self.log('WARNING', message, **kwargs)
    
    def debug(self, message, **kwargs):
        self.log('DEBUG', message, **kwargs)
