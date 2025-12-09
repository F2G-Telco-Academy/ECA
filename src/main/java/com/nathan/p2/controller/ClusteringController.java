package com.nathan.p2.controller;

import com.nathan.p2.service.KMeansClusteringService;
import com.nathan.p2.service.RealtimeClusteringService;
import com.nathan.p2.service.ClusteringAnalyticsService;
import com.nathan.p2.service.ClusterExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/clustering")
@RequiredArgsConstructor
@Tag(name = "GPS Clustering", description = "Network quality zone clustering APIs")
public class ClusteringController {
    private final KMeansClusteringService clusteringService;
    private final RealtimeClusteringService realtimeClusteringService;
    private final ClusteringAnalyticsService analyticsService;
    private final ClusterExportService exportService;

    @GetMapping(value = "/session/{sessionId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream real-time cluster updates during drive test")
    public Flux<ServerSentEvent<RealtimeClusteringService.ClusterUpdate>> streamClusters(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "4") int numClusters) {
        
        log.info("Starting real-time cluster stream for session: {}", sessionId);
        
        return realtimeClusteringService.streamClusterUpdates(sessionId, numClusters)
                .map(update -> ServerSentEvent.<RealtimeClusteringService.ClusterUpdate>builder()
                        .id(update.getUpdateId())
                        .event("cluster-update")
                        .data(update)
                        .build())
                .doOnNext(event -> log.debug("Emitting cluster update: {}", event.id()))
                .doOnError(e -> log.error("Error in cluster stream: {}", e.getMessage()))
                .doOnComplete(() -> log.info("Cluster stream completed for session: {}", sessionId));
    }

    @PostMapping(value = "/session/{sessionId}/cluster", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Perform K-means clustering on GPS traces")
    public Mono<KMeansClusteringService.ClusterResult> clusterSession(
        @PathVariable Long sessionId,
        @RequestParam(defaultValue = "4") int numClusters
    ) {
        log.info("Clustering session {} with {} clusters", sessionId, numClusters);
        return clusteringService.performClustering(sessionId, numClusters)
            .doOnSuccess(result -> log.info("Clustering complete: {} points, silhouette={}",
                result.getTotalPoints(), result.getSilhouetteScore()))
            .doOnError(e -> log.error("Clustering failed", e));
    }

    @GetMapping(value = "/session/{sessionId}/optimal-k", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Find optimal number of clusters using elbow method")
    public Mono<OptimalKResponse> findOptimalK(@PathVariable Long sessionId) {
        log.info("Finding optimal K for session {}", sessionId);
        return analyticsService.calculateElbowMethod(sessionId, 10)
                .zipWith(analyticsService.calculateSilhouetteScore(sessionId, 4))
                .map(tuple -> new OptimalKResponse(
                        tuple.getT1().getOptimalK(),
                        tuple.getT2().getOverallScore()
                ));
    }

    @GetMapping(value = "/session/{sessionId}/elbow-method", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Calculate elbow method for optimal K")
    public Mono<ClusteringAnalyticsService.ElbowMethodResult> getElbowMethod(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "10") int maxK) {
        log.info("Calculating elbow method for session {}", sessionId);
        return analyticsService.calculateElbowMethod(sessionId, maxK);
    }

    @GetMapping(value = "/session/{sessionId}/silhouette", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Calculate silhouette score")
    public Mono<ClusteringAnalyticsService.SilhouetteResult> getSilhouetteScore(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "4") int numClusters) {
        log.info("Calculating silhouette score for session {}", sessionId);
        return analyticsService.calculateSilhouetteScore(sessionId, numClusters);
    }

    @GetMapping(value = "/session/{sessionId}/boundaries", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get cluster boundary polygons")
    public Mono<ClusteringAnalyticsService.ClusterBoundaries> getClusterBoundaries(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "4") int numClusters) {
        log.info("Calculating cluster boundaries for session {}", sessionId);
        return analyticsService.calculateClusterBoundaries(sessionId, numClusters);
    }

    @GetMapping(value = "/session/{sessionId}/heatmap", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Generate heatmap data")
    public Mono<ClusteringAnalyticsService.HeatmapData> getHeatmap(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "50") int gridSize) {
        log.info("Generating heatmap for session {}", sessionId);
        return analyticsService.generateHeatmap(sessionId, gridSize);
    }

    @GetMapping(value = "/session/{sessionId}/export/csv", produces = "text/csv")
    @Operation(summary = "Export cluster data as CSV")
    public Mono<ResponseEntity<String>> exportCsv(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "4") int numClusters) {
        log.info("Exporting CSV for session {}", sessionId);
        return exportService.exportToCsv(sessionId, numClusters)
                .map(csv -> ResponseEntity.ok()
                        .header("Content-Disposition", "attachment; filename=clusters_" + sessionId + ".csv")
                        .body(csv));
    }

    @GetMapping(value = "/session/{sessionId}/export/geojson", produces = "application/geo+json")
    @Operation(summary = "Export cluster data as GeoJSON")
    public Mono<ResponseEntity<String>> exportGeoJson(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "4") int numClusters) {
        log.info("Exporting GeoJSON for session {}", sessionId);
        return exportService.exportToGeoJson(sessionId, numClusters)
                .map(geojson -> ResponseEntity.ok()
                        .header("Content-Disposition", "attachment; filename=clusters_" + sessionId + ".geojson")
                        .body(geojson));
    }

    @GetMapping(value = "/session/{sessionId}/quality-zones", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get network quality zones (clustered GPS points)")
    public Mono<QualityZonesResponse> getQualityZones(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "4") int numClusters) {
        
        return realtimeClusteringService.streamClusterUpdates(sessionId, numClusters)
                .next()
                .map(update -> {
                    var zones = update.getZones().stream()
                            .map(z -> new QualityZone(
                                    z.getClusterId(),
                                    new double[]{z.getCentroidLat(), z.getCentroidLon()},
                                    z.getPointCount(),
                                    z.getQuality(),
                                    z.getAvgRsrp() != null ? z.getAvgRsrp() : 0.0,
                                    z.getAvgRsrq() != null ? z.getAvgRsrq() : 0.0,
                                    z.getAvgSinr() != null ? z.getAvgSinr() : 0.0
                            ))
                            .toList();
                    return new QualityZonesResponse(zones);
                })
                .defaultIfEmpty(new QualityZonesResponse(java.util.List.of()));
    }

    private String determineQuality(double rsrp) {
        if (rsrp >= -80) return "EXCELLENT";
        if (rsrp >= -95) return "GOOD";
        if (rsrp >= -110) return "FAIR";
        return "POOR";
    }

    public record OptimalKResponse(int optimalK, double silhouetteScore) {}
    public record QualityZonesResponse(java.util.List<QualityZone> zones) {}
    public record QualityZone(
        int clusterId,
        double[] centroid,
        int pointCount,
        String quality,
        double avgRsrp,
        double avgRsrq,
        double avgSinr
    ) {}
}
