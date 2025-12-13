package com.nathan.p2.controller;

import com.nathan.p2.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/smartapp")
@RequiredArgsConstructor
public class SmartAppController {
    private final SessionRepository sessionRepository;

    @GetMapping("/session/{sessionId}/messages")
    public Mono<Map<String, Object>> getMessages(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "messages", List.of(),
                "total", 0
            ));
    }

    @GetMapping("/session/{sessionId}/status")
    public Mono<Map<String, Object>> getStatus(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "status", "INACTIVE"
            ));
    }

    @GetMapping("/session/{sessionId}/bluetooth")
    public Mono<Map<String, Object>> getBluetooth(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "devices", List.of()
            ));
    }

    @GetMapping("/session/{sessionId}/wifi-scan")
    public Mono<Map<String, Object>> getWifiScan(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "networks", List.of()
            ));
    }
}
