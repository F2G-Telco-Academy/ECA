package com.nathan.p2.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.dto.SignalingMessageDto;
import com.nathan.p2.service.SessionService;
import com.nathan.p2.util.PlatformUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignalingMessageService {
    private final ToolsConfig config;
    private final ObjectMapper objectMapper;
    private final SessionService sessionService;
    
    private final Map<Long, Process> activeStreams = new ConcurrentHashMap<>();
    private final Map<Long, Sinks.Many<SignalingMessageDto>> sessionSinks = new ConcurrentHashMap<>();

    public Flux<SignalingMessageDto> streamSignaling(Long sessionId) {
        log.info("Starting signaling stream for session: {}", sessionId);
        
        Sinks.Many<SignalingMessageDto> sink = Sinks.many().multicast().onBackpressureBuffer();
        sessionSinks.put(sessionId, sink);
        
        // Find session directory (could be deviceId_timestamp format)
        Path baseDir = Paths.get(config.getStorage().getBaseDir());

        Mono<Path> pcapPathMono = sessionService.getSession(sessionId)
                .map(session -> Paths.get(session.getSessionDir()).resolve("capture.pcap"))
                .filter(Files::exists)
                .switchIfEmpty(Mono.defer(() -> Mono.fromCallable(() -> {
                            try (var stream = Files.list(baseDir)) {
                                return stream
                                        .filter(p -> p.getFileName().toString().contains(String.valueOf(sessionId))
                                                || p.resolve("capture.pcap").toFile().exists())
                                        .map(p -> p.resolve("capture.pcap"))
                                        .filter(Files::exists)
                                        .findFirst()
                                        .orElse(null);
                            }
                        })
                        .subscribeOn(Schedulers.boundedElastic())))
                .subscribeOn(Schedulers.boundedElastic());

        pcapPathMono.subscribe(pcapPath -> {
            if (pcapPath == null || !Files.exists(pcapPath)) {
                log.warn("PCAP file not found for session {}, will emit mock data", sessionId);
                emitMockSignaling(sink);
                sink.tryEmitComplete();
                return;
            }

            try {
                long size = Files.size(pcapPath);
                if (size == 0) {
                    log.warn("PCAP file for session {} is empty, emitting mock data", sessionId);
                    emitMockSignaling(sink);
                    sink.tryEmitComplete();
                    return;
                }
            } catch (Exception e) {
                log.error("Error inspecting PCAP file for session {}", sessionId, e);
                emitMockSignaling(sink);
                sink.tryEmitComplete();
                return;
            }

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
                    "-e", "gsmtap.channel",
                    "-e", "lte-rrc",
                    "-e", "nas-eps",
                    "-e", "nr-rrc"
                );

                Process process = pb.start();
                activeStreams.put(sessionId, process);

                new Thread(() -> {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        StringBuilder jsonBuilder = new StringBuilder();
                        String line;

                        while ((line = reader.readLine()) != null) {
                            jsonBuilder.append(line);
                        }

                        String jsonContent = jsonBuilder.toString();
                        if (jsonContent.isBlank()) {
                            log.warn("No signaling packets decoded for session {}, emitting mock data", sessionId);
                            emitMockSignaling(sink);
                            sink.tryEmitComplete();
                            return;
                        }

                        JsonNode packets = objectMapper.readTree(jsonContent);
                        if (packets.isArray()) {
                            for (JsonNode packet : packets) {
                                SignalingMessageDto msg = parseSignalingMessage(packet);
                                if (msg != null) {
                                    sink.tryEmitNext(msg);
                                }
                            }
                        } else {
                            log.warn("Unexpected signaling output format for session {}, emitting mock data", sessionId);
                            emitMockSignaling(sink);
                        }

                        sink.tryEmitComplete();
                    } catch (Exception e) {
                        log.error("Error reading signaling stream", e);
                        emitMockSignaling(sink);
                        sink.tryEmitComplete();
                    }
                }).start();

            } catch (Exception e) {
                log.error("Failed to start signaling stream", e);
                emitMockSignaling(sink);
                sink.tryEmitComplete();
            }
        }, error -> {
            log.error("Error finding PCAP file", error);
            emitMockSignaling(sink);
            sink.tryEmitComplete();
        });

        return sink.asFlux()
            .doOnCancel(() -> stopStream(sessionId))
            .doOnError(e -> log.error("Signaling stream error", e));
    }

    private SignalingMessageDto parseSignalingMessage(JsonNode packet) {
        try {
            JsonNode layers = packet.get("_source").get("layers");
            if (layers == null) return null;
            
            SignalingMessageDto msg = SignalingMessageDto.builder().build();
            
            // Extract frame info
            JsonNode frameTime = layers.get("frame.time");
            if (frameTime != null && frameTime.isArray() && frameTime.size() > 0) {
                msg.setTimestamp(frameTime.get(0).asText());
            }
            
            // Extract GSMTAP channel
            JsonNode gsmtapChannel = layers.get("gsmtap.channel");
            if (gsmtapChannel != null && gsmtapChannel.isArray() && gsmtapChannel.size() > 0) {
                String channel = gsmtapChannel.get(0).asText();
                msg.setChannel(channel);
                msg.setDirection(channel.contains("UL") ? "UL" : "DL");
            }
            
            // Determine protocol and message type
            if (layers.has("lte-rrc")) {
                msg.setProtocol("LTE-RRC");
                JsonNode rrc = layers.get("lte-rrc");
                msg.setMessageType(extractMessageType(rrc, "lte-rrc"));
                msg.setDetails(rrc);
            } else if (layers.has("nas-eps")) {
                msg.setProtocol("NAS-EPS");
                JsonNode nas = layers.get("nas-eps");
                msg.setMessageType(extractMessageType(nas, "nas-eps"));
                msg.setDetails(nas);
            } else if (layers.has("nr-rrc")) {
                msg.setProtocol("NR-RRC");
                JsonNode nrRrc = layers.get("nr-rrc");
                msg.setMessageType(extractMessageType(nrRrc, "nr-rrc"));
                msg.setDetails(nrRrc);
            }
            
            return msg;
        } catch (Exception e) {
            log.error("Failed to parse signaling message", e);
            return null;
        }
    }

    private String extractMessageType(JsonNode node, String protocol) {
        // Try common message type fields
        String[] typeFields = {
            protocol + ".message",
            protocol + ".messageType",
            "nas_eps.nas_msg_emm_type",
            "nas_eps.nas_msg_esm_type"
        };
        
        for (String field : typeFields) {
            if (node.has(field)) {
                JsonNode typeNode = node.get(field);
                if (typeNode.isArray() && typeNode.size() > 0) {
                    return typeNode.get(0).asText();
                } else if (typeNode.isTextual()) {
                    return typeNode.asText();
                }
            }
        }
        
        return "Unknown";
    }

    public void stopStream(Long sessionId) {
        Process process = activeStreams.remove(sessionId);
        if (process != null && process.isAlive()) {
            process.destroy();
            log.info("Stopped signaling stream for session: {}", sessionId);
        }
        
        Sinks.Many<SignalingMessageDto> sink = sessionSinks.remove(sessionId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }
    
    private void emitMockSignaling(Sinks.Many<SignalingMessageDto> sink) {
        // Emit mock messages every 2 seconds for testing
        new Thread(() -> {
            try {
                String[] messages = {
                    "RRCConnectionRequest", "RRCConnectionSetup", "RRCConnectionSetupComplete",
                    "AttachRequest", "AttachAccept", "MeasurementReport"
                };
                String[] channels = {"UL_DCCH", "DL_DCCH", "UL_DCCH", "UL_DCCH", "DL_DCCH", "UL_DCCH"};
                String[] protocols = {"RRC", "RRC", "RRC", "NAS", "NAS", "RRC"};
                
                for (int i = 0; i < messages.length; i++) {
                    Thread.sleep(2000);
                    SignalingMessageDto msg = SignalingMessageDto.builder()
                        .timestamp(java.time.LocalDateTime.now().toString())
                        .channel(channels[i])
                        .direction(channels[i].contains("UL") ? "UL" : "DL")
                        .protocol(protocols[i])
                        .messageType(messages[i])
                        .details(objectMapper.createObjectNode().put("mock", true))
                        .build();
                    sink.tryEmitNext(msg);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }
}
