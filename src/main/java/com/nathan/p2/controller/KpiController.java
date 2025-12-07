package com.nathan.p2.controller;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.dto.KpiDataDto;
import com.nathan.p2.repository.KpiAggregateRepository;
import com.nathan.p2.service.KpiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * REST controller for KPI (Key Performance Indicator) data.
 * Provides access to network performance metrics and aggregates.
 */
@Slf4j
@RestController
@RequestMapping("/api/kpis")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class KpiController {
    
    private final KpiAggregateRepository kpiRepository;
    private final KpiService kpiService;

    /**
     * Get consolidated KPI data for a session.
     * Returns latest values for all metrics in a structured format.
     * @param sessionId Session identifier
     * @return Consolidated KPI data
     */
    @GetMapping("/session/{sessionId}")
    public Mono<KpiDataDto> getSessionKpis(@PathVariable Long sessionId) {
        log.debug("Fetching consolidated KPIs for session: {}", sessionId);
        return kpiService.getConsolidatedKpis(sessionId);
    }

    /**
     * Get all KPI aggregates for a session.
     * @param sessionId Session identifier
     * @return All KPI aggregates
     */
    @GetMapping("/session/{sessionId}/aggregates")
    public Flux<KpiAggregate> getSessionKpiAggregates(@PathVariable Long sessionId) {
        log.debug("Fetching KPI aggregates for session: {}", sessionId);
        return kpiRepository.findBySessionId(sessionId);
    }

    /**
     * Get KPI aggregates filtered by RAT (Radio Access Technology).
     * @param sessionId Session identifier
     * @param rat RAT type (LTE, NR, WCDMA, GSM)
     * @return Filtered KPI aggregates
     */
    @GetMapping("/session/{sessionId}/rat/{rat}")
    public Flux<KpiAggregate> getSessionKpisByRat(
            @PathVariable Long sessionId,
            @PathVariable String rat) {
        log.debug("Fetching KPIs for session {} and RAT: {}", sessionId, rat);
        return kpiRepository.findBySessionIdAndRat(sessionId, rat);
    }

    /**
     * Get KPI aggregates for a specific metric.
     * @param sessionId Session identifier
     * @param metric Metric name (e.g., RSRP, RSRQ, THROUGHPUT_DL)
     * @return Metric-specific aggregates
     */
    @GetMapping("/session/{sessionId}/metric/{metric}")
    public Flux<KpiAggregate> getSessionKpisByMetric(
            @PathVariable Long sessionId,
            @PathVariable String metric) {
        log.debug("Fetching KPIs for session {} and metric: {}", sessionId, metric);
        return kpiRepository.findBySessionIdAndMetric(sessionId, metric);
    }

    /**
     * Get KPI aggregates by category.
     * @param sessionId Session identifier
     * @param category Category (ACCESSIBILITY, MOBILITY, RETAINABILITY, INTEGRITY, PERFORMANCE)
     * @return Category-filtered aggregates
     */
    @GetMapping("/session/{sessionId}/category/{category}")
    public Flux<KpiAggregate> getSessionKpisByCategory(
            @PathVariable Long sessionId,
            @PathVariable String category) {
        log.debug("Fetching KPIs for session {} and category: {}", sessionId, category);
        return kpiRepository.findBySessionId(sessionId)
                .filter(kpi -> matchesCategory(kpi.getMetric(), category));
    }

    /**
     * Get real-time RF measurements for a session.
     * @param sessionId Session identifier
     * @return Latest RF measurements
     */
    @GetMapping("/session/{sessionId}/rf")
    public Mono<KpiDataDto> getRfMeasurements(@PathVariable Long sessionId) {
        log.debug("Fetching RF measurements for session: {}", sessionId);
        return kpiService.getConsolidatedKpis(sessionId);
    }

    private boolean matchesCategory(String metric, String category) {
        return switch (category.toUpperCase()) {
            case "ACCESSIBILITY" -> metric.contains("_SR") || metric.contains("RACH") || 
                                   metric.contains("ERAB") || metric.contains("ATTACH");
            case "MOBILITY" -> metric.contains("_HO_") || metric.contains("HANDOVER") || 
                              metric.contains("TAU");
            case "RETAINABILITY" -> metric.contains("DROP") || metric.contains("AB_REL") || 
                                   metric.contains("REESTABLISHMENT");
            case "INTEGRITY" -> metric.contains("RSRP") || metric.contains("RSRQ") || 
                               metric.contains("SINR") || metric.contains("RSCP") || 
                               metric.contains("ECIO") || metric.contains("RXLEV") || 
                               metric.contains("RXQUAL");
            case "PERFORMANCE" -> metric.contains("THROUGHPUT") || metric.contains("LATENCY") || 
                                 metric.contains("PACKET_LOSS") || metric.contains("JITTER");
            default -> false;
        };
    }
}
