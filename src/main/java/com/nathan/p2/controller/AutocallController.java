package com.nathan.p2.controller;

import com.nathan.p2.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/autocall")
@RequiredArgsConstructor
public class AutocallController {
    private final SessionRepository sessionRepository;

    @GetMapping("/session/{sessionId}/kpis")
    public Mono<Map<String, Object>> getKpis(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "callSetupSuccessRate", 0.0,
                "callDropRate", 0.0,
                "totalCalls", 0
            ));
    }
}
