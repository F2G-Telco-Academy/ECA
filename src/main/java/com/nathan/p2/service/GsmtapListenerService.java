package com.nathan.p2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.SocketException;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * GSMTAP UDP Listener Service
 * Listens for GSMTAP packets from SCAT on UDP port 4729
 * and streams them to WebSocket clients while writing to PCAP files
 * 
 * GSMTAP Protocol: https://osmocom.org/projects/baseband/wiki/GSMTAP
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GsmtapListenerService {
    
    private static final int GSMTAP_PORT = 4729;
    private static final int BUFFER_SIZE = 65536;
    private static final int MAX_PACKET_SIZE = 4096;
    
    private final ObjectMapper objectMapper;
    private final Map<Long, SessionCapture> activeSessions = new ConcurrentHashMap<>();
    private final AtomicBoolean running = new AtomicBoolean(false);
    
    private DatagramSocket socket;
    private Thread listenerThread;
    
    @PostConstruct
    public void init() {
        // Don't auto-start, wait for explicit startListener() call
        log.info("🎧 GSMTAP Listener initialized (port: {})", GSMTAP_PORT);
    }
    
    /**
     * Start UDP listener for GSMTAP packets
     */
    public void startListener() throws SocketException {
        if (running.get()) {
            log.warn("GSMTAP listener already running");
            return;
        }
        
        socket = new DatagramSocket(GSMTAP_PORT);
        running.set(true);
        
        listenerThread = new Thread(this::listenLoop, "GSMTAP-Listener");
        listenerThread.setDaemon(true);
        listenerThread.start();
        
        log.info("✅ GSMTAP Listener started on port {}", GSMTAP_PORT);
    }
    
    /**
     * Main listening loop
     */
    private void listenLoop() {
        byte[] buffer = new byte[BUFFER_SIZE];
        
        while (running.get() && !Thread.currentThread().isInterrupted()) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);
                
                byte[] data = new byte[packet.getLength()];
                System.arraycopy(buffer, 0, data, 0, packet.getLength());
                
                // Process GSMTAP packet
                processGsmtapPacket(data);
                
            } catch (IOException e) {
                if (running.get()) {
                    log.error("Error receiving GSMTAP packet", e);
                }
            }
        }
        
        log.info("GSMTAP listener loop ended");
    }
    
    /**
     * Process received GSMTAP packet
     */
    private void processGsmtapPacket(byte[] data) {
        try {
            GsmtapPacket gsmtap = parseGsmtapHeader(data);
            
            // Distribute to all active session captures
            activeSessions.values().forEach(session -> {
                try {
                    // Write to PCAP file
                    session.writePcapPacket(data);
                    
                    // Stream to WebSocket clients
                    session.sink.tryEmitNext(gsmtap);
                    
                } catch (Exception e) {
                    log.error("Error processing packet for session {}", session.sessionId, e);
                }
            });
            
        } catch (Exception e) {
            log.error("Error processing GSMTAP packet", e);
        }
    }
    
    /**
     * Parse GSMTAP header structure
     * 
     * GSMTAP Header Format (v2/v3):
     * - version (1 byte)
     * - header length (1 byte)
     * - type (1 byte): RRC, NAS, MAC, etc.
     * - timeslot (1 byte)
     * - ARFCN (2 bytes)
     * - signal_dbm (1 byte)
     * - snr_db (1 byte)
     * - frame_number (4 bytes)
     * - sub_type (1 byte)
     * - antenna_nr (1 byte)
     * - sub_slot (1 byte)
     * - res (1 byte)
     */
    private GsmtapPacket parseGsmtapHeader(byte[] data) {
        if (data.length < 16) {
            throw new IllegalArgumentException("GSMTAP packet too short");
        }
        
        ByteBuffer buffer = ByteBuffer.wrap(data);
        
        GsmtapPacket packet = new GsmtapPacket();
        packet.version = buffer.get() & 0xFF;
        packet.headerLength = buffer.get() & 0xFF;
        packet.type = buffer.get() & 0xFF;
        packet.timeslot = buffer.get() & 0xFF;
        packet.arfcn = buffer.getShort() & 0xFFFF;
        packet.signalDbm = buffer.get();
        packet.snrDb = buffer.get();
        packet.frameNumber = buffer.getInt();
        packet.subType = buffer.get() & 0xFF;
        packet.antennaNr = buffer.get() & 0xFF;
        packet.subSlot = buffer.get() & 0xFF;
        packet.reserved = buffer.get() & 0xFF;
        
        // Extract payload
        int payloadStart = packet.headerLength;
        if (payloadStart < data.length) {
            packet.payload = new byte[data.length - payloadStart];
            System.arraycopy(data, payloadStart, packet.payload, 0, packet.payload.length);
        }
        
        packet.timestamp = Instant.now().toEpochMilli();
        packet.typeName = getGsmtapTypeName(packet.type);
        packet.rat = detectRat(packet.type, packet.subType);
        
        return packet;
    }
    
    /**
     * Get GSMTAP type name
     */
    private String getGsmtapTypeName(int type) {
        switch (type) {
            case 0x01: return "UM";           // GSM Um interface
            case 0x02: return "ABIS";         // GSM Abis interface
            case 0x03: return "UM_BURST";     // GSM Um burst
            case 0x04: return "SIM";          // SIM card
            case 0x05: return "TETRA_I1";     // TETRA
            case 0x06: return "TETRA_I1_BURST";
            case 0x07: return "WMX_BURST";    // WiMAX
            case 0x08: return "GB_LLC";       // GPRS Gb interface
            case 0x09: return "GB_SNDCP";
            case 0x0A: return "GMR1_UM";      // GMR-1
            case 0x0B: return "UMTS_RLC_MAC"; // UMTS
            case 0x0C: return "UMTS_RRC";     // UMTS RRC
            case 0x0D: return "LTE_RRC";      // LTE RRC
            case 0x0E: return "LTE_MAC";      // LTE MAC
            case 0x0F: return "LTE_MAC_FRAMED";
            case 0x10: return "OSMOCORE_LOG"; // Logging
            case 0x11: return "QC_DIAG";      // Qualcomm DIAG
            case 0x12: return "LTE_NAS";      // LTE NAS
            case 0x13: return "5GNR_RRC";     // 5G NR RRC
            case 0x14: return "5GNR_MAC";     // 5G NR MAC
            case 0x15: return "5GNR_NAS";     // 5G NR NAS
            default: return "UNKNOWN_" + type;
        }
    }
    
    /**
     * Detect RAT (Radio Access Technology) from GSMTAP type
     */
    private String detectRat(int type, int subType) {
        switch (type) {
            case 0x01: case 0x02: case 0x03: case 0x08: case 0x09:
                return "GSM";
            case 0x0B: case 0x0C:
                return "WCDMA";
            case 0x0D: case 0x0E: case 0x0F: case 0x12:
                return "LTE";
            case 0x13: case 0x14: case 0x15:
                return "5GNR";
            default:
                return "UNKNOWN";
        }
    }
    
    /**
     * Start capturing for a session
     */
    public Flux<GsmtapPacket> startSessionCapture(Long sessionId, Path outputPcap) {
        log.info("📦 Starting GSMTAP capture for session: {}", sessionId);
        
        SessionCapture capture = new SessionCapture(sessionId, outputPcap);
        activeSessions.put(sessionId, capture);
        
        return capture.sink.asFlux()
            .doOnCancel(() -> {
                log.info("Client disconnected from session {}", sessionId);
            })
            .doOnTerminate(() -> {
                log.info("Stream terminated for session {}", sessionId);
            });
    }
    
    /**
     * Stop capturing for a session
     */
    public void stopSessionCapture(Long sessionId) {
        SessionCapture capture = activeSessions.remove(sessionId);
        if (capture != null) {
            capture.close();
            log.info("✅ Stopped GSMTAP capture for session: {}", sessionId);
        }
    }
    
    /**
     * Stop the listener
     */
    @PreDestroy
    public void stopListener() {
        if (!running.get()) {
            return;
        }
        
        log.info("⏹️ Stopping GSMTAP listener...");
        running.set(false);
        
        // Close all active sessions
        activeSessions.values().forEach(SessionCapture::close);
        activeSessions.clear();
        
        // Close socket
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
        
        // Interrupt listener thread
        if (listenerThread != null) {
            listenerThread.interrupt();
        }
        
        log.info("✅ GSMTAP listener stopped");
    }
    
    /**
     * GSMTAP Packet representation
     */
    public static class GsmtapPacket {
        public int version;
        public int headerLength;
        public int type;
        public String typeName;
        public String rat;
        public int timeslot;
        public int arfcn;
        public byte signalDbm;
        public byte snrDb;
        public int frameNumber;
        public int subType;
        public int antennaNr;
        public int subSlot;
        public int reserved;
        public byte[] payload;
        public long timestamp;
        
        public Map<String, Object> toMap() {
            Map<String, Object> map = new HashMap<>();
            map.put("version", version);
            map.put("type", type);
            map.put("typeName", typeName);
            map.put("rat", rat);
            map.put("arfcn", arfcn);
            map.put("signalDbm", signalDbm);
            map.put("snrDb", snrDb);
            map.put("frameNumber", frameNumber);
            map.put("timestamp", timestamp);
            map.put("payloadSize", payload != null ? payload.length : 0);
            return map;
        }
    }
    
    /**
     * Session capture state
     */
    private static class SessionCapture {
        final Long sessionId;
        final Path outputPcap;
        final Sinks.Many<GsmtapPacket> sink;
        private ByteArrayOutputStream pcapBuffer;
        private boolean pcapHeaderWritten = false;
        
        SessionCapture(Long sessionId, Path outputPcap) {
            this.sessionId = sessionId;
            this.outputPcap = outputPcap;
            this.sink = Sinks.many().multicast().onBackpressureBuffer();
            this.pcapBuffer = new ByteArrayOutputStream();
            
            try {
                writePcapGlobalHeader();
            } catch (IOException e) {
                log.error("Failed to write PCAP header", e);
            }
        }
        
        private void writePcapGlobalHeader() throws IOException {
            // PCAP Global Header
            ByteBuffer header = ByteBuffer.allocate(24);
            header.putInt(0xa1b2c3d4);      // Magic number
            header.putShort((short) 2);      // Major version
            header.putShort((short) 4);      // Minor version
            header.putInt(0);                // Timezone
            header.putInt(0);                // Sigfigs
            header.putInt(65535);            // Snaplen
            header.putInt(1);                // Network (Ethernet)
            
            pcapBuffer.write(header.array());
            pcapHeaderWritten = true;
        }
        
        synchronized void writePcapPacket(byte[] data) throws IOException {
            long ts = System.currentTimeMillis();
            int tsSec = (int) (ts / 1000);
            int tsUsec = (int) ((ts % 1000) * 1000);
            
            // PCAP Packet Header
            ByteBuffer header = ByteBuffer.allocate(16);
            header.putInt(tsSec);            // Timestamp seconds
            header.putInt(tsUsec);           // Timestamp microseconds
            header.putInt(data.length);      // Captured length
            header.putInt(data.length);      // Original length
            
            pcapBuffer.write(header.array());
            pcapBuffer.write(data);
            
            // Flush to file periodically (every 100 packets or 1MB)
            if (pcapBuffer.size() > 1024 * 1024) {
                flushToFile();
            }
        }
        
        private void flushToFile() throws IOException {
            if (pcapBuffer.size() == 0) return;
            
            Files.write(outputPcap, pcapBuffer.toByteArray(), 
                StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            pcapBuffer.reset();
            
            // Re-write header if needed
            if (pcapHeaderWritten) {
                writePcapGlobalHeader();
            }
        }
        
        void close() {
            try {
                flushToFile();
            } catch (IOException e) {
                log.error("Error flushing PCAP on close", e);
            }
            sink.tryEmitComplete();
        }
    }
}
