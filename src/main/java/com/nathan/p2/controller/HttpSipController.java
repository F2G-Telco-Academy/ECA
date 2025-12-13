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
 * HTTP/SIP Message Controller
 * Extracts HTTP and SIP protocol messages from PCAP
 * Uses TShark fields extraction for HTTP/SIP protocols
 */
@Slf4j
@RestController
@RequestMapping("/api/http-sip")
@RequiredArgsConstructor
public class HttpSipController {
    private final SessionRepository sessionRepository;

    @GetMapping("/session/{sessionId}/messages")
    public Mono<Map<String, Object>> getHttpSipMessages(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                var pcapPath = Paths.get(session.getSessionDir(), "output.pcap");
                
                // Extract HTTP messages
                List<Map<String, String>> httpMessages = extractHttp(pcapPath);
                
                // Extract SIP messages
                List<Map<String, String>> sipMessages = extractSip(pcapPath);
                
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("httpMessages", httpMessages);
                result.put("sipMessages", sipMessages);
                result.put("totalHttp", httpMessages.size());
                result.put("totalSip", sipMessages.size());
                return result;
            }));
    }

    private List<Map<String, String>> extractHttp(java.nio.file.Path pcapPath) {
        List<Map<String, String>> messages = new ArrayList<>();
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-T", "fields",
                "-e", "frame.number",
                "-e", "frame.time",
                "-e", "http.request.method",
                "-e", "http.request.uri",
                "-e", "http.response.code",
                "-Y", "http",
                "-r", pcapPath.toString()
            );
            
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] parts = line.split("\t");
                    if (parts.length >= 2) {
                        Map<String, String> msg = new HashMap<>();
                        msg.put("frame", parts[0]);
                        msg.put("time", parts[1]);
                        if (parts.length > 2 && !parts[2].isEmpty()) {
                            msg.put("method", parts[2]);
                            msg.put("uri", parts.length > 3 ? parts[3] : "");
                            msg.put("type", "REQUEST");
                        } else if (parts.length > 4 && !parts[4].isEmpty()) {
                            msg.put("code", parts[4]);
                            msg.put("type", "RESPONSE");
                        }
                        messages.add(msg);
                    }
                }
            }
            process.waitFor();
        } catch (Exception e) {
            log.warn("Failed to extract HTTP messages", e);
        }
        return messages;
    }

    private List<Map<String, String>> extractSip(java.nio.file.Path pcapPath) {
        List<Map<String, String>> messages = new ArrayList<>();
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-T", "fields",
                "-e", "frame.number",
                "-e", "frame.time",
                "-e", "sip.Method",
                "-e", "sip.Status-Code",
                "-e", "sip.Call-ID",
                "-Y", "sip",
                "-r", pcapPath.toString()
            );
            
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] parts = line.split("\t");
                    if (parts.length >= 2) {
                        Map<String, String> msg = new HashMap<>();
                        msg.put("frame", parts[0]);
                        msg.put("time", parts[1]);
                        if (parts.length > 2 && !parts[2].isEmpty()) {
                            msg.put("method", parts[2]);
                            msg.put("type", "REQUEST");
                        } else if (parts.length > 3 && !parts[3].isEmpty()) {
                            msg.put("statusCode", parts[3]);
                            msg.put("type", "RESPONSE");
                        }
                        if (parts.length > 4) {
                            msg.put("callId", parts[4]);
                        }
                        messages.add(msg);
                    }
                }
            }
            process.waitFor();
        } catch (Exception e) {
            log.warn("Failed to extract SIP messages", e);
        }
        return messages;
    }
}
