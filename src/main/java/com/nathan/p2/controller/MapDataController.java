package com.nathan.p2.controller;

import com.nathan.p2.domain.*;
import com.nathan.p2.repository.AnomalyRepository;
import com.nathan.p2.repository.KpiAggregateRepository;
import com.nathan.p2.service.ElbowMethodService;
import com.nathan.p2.service.KMeansClusteringService;
import com.nathan.p2.service.MapVisualizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class MapDataController {

    private final KpiAggregateRepository kpiRepository;
    private final AnomalyRepository anomalyRepository;
    private final KMeansClusteringService clusteringService;
    private final ElbowMethodService elbowMethodService;
    private final MapVisualizationService mapVisualizationService;

    @PostMapping("/sessions/{sessionId}/cluster")
    public Mono<KMeansClusteringService.ClusterResult> performClustering(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "4") int numClusters) {
        return clusteringService.performClustering(sessionId, numClusters);
    }

    @GetMapping("/sessions/{sessionId}/optimal-k")
    public Mono<ElbowMethodService.ElbowResult> findOptimalK(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "10") int maxK) {
        return elbowMethodService.findOptimalK(sessionId, maxK);
    }

    @GetMapping("/sessions/{sessionId}/cluster-statistics")
    public Mono<Map<Integer, KMeansClusteringService.ClusterStats>> getClusterStatistics(
            @PathVariable Long sessionId) {
        return clusteringService.performClustering(sessionId, 4)
            .map(KMeansClusteringService.ClusterResult::getClusterStatistics);
    }

    @GetMapping("/sessions/{sessionId}/kpis")
    public Mono<GeoJsonFeatureCollection> getKpiMapData(@PathVariable Long sessionId) {
        return kpiRepository.findBySessionId(sessionId)
            .collectList()
            .map(kpis -> {
                Map<LocalDateTime, List<KpiAggregate>> grouped = kpis.stream()
                    .filter(k -> k.getLatitude() != null && k.getLongitude() != null)
                    .collect(Collectors.groupingBy(KpiAggregate::getWindowStart));
                
                List<GeoJsonFeature> features = grouped.entrySet().stream()
                    .map(entry -> toGeoJsonFeature(entry.getValue()))
                    .collect(Collectors.toList());
                
                return new GeoJsonFeatureCollection(features);
            });
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
        return Mono.zip(getKpiMapData(sessionId), getAnomalyMapData(sessionId))
            .map(tuple -> Map.of("kpis", tuple.getT1(), "anomalies", tuple.getT2()));
    }

    @PostMapping("/sessions/{sessionId}/generate-map")
    public Mono<Map<String, String>> generateHtmlMap(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "cluster") String mapType) {
        return getKpiMapData(sessionId)
            .flatMap(geojson -> mapVisualizationService.generateHtmlMap(sessionId, geojson, mapType))
            .map(path -> Map.of(
                "message", "Map generated successfully",
                "path", path,
                "url", "/api/map/sessions/" + sessionId + "/view?type=" + mapType
            ));
    }

    @GetMapping("/sessions/{sessionId}/view")
    public Mono<ResponseEntity<byte[]>> viewHtmlMap(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "cluster") String type) {
        return mapVisualizationService.getMapHtml(sessionId, type)
            .map(html -> ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_HTML_VALUE)
                .body(html));
    }

    private GeoJsonFeature toGeoJsonFeature(List<KpiAggregate> windowKpis) {
        Map<String, Object> properties = new HashMap<>();
        
        for (KpiAggregate kpi : windowKpis) {
            switch (kpi.getMetric()) {
                case "RSRP" -> properties.put("rsrp", kpi.getAvgValue());
                case "RSRQ" -> properties.put("rsrq", kpi.getAvgValue());
                case "SINR" -> properties.put("sinr", kpi.getAvgValue());
                case "CQI" -> properties.put("cqi", kpi.getAvgValue());
                case "RSSI" -> properties.put("rssi", kpi.getAvgValue());
            }
        }
        
        KpiAggregate first = windowKpis.get(0);
        properties.put("timestamp", first.getWindowStart().toString());
        properties.put("rat", first.getRat());
        properties.put("cellId", first.getCellId());
        
        Integer cluster = first.getPci() != null ? first.getPci() : 0;
        properties.put("cluster", cluster);
        properties.put("color", getColorForCluster(cluster));
        
        return GeoJsonFeature.builder()
            .type("Feature")
            .geometry(GeoJsonGeometry.builder()
                .type("Point")
                .coordinates(new double[]{first.getLongitude(), first.getLatitude()})
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

    private String getColorForCluster(int cluster) {
        return switch (cluster) {
            case 0 -> "#FF0000";
            case 1 -> "#FF5733";
            case 2 -> "#3186cc";
            case 3 -> "#33FF57";
            default -> "#808080";
        };
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
