package com.nathan.p2.controller;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/kpis")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class KpiController {
    
    private final KpiAggregateRepository kpiRepository;

    @GetMapping("/session/{sessionId}")
    public Flux<KpiAggregate> getSessionKpis(@PathVariable Long sessionId) {
        return kpiRepository.findBySessionId(sessionId);
    }

    @GetMapping("/session/{sessionId}/metric/{metric}")
    public Flux<KpiAggregate> getSessionKpisByMetric(
            @PathVariable Long sessionId,
            @PathVariable String metric) {
        return kpiRepository.findBySessionIdAndMetric(sessionId, metric);
    }
}
