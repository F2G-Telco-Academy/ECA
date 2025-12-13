package com.nathan.p2.controller;

import com.nathan.p2.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/location")
@RequiredArgsConstructor
public class LocationController {
    private final SessionRepository sessionRepository;

    @GetMapping("/session/{sessionId}/lbs")
    public Mono<Map<String, Object>> getLbsMessages(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "messages", List.of(),
                "type", "LBS"
            ));
    }

    @GetMapping("/session/{sessionId}/lcs")
    public Mono<Map<String, Object>> getLcsMessages(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "messages", List.of(),
                "type", "LCS"
            ));
    }
}
