package com.nathan.p2.service;

import com.nathan.p2.domain.Anomaly;
import com.nathan.p2.domain.AnomalyCategory;
import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.AnomalyRepository;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyDetectionService {

    private final KpiAggregateRepository kpiRepository;
    private final AnomalyRepository anomalyRepository;

    public Flux<Anomaly> detectAndSaveAnomalies(Long sessionId) {
        return kpiRepository.findBySessionId(sessionId)
            .collectList()
            .flatMapMany(kpis -> {
                List<Anomaly> anomalies = new ArrayList<>();
                
                // Rule 1: Poor Coverage (RSRP < -105 dBm)
                kpis.stream()
                    .filter(kpi -> "RSRP".equals(kpi.getMetric()) && kpi.getAvgValue() != null && kpi.getAvgValue() < -105)
                    .forEach(kpi -> anomalies.add(Anomaly.builder()
                        .sessionId(sessionId)
                        .category(AnomalyCategory.POOR_COVERAGE)
                        .severity("CRITICAL")
                        .timestamp(kpi.getWindowStart())
                        .latitude(kpi.getLatitude())
                        .longitude(kpi.getLongitude())
                        .detailsJson(String.format("{\"rsrp\": %.2f, \"rat\": \"%s\"}", kpi.getAvgValue(), kpi.getRat()))
                        .build()));
                
                // Rule 2: Weak Signal (RSRP between -105 and -95 dBm)
                kpis.stream()
                    .filter(kpi -> "RSRP".equals(kpi.getMetric()) && kpi.getAvgValue() != null 
                        && kpi.getAvgValue() >= -105 && kpi.getAvgValue() < -95)
                    .forEach(kpi -> anomalies.add(Anomaly.builder()
                        .sessionId(sessionId)
                        .category(AnomalyCategory.WEAK_SIGNAL)
                        .severity("HIGH")
                        .timestamp(kpi.getWindowStart())
                        .latitude(kpi.getLatitude())
                        .longitude(kpi.getLongitude())
                        .detailsJson(String.format("{\"rsrp\": %.2f, \"rat\": \"%s\"}", kpi.getAvgValue(), kpi.getRat()))
                        .build()));
                
                // Rule 3: Poor Quality (RSRQ < -15 dB)
                kpis.stream()
                    .filter(kpi -> "RSRQ".equals(kpi.getMetric()) && kpi.getAvgValue() != null && kpi.getAvgValue() < -15)
                    .forEach(kpi -> anomalies.add(Anomaly.builder()
                        .sessionId(sessionId)
                        .category(AnomalyCategory.POOR_QUALITY)
                        .severity("HIGH")
                        .timestamp(kpi.getWindowStart())
                        .latitude(kpi.getLatitude())
                        .longitude(kpi.getLongitude())
                        .detailsJson(String.format("{\"rsrq\": %.2f, \"rat\": \"%s\"}", kpi.getAvgValue(), kpi.getRat()))
                        .build()));
                
                // Rule 4: Low SINR (< 0 dB)
                kpis.stream()
                    .filter(kpi -> "SINR".equals(kpi.getMetric()) && kpi.getAvgValue() != null && kpi.getAvgValue() < 0)
                    .forEach(kpi -> anomalies.add(Anomaly.builder()
                        .sessionId(sessionId)
                        .category(AnomalyCategory.LOW_SINR)
                        .severity("MEDIUM")
                        .timestamp(kpi.getWindowStart())
                        .latitude(kpi.getLatitude())
                        .longitude(kpi.getLongitude())
                        .detailsJson(String.format("{\"sinr\": %.2f, \"rat\": \"%s\"}", kpi.getAvgValue(), kpi.getRat()))
                        .build()));
                
                // Rule 5: High Handover Failure Rate (> 5%)
                Map<LocalDateTime, List<KpiAggregate>> handoverKpis = kpis.stream()
                    .filter(kpi -> kpi.getMetric().contains("HANDOVER"))
                    .collect(Collectors.groupingBy(KpiAggregate::getWindowStart));
                
                handoverKpis.forEach((time, kpiList) -> {
                    double failureRate = calculateHandoverFailureRate(kpiList);
                    if (failureRate > 5.0) {
                        anomalies.add(Anomaly.builder()
                            .sessionId(sessionId)
                            .category(AnomalyCategory.HANDOVER_FAILURE)
                            .severity("HIGH")
                            .timestamp(time)
                            .detailsJson(String.format("{\"failure_rate\": %.2f}", failureRate))
                            .build());
                    }
                });
                
                // Rule 6: RRC Connection Failure (< 95% success rate)
                Map<LocalDateTime, List<KpiAggregate>> rrcKpis = kpis.stream()
                    .filter(kpi -> kpi.getMetric().contains("RRC"))
                    .collect(Collectors.groupingBy(KpiAggregate::getWindowStart));
                
                rrcKpis.forEach((time, kpiList) -> {
                    double successRate = calculateRrcSuccessRate(kpiList);
                    if (successRate < 95.0) {
                        anomalies.add(Anomaly.builder()
                            .sessionId(sessionId)
                            .category(AnomalyCategory.RRC_FAILURE)
                            .severity("CRITICAL")
                            .timestamp(time)
                            .detailsJson(String.format("{\"success_rate\": %.2f}", successRate))
                            .build());
                    }
                });
                
                // Rule 7: Call Drop (detected from call metrics)
                kpis.stream()
                    .filter(kpi -> "CALL_DROP_RATE".equals(kpi.getMetric()) && kpi.getAvgValue() != null && kpi.getAvgValue() > 2.0)
                    .forEach(kpi -> anomalies.add(Anomaly.builder()
                        .sessionId(sessionId)
                        .category(AnomalyCategory.CALL_DROP)
                        .severity("CRITICAL")
                        .timestamp(kpi.getWindowStart())
                        .latitude(kpi.getLatitude())
                        .longitude(kpi.getLongitude())
                        .detailsJson(String.format("{\"drop_rate\": %.2f}", kpi.getAvgValue()))
                        .build()));
                
                log.info("Detected {} anomalies for session {}", anomalies.size(), sessionId);
                
                return Flux.fromIterable(anomalies)
                    .flatMap(anomalyRepository::save);
            });
    }

    private double calculateHandoverFailureRate(List<KpiAggregate> kpis) {
        long attempts = kpis.stream()
            .filter(kpi -> kpi.getMetric().contains("ATTEMPT"))
            .mapToLong(kpi -> kpi.getAvgValue() != null ? kpi.getAvgValue().longValue() : 0)
            .sum();
        
        long successes = kpis.stream()
            .filter(kpi -> kpi.getMetric().contains("SUCCESS"))
            .mapToLong(kpi -> kpi.getAvgValue() != null ? kpi.getAvgValue().longValue() : 0)
            .sum();
        
        if (attempts == 0) return 0.0;
        return ((attempts - successes) * 100.0) / attempts;
    }

    private double calculateRrcSuccessRate(List<KpiAggregate> kpis) {
        long attempts = kpis.stream()
            .filter(kpi -> kpi.getMetric().contains("ATTEMPT"))
            .mapToLong(kpi -> kpi.getAvgValue() != null ? kpi.getAvgValue().longValue() : 0)
            .sum();
        
        long successes = kpis.stream()
            .filter(kpi -> kpi.getMetric().contains("SUCCESS"))
            .mapToLong(kpi -> kpi.getAvgValue() != null ? kpi.getAvgValue().longValue() : 0)
            .sum();
        
        if (attempts == 0) return 100.0;
        return (successes * 100.0) / attempts;
    }
}
