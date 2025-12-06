package com.nathan.p2.controller;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/kpis")
@RequiredArgsConstructor
public class KpiController {
    
    private final KpiAggregateRepository kpiRepository;

    @GetMapping("/session/{sessionId}")
    public Flux<KpiAggregate> getSessionKpis(@PathVariable Long sessionId) {
        return kpiRepository.findBySessionId(sessionId);
    }

    @GetMapping("/session/{sessionId}/rat/{rat}")
    public Flux<KpiAggregate> getSessionKpisByRat(
            @PathVariable Long sessionId,
            @PathVariable String rat) {
        return kpiRepository.findBySessionIdAndRat(sessionId, rat);
    }

    @GetMapping("/session/{sessionId}/metric/{metric}")
    public Flux<KpiAggregate> getSessionKpisByMetric(
            @PathVariable Long sessionId,
            @PathVariable String metric) {
        return kpiRepository.findBySessionIdAndMetric(sessionId, metric);
    }

    @GetMapping("/session/{sessionId}/category/{category}")
    public Flux<KpiAggregate> getSessionKpisByCategory(
            @PathVariable Long sessionId,
            @PathVariable String category) {
        return kpiRepository.findBySessionId(sessionId)
                .filter(kpi -> matchesCategory(kpi.getMetric(), category));
    }

    private boolean matchesCategory(String metric, String category) {
        return switch (category.toUpperCase()) {
            case "ACCESSIBILITY" -> metric.contains("_SR") || metric.contains("RACH") || metric.contains("ERAB");
            case "MOBILITY" -> metric.contains("_HO_") || metric.contains("HANDOVER");
            case "RETAINABILITY" -> metric.contains("DROP") || metric.contains("AB_REL") || metric.contains("REESTABLISHMENT");
            case "INTEGRITY" -> metric.contains("RSRP") || metric.contains("RSRQ") || metric.contains("SINR") || 
                               metric.contains("RSCP") || metric.contains("ECIO") || metric.contains("RXLEV") || metric.contains("RXQUAL");
            case "PERFORMANCE" -> metric.contains("THROUGHPUT") || metric.contains("LATENCY") || 
                                 metric.contains("PACKET_LOSS") || metric.contains("JITTER");
            default -> false;
        };
    }
}
