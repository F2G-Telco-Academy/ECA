package com.nathan.p2.controller;

import com.nathan.p2.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Paths;
import java.util.*;

/**
 * LTE Controller - Extracts LTE RRC and NAS information
 * Uses TShark fields extraction (simplest and most reliable)
 * Pattern: tshark -T fields -e field1 -e field2 -Y filter -r file.pcap
 */
@Slf4j
@RestController
@RequestMapping("/api/lte")
@RequiredArgsConstructor
public class LteController {
    private final SessionRepository sessionRepository;

    @GetMapping("/session/{sessionId}/rrc-state")
    public Mono<Map<String, Object>> getRrcState(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                var pcapPath = Paths.get(session.getSessionDir(), "output.pcap");
                
                // TShark fields extraction for RRC messages
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-T", "fields",
                    "-e", "frame.number",
                    "-e", "frame.time",
                    "-e", "lte-rrc.rrcConnectionRequest_element",
                    "-e", "lte-rrc.rrcConnectionSetup_element",
                    "-e", "lte-rrc.rrcConnectionReconfiguration_element",
                    "-e", "lte-rrc.rrcConnectionRelease_element",
                    "-Y", "lte-rrc",
                    "-r", pcapPath.toString()
                );
                
                Process process = pb.start();
                List<Map<String, String>> transitions = new ArrayList<>();
                String currentState = "IDLE";
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        String[] parts = line.split("\t");
                        if (parts.length >= 2) {
                            Map<String, String> transition = new HashMap<>();
                            transition.put("frame", parts[0]);
                            transition.put("time", parts[1]);
                            
                            // Determine message type and state
                            if (parts.length > 3 && !parts[3].isEmpty()) {
                                transition.put("message", "RRC_CONNECTION_SETUP");
                                currentState = "CONNECTED";
                            } else if (parts.length > 4 && !parts[4].isEmpty()) {
                                transition.put("message", "RRC_CONNECTION_RECONFIGURATION");
                                currentState = "CONNECTED";
                            } else if (parts.length > 5 && !parts[5].isEmpty()) {
                                transition.put("message", "RRC_CONNECTION_RELEASE");
                                currentState = "IDLE";
                            } else if (parts.length > 2 && !parts[2].isEmpty()) {
                                transition.put("message", "RRC_CONNECTION_REQUEST");
                                currentState = "CONNECTING";
                            }
                            
                            transitions.add(transition);
                        }
                    }
                }
                
                process.waitFor();
                
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("currentState", currentState);
                result.put("transitions", transitions);
                result.put("totalMessages", transitions.size());
                return result;
            }));
    }

    @GetMapping("/session/{sessionId}/nas")
    public Mono<Map<String, Object>> getNasMessages(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                var pcapPath = Paths.get(session.getSessionDir(), "output.pcap");
                
                // TShark fields extraction for NAS messages
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-T", "fields",
                    "-e", "frame.number",
                    "-e", "frame.time",
                    "-e", "nas-eps.nas_msg_emm_type",
                    "-e", "nas-eps.nas_msg_esm_type",
                    "-Y", "nas-eps",
                    "-r", pcapPath.toString()
                );
                
                Process process = pb.start();
                List<Map<String, String>> messages = new ArrayList<>();
                int attachReq = 0, attachAcc = 0, tauReq = 0, tauAcc = 0;
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        String[] parts = line.split("\t");
                        if (parts.length >= 3) {
                            Map<String, String> msg = new HashMap<>();
                            msg.put("frame", parts[0]);
                            msg.put("time", parts[1]);
                            
                            String emmType = parts.length > 2 ? parts[2] : "";
                            String esmType = parts.length > 3 ? parts[3] : "";
                            
                            if (!emmType.isEmpty()) {
                                msg.put("type", getNasMessageType(emmType));
                                msg.put("layer", "EMM");
                                
                                if ("0x41".equals(emmType)) attachReq++;
                                else if ("0x42".equals(emmType)) attachAcc++;
                                else if ("0x48".equals(emmType)) tauReq++;
                                else if ("0x49".equals(emmType)) tauAcc++;
                            } else if (!esmType.isEmpty()) {
                                msg.put("type", getEsmMessageType(esmType));
                                msg.put("layer", "ESM");
                            }
                            
                            messages.add(msg);
                        }
                    }
                }
                
                process.waitFor();
                
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("messages", messages);
                result.put("attachSuccess", attachReq > 0 ? (attachAcc * 100.0 / attachReq) : 0.0);
                result.put("tauSuccess", tauReq > 0 ? (tauAcc * 100.0 / tauReq) : 0.0);
                result.put("totalMessages", messages.size());
                result.put("stats", Map.of(
                    "attachRequests", attachReq,
                    "attachAccepts", attachAcc,
                    "tauRequests", tauReq,
                    "tauAccepts", tauAcc
                ));
                return result;
            }));
    }

    private String getNasMessageType(String hexType) {
        return switch (hexType) {
            case "0x41" -> "ATTACH_REQUEST";
            case "0x42" -> "ATTACH_ACCEPT";
            case "0x43" -> "ATTACH_COMPLETE";
            case "0x44" -> "ATTACH_REJECT";
            case "0x48" -> "TAU_REQUEST";
            case "0x49" -> "TAU_ACCEPT";
            case "0x4b" -> "TAU_REJECT";
            case "0x52" -> "SERVICE_REQUEST";
            case "0x53" -> "SERVICE_REJECT";
            case "0x55" -> "GUTI_REALLOCATION_COMMAND";
            case "0x56" -> "GUTI_REALLOCATION_COMPLETE";
            case "0x5d" -> "DETACH_REQUEST";
            case "0x5e" -> "DETACH_ACCEPT";
            case "0x61" -> "SECURITY_MODE_COMMAND";
            default -> hexType;
        };
    }

    private String getEsmMessageType(String hexType) {
        return switch (hexType) {
            case "0xd0" -> "PDN_CONNECTIVITY_REQUEST";
            case "0xd1" -> "PDN_CONNECTIVITY_ACCEPT";
            case "0xd2" -> "PDN_CONNECTIVITY_REJECT";
            default -> hexType;
        };
    }
}
