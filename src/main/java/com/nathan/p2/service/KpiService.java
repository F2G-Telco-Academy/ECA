package com.nathan.p2.service;

import com.nathan.p2.dto.KpiDataDto;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Service for KPI data processing and consolidation.
 * Transforms raw KPI aggregates into structured DTOs for frontend consumption.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KpiService {
    
    private final KpiAggregateRepository kpiRepository;

    /**
     * Get consolidated KPI data for a session.
     * Aggregates all metrics into a single structured response.
     * 
     * @param sessionId Session identifier
     * @return Consolidated KPI data
     */
    public Mono<KpiDataDto> getConsolidatedKpis(Long sessionId) {
        return kpiRepository.findBySessionId(sessionId)
                .collectList()
                .map(kpis -> {
                    var builder = KpiDataDto.builder();
                    
                    kpis.forEach(kpi -> {
                        var metric = kpi.getMetric();
                        var value = kpi.getAvgValue();
                        
                        switch (metric) {
                            // Signal Quality
                            case "RSRP" -> builder.rsrp(value);
                            case "RSRQ" -> builder.rsrq(value);
                            case "SINR" -> builder.sinr(value);
                            case "RSCP" -> builder.rscp(value);
                            case "ECIO" -> builder.ecio(value);
                            case "RXLEV" -> builder.rxlev(value);
                            case "RXQUAL" -> builder.rxqual(value);
                            
                            // Success Rates
                            case "RRC_SR" -> builder.rrcSuccessRate(value);
                            case "RACH_SR" -> builder.rachSuccessRate(value);
                            case "HO_SR" -> builder.handoverSuccessRate(value);
                            case "ERAB_SR" -> builder.erabSuccessRate(value);
                            case "ATTACH_SR" -> builder.attachSuccessRate(value);
                            case "TAU_SR" -> builder.tauSuccessRate(value);
                            
                            // Performance
                            case "LATENCY" -> builder.latency(value);
                            case "PACKET_LOSS" -> builder.packetLoss(value);
                            case "JITTER" -> builder.jitter(value);
                        }
                    });
                    
                    // Extract throughput
                    var dlTp = kpis.stream()
                            .filter(k -> k.getMetric().equals("THROUGHPUT_DL"))
                            .findFirst()
                            .map(k -> k.getAvgValue())
                            .orElse(0.0);
                    
                    var ulTp = kpis.stream()
                            .filter(k -> k.getMetric().equals("THROUGHPUT_UL"))
                            .findFirst()
                            .map(k -> k.getAvgValue())
                            .orElse(0.0);
                    
                    builder.throughput(KpiDataDto.ThroughputDto.builder()
                            .dl(dlTp)
                            .ul(ulTp)
                            .build());
                    
                    // Set RAT from first KPI
                    kpis.stream()
                            .findFirst()
                            .ifPresent(k -> builder.rat(k.getRat()));
                    
                    return builder.build();
                })
                .defaultIfEmpty(KpiDataDto.builder()
                        .throughput(KpiDataDto.ThroughputDto.builder().dl(0.0).ul(0.0).build())
                        .build());
    }
}
