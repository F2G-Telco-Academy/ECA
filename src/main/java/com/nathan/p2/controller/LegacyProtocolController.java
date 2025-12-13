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
 * Legacy Protocol Controller (WCDMA, CDMA, GSM)
 * Extracts 3G/2G protocol information from PCAP
 */
@Slf4j
@RestController
@RequestMapping("/api/legacy")
@RequiredArgsConstructor
public class LegacyProtocolController {
    private final SessionRepository sessionRepository;

    @GetMapping("/session/{sessionId}/wcdma-status")
    public Mono<Map<String, Object>> getWcdmaStatus(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                var pcapPath = Paths.get(session.getSessionDir(), "output.pcap");
                
                // Extract WCDMA RRC messages
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-T", "fields",
                    "-e", "frame.number",
                    "-e", "rrc.messageType",
                    "-Y", "rrc",
                    "-r", pcapPath.toString()
                );
                
                Process process = pb.start();
                List<String> messages = new ArrayList<>();
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        messages.add(line);
                    }
                }
                
                process.waitFor();
                
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("protocol", "WCDMA");
                result.put("messages", messages.subList(0, Math.min(20, messages.size())));
                result.put("totalMessages", messages.size());
                return result;
            }));
    }

    @GetMapping("/session/{sessionId}/gsm-status")
    public Mono<Map<String, Object>> getGsmStatus(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                var pcapPath = Paths.get(session.getSessionDir(), "output.pcap");
                
                // Extract GSM messages
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-T", "fields",
                    "-e", "frame.number",
                    "-e", "gsm_a.dtap.msg_rr_type",
                    "-Y", "gsm_a.dtap",
                    "-r", pcapPath.toString()
                );
                
                Process process = pb.start();
                List<String> messages = new ArrayList<>();
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        messages.add(line);
                    }
                }
                
                process.waitFor();
                
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("protocol", "GSM");
                result.put("messages", messages.subList(0, Math.min(20, messages.size())));
                result.put("totalMessages", messages.size());
                return result;
            }));
    }
}
