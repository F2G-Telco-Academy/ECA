package com.nathan.p2.controller;

import com.nathan.p2.repository.KpiAggregateRepository;
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
    private final KpiAggregateRepository kpiAggregateRepository;

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

    @GetMapping(value = "/session/{sessionId}/by-cell", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get KPIs grouped by cell ID", 
               description = "Returns KPI statistics aggregated per cell for drive testing analysis")
    public Mono<java.util.Map<String, CellKpiStats>> getKpisByCell(@PathVariable Long sessionId) {
        log.info("Getting per-cell KPIs for session: {}", sessionId);
        return kpiAggregateRepository.findBySessionId(sessionId)
            .collectList()
            .map(aggregates -> {
                java.util.Map<String, CellKpiStats> cellStats = new java.util.HashMap<>();
                
                if (aggregates == null || aggregates.isEmpty()) {
                    log.debug("No KPI aggregates found for session: {}", sessionId);
                    return cellStats; // Return empty map
                }
                
                // Group by cell ID
                aggregates.stream()
                    .filter(agg -> agg.getCellId() != null && !agg.getCellId().isEmpty())
                    .collect(java.util.stream.Collectors.groupingBy(
                        com.nathan.p2.domain.KpiAggregate::getCellId
                    ))
                    .forEach((cellId, cellAggregates) -> {
                        CellKpiStats stats = calculateCellStats(cellId, cellAggregates);
                        cellStats.put(cellId, stats);
                    });
                
                return cellStats;
            })
            .onErrorResume(e -> {
                log.error("Error getting per-cell KPIs for session {}: {}", sessionId, e.getMessage());
                return Mono.just(new java.util.HashMap<>()); // Return empty map on error
            });
    }

    private CellKpiStats calculateCellStats(String cellId, java.util.List<com.nathan.p2.domain.KpiAggregate> aggregates) {
        if (aggregates.isEmpty()) {
            return new CellKpiStats(cellId, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, null, null, "Unknown");
        }

        double avgRsrp = aggregates.stream()
            .filter(a -> a.getRsrp() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getRsrp)
            .average().orElse(0);
        
        double minRsrp = aggregates.stream()
            .filter(a -> a.getRsrp() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getRsrp)
            .min().orElse(0);
        
        double maxRsrp = aggregates.stream()
            .filter(a -> a.getRsrp() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getRsrp)
            .max().orElse(0);

        double avgRsrq = aggregates.stream()
            .filter(a -> a.getRsrq() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getRsrq)
            .average().orElse(0);
        
        double minRsrq = aggregates.stream()
            .filter(a -> a.getRsrq() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getRsrq)
            .min().orElse(0);
        
        double maxRsrq = aggregates.stream()
            .filter(a -> a.getRsrq() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getRsrq)
            .max().orElse(0);

        double avgSinr = aggregates.stream()
            .filter(a -> a.getSinr() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getSinr)
            .average().orElse(0);
        
        double minSinr = aggregates.stream()
            .filter(a -> a.getSinr() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getSinr)
            .min().orElse(0);
        
        double maxSinr = aggregates.stream()
            .filter(a -> a.getSinr() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getSinr)
            .max().orElse(0);

        double avgRssi = aggregates.stream()
            .filter(a -> a.getRssi() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getRssi)
            .average().orElse(0);

        double avgCqi = aggregates.stream()
            .filter(a -> a.getCqi() != null)
            .mapToDouble(com.nathan.p2.domain.KpiAggregate::getCqi)
            .average().orElse(0);

        Integer pci = aggregates.stream()
            .filter(a -> a.getPci() != null)
            .map(com.nathan.p2.domain.KpiAggregate::getPci)
            .findFirst().orElse(null);

        Integer earfcn = aggregates.stream()
            .filter(a -> a.getEarfcn() != null)
            .map(com.nathan.p2.domain.KpiAggregate::getEarfcn)
            .findFirst().orElse(null);

        // TAC not available in KpiAggregate
        Integer tac = null;

        int sampleCount = aggregates.size();

        String quality = avgRsrp >= -80 ? "Excellent" :
                        avgRsrp >= -90 ? "Good" :
                        avgRsrp >= -100 ? "Fair" : "Poor";

        return new CellKpiStats(
            cellId, sampleCount,
            avgRsrp, minRsrp, maxRsrp,
            avgRsrq, minRsrq, maxRsrq,
            avgSinr, minSinr, maxSinr,
            avgRssi, avgCqi,
            pci, earfcn,
            quality
        );
    }

    public record CellKpiStats(
        String cellId,
        int sampleCount,
        double avgRsrp,
        double minRsrp,
        double maxRsrp,
        double avgRsrq,
        double minRsrq,
        double maxRsrq,
        double avgSinr,
        double minSinr,
        double maxSinr,
        double avgRssi,
        double avgCqi,
        Integer pci,
        Integer earfcn,
        String quality
    ) {}
}
