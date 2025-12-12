package com.nathan.p2.controller;

import com.nathan.p2.repository.SessionRepository;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/rf")
@RequiredArgsConstructor
public class RfController {
    private final SessionRepository sessionRepository;
    private final KpiAggregateRepository kpiRepository;

    @GetMapping("/session/{sessionId}/nrdc-summary")
    public Mono<Map<String, Object>> getNrdcSummary(@PathVariable Long sessionId) {
        return kpiRepository.findBySessionId(sessionId)
            .collectList()
            .map(kpis -> {
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("nrRsrp", kpis.stream()
                    .filter(k -> "NR_RSRP".equals(k.getMetric()))
                    .findFirst()
                    .map(k -> k.getAvgValue())
                    .orElse(-140.0));
                result.put("lteRsrp", kpis.stream()
                    .filter(k -> "RSRP".equals(k.getMetric()))
                    .findFirst()
                    .map(k -> k.getAvgValue())
                    .orElse(-140.0));
                result.put("mode", "NRDC");
                return result;
            });
    }

    @GetMapping("/session/{sessionId}/beamforming")
    public Mono<Map<String, Object>> getBeamforming(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "beamCount", 4,
                "activeBeam", 1,
                "message", "5GNR beamforming information"
            ));
    }

    @GetMapping("/session/{sessionId}/dss")
    public Mono<Map<String, Object>> getDss(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "enabled", false,
                "message", "Dynamic Spectrum Sharing status"
            ));
    }
}
