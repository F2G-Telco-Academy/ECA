package com.nathan.p2.controller;

import com.nathan.p2.domain.*;
import com.nathan.p2.repository.AnomalyRepository;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class MapDataController {

    private final KpiAggregateRepository kpiRepository;
    private final AnomalyRepository anomalyRepository;

    @GetMapping("/sessions/{sessionId}/kpis")
    public Mono<GeoJsonFeatureCollection> getKpiMapData(@PathVariable Long sessionId) {
        return kpiRepository.findBySessionId(sessionId)
            .filter(kpi -> kpi.getLatitude() != null && kpi.getLongitude() != null)
            .map(this::toGeoJsonFeature)
            .collectList()
            .map(GeoJsonFeatureCollection::new);
    }

    @GetMapping("/sessions/{sessionId}/anomalies")
    public Mono<GeoJsonFeatureCollection> getAnomalyMapData(@PathVariable Long sessionId) {
        return anomalyRepository.findBySessionId(sessionId)
            .filter(anomaly -> anomaly.getLatitude() != null && anomaly.getLongitude() != null)
            .map(this::anomalyToGeoJsonFeature)
            .collectList()
            .map(GeoJsonFeatureCollection::new);
    }

    @GetMapping("/sessions/{sessionId}/combined")
    public Mono<Map<String, GeoJsonFeatureCollection>> getCombinedMapData(@PathVariable Long sessionId) {
        Mono<GeoJsonFeatureCollection> kpis = getKpiMapData(sessionId);
        Mono<GeoJsonFeatureCollection> anomalies = getAnomalyMapData(sessionId);
        
        return Mono.zip(kpis, anomalies)
            .map(tuple -> {
                Map<String, GeoJsonFeatureCollection> result = new HashMap<>();
                result.put("kpis", tuple.getT1());
                result.put("anomalies", tuple.getT2());
                return result;
            });
    }

    private GeoJsonFeature toGeoJsonFeature(KpiAggregate kpi) {
        Map<String, Object> properties = new HashMap<>();
        properties.put("metric", kpi.getMetric());
        properties.put("value", kpi.getAvgValue());
        properties.put("min", kpi.getMinValue());
        properties.put("max", kpi.getMaxValue());
        properties.put("rat", kpi.getRat());
        properties.put("timestamp", kpi.getWindowStart().toString());
        properties.put("cellId", kpi.getCellId());
        properties.put("pci", kpi.getPci());
        properties.put("cluster", determineCluster(kpi));
        properties.put("color", getColorForKpi(kpi));
        
        return GeoJsonFeature.builder()
            .type("Feature")
            .geometry(GeoJsonGeometry.builder()
                .type("Point")
                .coordinates(new double[]{kpi.getLongitude(), kpi.getLatitude()})
                .build())
            .properties(properties)
            .build();
    }

    private GeoJsonFeature anomalyToGeoJsonFeature(Anomaly anomaly) {
        Map<String, Object> properties = new HashMap<>();
        properties.put("category", anomaly.getCategory());
        properties.put("severity", anomaly.getSeverity());
        properties.put("timestamp", anomaly.getTimestamp().toString());
        properties.put("details", anomaly.getDetailsJson());
        properties.put("icon", getIconForAnomaly(anomaly));
        properties.put("color", getColorForSeverity(anomaly.getSeverity()));
        
        return GeoJsonFeature.builder()
            .type("Feature")
            .geometry(GeoJsonGeometry.builder()
                .type("Point")
                .coordinates(new double[]{anomaly.getLongitude(), anomaly.getLatitude()})
                .build())
            .properties(properties)
            .build();
    }

    private int determineCluster(KpiAggregate kpi) {
        if (!"RSRP".equals(kpi.getMetric()) || kpi.getAvgValue() == null) {
            return 1; // Default cluster
        }
        
        double rsrp = kpi.getAvgValue();
        if (rsrp >= -85) return 3;  // Excellent
        if (rsrp >= -95) return 2;  // Good
        if (rsrp >= -105) return 1; // Moderate
        return 0; // Poor
    }

    private String getColorForKpi(KpiAggregate kpi) {
        if (!"RSRP".equals(kpi.getMetric()) || kpi.getAvgValue() == null) {
            return "#3186cc"; // Blue default
        }
        
        double rsrp = kpi.getAvgValue();
        if (rsrp >= -85) return "#33FF57";  // Green - Excellent
        if (rsrp >= -95) return "#3186cc";  // Blue - Good
        if (rsrp >= -105) return "#FF5733"; // Orange - Moderate
        return "#FF0000"; // Red - Poor
    }

    private String getColorForSeverity(String severity) {
        return switch (severity) {
            case "CRITICAL" -> "#FF0000";
            case "HIGH" -> "#FF5733";
            case "MEDIUM" -> "#FFA500";
            default -> "#FFFF00";
        };
    }

    private String getIconForAnomaly(Anomaly anomaly) {
        return switch (anomaly.getCategory()) {
            case POOR_COVERAGE -> "signal-slash";
            case WEAK_SIGNAL -> "signal-weak";
            case HANDOVER_FAILURE -> "exchange-alt";
            case CALL_DROP -> "phone-slash";
            case RRC_FAILURE -> "exclamation-triangle";
            default -> "exclamation-circle";
        };
    }
}
