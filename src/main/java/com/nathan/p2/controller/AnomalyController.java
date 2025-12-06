package com.nathan.p2.controller;

import com.nathan.p2.domain.Anomaly;
import com.nathan.p2.repository.AnomalyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/anomalies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnomalyController {
    
    private final AnomalyRepository anomalyRepository;

    @GetMapping("/session/{sessionId}")
    public Flux<Anomaly> getSessionAnomalies(@PathVariable Long sessionId) {
        return anomalyRepository.findBySessionId(sessionId);
    }
}
