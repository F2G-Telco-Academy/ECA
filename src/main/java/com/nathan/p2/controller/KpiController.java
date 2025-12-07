package com.nathan.p2.controller;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.dto.KpiDataDto;
import com.nathan.p2.repository.KpiAggregateRepository;
import com.nathan.p2.service.KpiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/kpis")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "KPI Management", description = "APIs for accessing Key Performance Indicators (KPIs) including signal quality metrics (RSRP, RSRQ, SINR), throughput, success rates, and network performance data. KPIs are calculated from captured network data and aggregated over time windows.")
public class KpiController {
    
    private final KpiAggregateRepository kpiRepository;
    private final KpiService kpiService;

    @Operation(
        summary = "Get consolidated KPI data for a session",
        description = "Returns a comprehensive, structured view of all KPIs for the specified session. This includes signal quality metrics, throughput statistics, success rates, performance metrics, and cell information. Data is consolidated from all time windows and provides the latest values for each metric."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "KPI data retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = KpiDataDto.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found or no KPI data available",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}")
    public Mono<KpiDataDto> getSessionKpis(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId
    ) {
        log.debug("Fetching consolidated KPIs for session: {}", sessionId);
        return kpiService.getConsolidatedKpis(sessionId);
    }

    @Operation(
        summary = "Get all KPI aggregates for a session",
        description = "Returns raw KPI aggregate records for the session. Each aggregate represents a time-windowed calculation of a specific metric. Use this for detailed analysis, time-series data, or when you need access to all historical aggregate values."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "KPI aggregates retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = KpiAggregate.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}/aggregates")
    public Flux<KpiAggregate> getSessionKpiAggregates(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId
    ) {
        log.debug("Fetching KPI aggregates for session: {}", sessionId);
        return kpiRepository.findBySessionId(sessionId);
    }

    @Operation(
        summary = "Get KPI aggregates filtered by RAT",
        description = "Returns KPI aggregates for a specific Radio Access Technology (RAT). Use this to analyze performance metrics for a particular network technology (LTE, 5G NR, WCDMA, or GSM)."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Filtered KPI aggregates retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = KpiAggregate.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found or no data for specified RAT",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}/rat/{rat}")
    public Flux<KpiAggregate> getSessionKpisByRat(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId,
        @Parameter(description = "Radio Access Technology", required = true, example = "LTE", schema = @Schema(allowableValues = {"LTE", "NR", "WCDMA", "GSM"}))
        @PathVariable String rat
    ) {
        log.debug("Fetching KPIs for session {} and RAT: {}", sessionId, rat);
        return kpiRepository.findBySessionIdAndRat(sessionId, rat);
    }

    @Operation(
        summary = "Get KPI aggregates for a specific metric",
        description = "Returns all aggregate values for a single metric across all time windows. Useful for tracking how a specific metric (e.g., RSRP, throughput) changes over time during the session."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Metric-specific aggregates retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = KpiAggregate.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found or metric not available",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}/metric/{metric}")
    public Flux<KpiAggregate> getSessionKpisByMetric(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId,
        @Parameter(description = "Metric name", required = true, example = "RSRP", schema = @Schema(allowableValues = {"RSRP", "RSRQ", "SINR", "THROUGHPUT_DL", "THROUGHPUT_UL", "RRC_CONN_SR", "RACH_SR", "HO_SR"}))
        @PathVariable String metric
    ) {
        log.debug("Fetching KPIs for session {} and metric: {}", sessionId, metric);
        return kpiRepository.findBySessionIdAndMetric(sessionId, metric);
    }

    @Operation(
        summary = "Get KPI aggregates by category",
        description = "Returns KPI aggregates grouped by performance category. Categories include: ACCESSIBILITY (connection setup), MOBILITY (handovers), RETAINABILITY (connection drops), INTEGRITY (signal quality), and PERFORMANCE (throughput/latency)."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Category-filtered aggregates retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = KpiAggregate.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid category specified",
            content = @Content(mediaType = "application/json")
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}/category/{category}")
    public Flux<KpiAggregate> getSessionKpisByCategory(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId,
        @Parameter(description = "KPI category", required = true, example = "INTEGRITY", schema = @Schema(allowableValues = {"ACCESSIBILITY", "MOBILITY", "RETAINABILITY", "INTEGRITY", "PERFORMANCE"}))
        @PathVariable String category
    ) {
        log.debug("Fetching KPIs for session {} and category: {}", sessionId, category);
        return kpiRepository.findBySessionId(sessionId)
                .filter(kpi -> matchesCategory(kpi.getMetric(), category));
    }

    @Operation(
        summary = "Get real-time RF measurements",
        description = "Returns the latest radio frequency measurements for the session, including signal strength (RSRP), signal quality (RSRQ), and signal-to-noise ratio (SINR). This is a convenience endpoint that returns the same data as the consolidated KPIs endpoint."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "RF measurements retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = KpiDataDto.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found or no RF data available",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}/rf")
    public Mono<KpiDataDto> getRfMeasurements(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId
    ) {
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
