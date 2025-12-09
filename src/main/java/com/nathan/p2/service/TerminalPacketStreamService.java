package com.nathan.p2.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.util.PlatformUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Terminal Packet Stream Service
 * Streams parsed packets to terminal using TShark (like termshark does)
 * 
 * Based on termshark patterns:
 * - PSML for packet list
 * - PDML for packet details
 * - JSON for structured data
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TerminalPacketStreamService {
    private final ToolsConfig config;
    private final ObjectMapper objectMapper;
    
    private final Map<Long, Process> activeStreams = new ConcurrentHashMap<>();
    private final Map<Long, Sinks.Many<String>> sessionSinks = new ConcurrentHashMap<>();

    /**
     * Stream packets in PSML format (packet summary)
     * Command: tshark -r file.pcap -T psml -d udp.port==4729,gsmtap
     */
    public Flux<String> streamPsml(Long sessionId) {
        log.info("Starting PSML stream for session: {}", sessionId);
        
        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
        sessionSinks.put(sessionId, sink);
        
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        try {
            String tsharkPath = PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath());
            ProcessBuilder pb = new ProcessBuilder(
                tsharkPath,
                "-r", pcapPath.toString(),
                "-T", "psml",
                "-d", "udp.port==4729,gsmtap",
                "-Y", "gsmtap"  // Filter for GSMTAP packets
            );
            
            Process process = pb.start();
            activeStreams.put(sessionId, process);
            
            // Read PSML output in background
            new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    StringBuilder packet = new StringBuilder();
                    boolean inPacket = false;
                    
                    while ((line = reader.readLine()) != null) {
                        if (line.contains("<packet>")) {
                            inPacket = true;
                            packet = new StringBuilder();
                        }
                        
                        if (inPacket) {
                            packet.append(line).append("\n");
                        }
                        
                        if (line.contains("</packet>")) {
                            inPacket = false;
                            String psmlPacket = packet.toString();
                            
                            // Parse PSML and emit formatted packet
                            String formatted = formatPsmlPacket(psmlPacket);
                            sink.tryEmitNext(formatted);
                        }
                    }
                    
                    sink.tryEmitComplete();
                } catch (Exception e) {
                    log.error("Error reading PSML stream", e);
                    sink.tryEmitError(e);
                }
            }).start();
            
        } catch (Exception e) {
            log.error("Failed to start PSML stream", e);
            sink.tryEmitError(e);
        }
        
        return sink.asFlux()
            .doOnCancel(() -> stopStream(sessionId))
            .doOnError(e -> log.error("PSML stream error", e));
    }

    /**
     * Stream packets in JSON format (structured data)
     * Command: tshark -r file.pcap -T json -d udp.port==4729,gsmtap
     */
    public Flux<String> streamJson(Long sessionId) {
        log.info("Starting JSON stream for session: {}", sessionId);
        
        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
        sessionSinks.put(sessionId, sink);
        
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        try {
            String tsharkPath = PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath());
            ProcessBuilder pb = new ProcessBuilder(
                tsharkPath,
                "-r", pcapPath.toString(),
                "-T", "json",
                "-d", "udp.port==4729,gsmtap",
                "-Y", "gsmtap",
                "-e", "frame.number",
                "-e", "frame.time",
                "-e", "frame.protocols",
                "-e", "gsmtap.type",
                "-e", "lte-rrc.rsrpResult",
                "-e", "lte-rrc.rsrqResult",
                "-e", "nas_eps.nas_msg_emm_type",
                "-e", "rrc.message"
            );
            
            Process process = pb.start();
            activeStreams.put(sessionId, process);
            
            // Read JSON output in background
            new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    StringBuilder jsonBuilder = new StringBuilder();
                    String line;
                    
                    while ((line = reader.readLine()) != null) {
                        jsonBuilder.append(line);
                    }
                    
                    // Parse JSON array and emit individual packets
                    JsonNode packets = objectMapper.readTree(jsonBuilder.toString());
                    if (packets.isArray()) {
                        for (JsonNode packet : packets) {
                            String formatted = formatJsonPacket(packet);
                            sink.tryEmitNext(formatted);
                        }
                    }
                    
                    sink.tryEmitComplete();
                } catch (Exception e) {
                    log.error("Error reading JSON stream", e);
                    sink.tryEmitError(e);
                }
            }).start();
            
        } catch (Exception e) {
            log.error("Failed to start JSON stream", e);
            sink.tryEmitError(e);
        }
        
        return sink.asFlux()
            .doOnCancel(() -> stopStream(sessionId))
            .doOnError(e -> log.error("JSON stream error", e));
    }

    /**
     * Stream packets in text format (like termshark display)
     */
    public Flux<String> streamText(Long sessionId) {
        log.info("Starting text stream for session: {}", sessionId);
        
        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
        sessionSinks.put(sessionId, sink);
        
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        try {
            String tsharkPath = PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath());
            ProcessBuilder pb = new ProcessBuilder(
                tsharkPath,
                "-r", pcapPath.toString(),
                "-d", "udp.port==4729,gsmtap",
                "-Y", "gsmtap",
                "-V"  // Verbose output
            );
            
            Process process = pb.start();
            activeStreams.put(sessionId, process);
            
            // Read text output in background
            new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sink.tryEmitNext(line);
                    }
                    sink.tryEmitComplete();
                } catch (Exception e) {
                    log.error("Error reading text stream", e);
                    sink.tryEmitError(e);
                }
            }).start();
            
        } catch (Exception e) {
            log.error("Failed to start text stream", e);
            sink.tryEmitError(e);
        }
        
        return sink.asFlux()
            .doOnCancel(() -> stopStream(sessionId))
            .doOnError(e -> log.error("Text stream error", e));
    }

    /**
     * Format PSML packet for terminal display
     */
    private String formatPsmlPacket(String psml) {
        try {
            // Extract key fields from PSML
            String frameNum = extractXmlValue(psml, "num");
            String time = extractXmlValue(psml, "time");
            String protocol = extractXmlValue(psml, "protocol");
            String info = extractXmlValue(psml, "info");
            
            return String.format("[%s] %s %s - %s", frameNum, time, protocol, info);
        } catch (Exception e) {
            return psml;
        }
    }

    /**
     * Format JSON packet for terminal display
     */
    private String formatJsonPacket(JsonNode packet) {
        try {
            JsonNode layers = packet.get("_source").get("layers");
            String frameNum = layers.get("frame.number").get(0).asText();
            String time = layers.get("frame.time").get(0).asText();
            String protocols = layers.get("frame.protocols").get(0).asText();
            
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("\u001B[36m[%s]\u001B[0m ", frameNum));
            sb.append(String.format("\u001B[90m%s\u001B[0m ", time));
            sb.append(String.format("\u001B[33m%s\u001B[0m", protocols));
            
            // Add RSRP/RSRQ if present
            if (layers.has("lte-rrc.rsrpResult")) {
                String rsrp = layers.get("lte-rrc.rsrpResult").get(0).asText();
                double rsrpValue = -180 + Double.parseDouble(rsrp) * 0.0625;
                sb.append(String.format(" \u001B[32mRSRP: %.2f dBm\u001B[0m", rsrpValue));
            }
            
            return sb.toString();
        } catch (Exception e) {
            return packet.toString();
        }
    }

    /**
     * Extract value from XML
     */
    private String extractXmlValue(String xml, String tag) {
        int start = xml.indexOf("<" + tag + ">");
        int end = xml.indexOf("</" + tag + ">");
        if (start != -1 && end != -1) {
            return xml.substring(start + tag.length() + 2, end);
        }
        return "";
    }

    /**
     * Stop streaming for session
     */
    public void stopStream(Long sessionId) {
        Process process = activeStreams.remove(sessionId);
        if (process != null && process.isAlive()) {
            process.destroy();
            log.info("Stopped packet stream for session: {}", sessionId);
        }
        
        Sinks.Many<String> sink = sessionSinks.remove(sessionId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }
}
