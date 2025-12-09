package com.nathan.p2.controller;

import com.nathan.p2.service.EnhancedKpiExtractionService;
import com.nathan.p2.service.EnhancedKpiExtractionService.KpiResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Enhanced KPI Controller
 * Provides comprehensive KPI extraction using TShark filters
 */
@Slf4j
@RestController
@RequestMapping("/api/kpis")
@RequiredArgsConstructor
@Tag(name = "Enhanced KPIs", description = "Comprehensive KPI extraction APIs")
public class EnhancedKpiController {
    private final EnhancedKpiExtractionService kpiService;

    @GetMapping(value = "/extract", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Extract all KPIs from PCAP file")
    public Mono<KpiResult> extractKpis(@RequestParam String pcapPath) {
        log.info("Extracting KPIs from: {}", pcapPath);
        Path path = Paths.get(pcapPath);
        return kpiService.extractAllKpis(path)
            .doOnSuccess(result -> log.info("Extracted {} success rates, {} counters, {} measurements",
                result.successRates().size(),
                result.counters().size(),
                result.measurements().size()))
            .doOnError(e -> log.error("KPI extraction failed", e));
    }

    @GetMapping(value = "/session/{sessionId}/comprehensive", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get comprehensive KPIs for session")
    public Mono<KpiResult> getSessionKpis(@PathVariable Long sessionId) {
        log.info("Getting comprehensive KPIs for session: {}", sessionId);
        // Find session PCAP file
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        return kpiService.extractAllKpis(pcapPath)
            .doOnError(e -> log.error("Failed to get session KPIs", e));
    }

    @GetMapping(value = "/session/{sessionId}/success-rates", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get success rates only")
    public Mono<java.util.Map<String, Double>> getSuccessRates(@PathVariable Long sessionId) {
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        return kpiService.extractAllKpis(pcapPath)
            .map(KpiResult::successRates);
    }

    @GetMapping(value = "/session/{sessionId}/measurements", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get RF measurements (RSRP, RSRQ, SINR)")
    public Mono<java.util.Map<String, Double>> getMeasurements(@PathVariable Long sessionId) {
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        return kpiService.extractAllKpis(pcapPath)
            .map(KpiResult::measurements);
    }

    @GetMapping(value = "/session/{sessionId}/counters", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get event counters")
    public Mono<java.util.Map<String, Integer>> getCounters(@PathVariable Long sessionId) {
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        return kpiService.extractAllKpis(pcapPath)
            .map(KpiResult::counters);
    }

    @GetMapping(value = "/session/{sessionId}/events/{eventType}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get event details with timestamps")
    public Mono<java.util.List<EnhancedKpiExtractionService.EventDetail>> getEventDetails(
        @PathVariable Long sessionId,
        @PathVariable String eventType
    ) {
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        return kpiService.extractAllKpis(pcapPath)
            .map(result -> result.events().getOrDefault(eventType, java.util.List.of()));
    }
}
