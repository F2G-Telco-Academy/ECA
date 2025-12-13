#!/usr/bin/env python3
# coding: utf8

from .pcapwriter import PcapWriter
from .socketwriter import SocketWriter

class DualWriter:
    """Writer that outputs to both PCAP file and UDP socket"""
    def __init__(self, filename, base_address, port_cp=4729, port_up=47290):
        self.pcap_writer = PcapWriter(filename, port_cp, port_up)
        self.socket_writer = SocketWriter(base_address, port_cp, port_up)

    def __enter__(self):
        self.pcap_writer.__enter__()
        self.socket_writer.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.pcap_writer.__exit__(exc_type, exc_val, exc_tb)
        self.socket_writer.__exit__(exc_type, exc_val, exc_tb)

    def write_pkt(self, sock_content, port, radio_id=0, ts=None):
        self.pcap_writer.write_pkt(sock_content, port, radio_id, ts)
        # SocketWriter doesn't have write_pkt, it uses write_cp/write_up based on port
        if port == self.pcap_writer.port_cp:
            self.socket_writer.write_cp(sock_content, radio_id, ts)
        else:
            self.socket_writer.write_up(sock_content, radio_id, ts)

    def write_cp(self, sock_content, radio_id=0, ts=None):
        self.pcap_writer.write_cp(sock_content, radio_id, ts)
        self.socket_writer.write_cp(sock_content, radio_id, ts)

    def write_up(self, sock_content, radio_id=0, ts=None):
        self.pcap_writer.write_up(sock_content, radio_id, ts)
        self.socket_writer.write_up(sock_content, radio_id, ts)
