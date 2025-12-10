package com.nathan.p2.service;

import com.nathan.p2.service.AdbDeviceService.DeviceSample;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.ml.clustering.CentroidCluster;
import org.apache.commons.math3.ml.clustering.Clusterable;
import org.apache.commons.math3.ml.clustering.KMeansPlusPlusClusterer;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Real-time ADB Clustering Service - DRY pattern with streaming updates
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdbClusteringService {

    private final AdbDeviceService adbService;

    // Session storage - thread-safe
    private final Map<String, SessionData> activeSessions = new ConcurrentHashMap<>();

    @Data
    public static class ClusterZone {
        private Integer clusterId;
        private String quality;
        private String color;
        private Double avgRsrp;
        private Double avgRsrq;
        private Double avgSinr;
        private Integer pointCount;
        private Double centerLat;
        private Double centerLon;
        private List<DataPoint> points;
    }

    @Data
    public static class DataPoint {
        private Double latitude;
        private Double longitude;
        private Double rsrp;
        private Double rsrq;
        private Double sinr;
        private Integer cqi;
        private String cellId;
        private Integer pci;
        private Integer clusterId;
        private Long timestamp;
    }

    @Data
    public static class ClusterUpdate {
        private String updateId;
        private String sessionId;
        private Long timestamp;
        private List<ClusterZone> zones;
        private Integer totalPoints;
        private Map<String, Object> metadata;
    }

    @Data
    private static class SessionData {
        private String deviceId;
        private List<DataPoint> points = new ArrayList<>();
        private Long startTime = System.currentTimeMillis();
    }

    /**
     * Stream real-time cluster updates for device
     */
    public Flux<ClusterUpdate> streamClusterUpdates(String deviceId, int numClusters, Duration interval) {
        String sessionId = UUID.randomUUID().toString();
        SessionData session = new SessionData();
        session.setDeviceId(deviceId);
        activeSessions.put(sessionId, session);

        log.info("Started ADB clustering stream for device {} (session: {})", deviceId, sessionId);

        return Flux.interval(interval)
                .flatMap(tick -> collectAndCluster(sessionId, numClusters))
                .doOnCancel(() -> {
                    activeSessions.remove(sessionId);
                    log.info("Stopped ADB clustering stream for session {}", sessionId);
                })
                .doOnError(e -> log.error("Error in ADB clustering stream: {}", e.getMessage()));
    }

    /**
     * Collect sample and perform clustering
     */
    private Mono<ClusterUpdate> collectAndCluster(String sessionId, int numClusters) {
        return Mono.fromCallable(() -> {
            SessionData session = activeSessions.get(sessionId);
            if (session == null) {
                throw new IllegalStateException("Session not found: " + sessionId);
            }

            // Collect device sample
            DeviceSample sample = adbService.getDeviceSample(session.getDeviceId());

            if (sample.getCellular() != null && sample.getGps() != null) {
                DataPoint point = createDataPoint(sample);
                session.getPoints().add(point);

                // Keep last 1000 points
                if (session.getPoints().size() > 1000) {
                    session.getPoints().remove(0);
                }
            }

            // Perform clustering if enough points
            List<ClusterZone> zones;
            if (session.getPoints().size() >= numClusters) {
                zones = performClustering(session.getPoints(), numClusters);
            } else {
                zones = new ArrayList<>();
            }

            // Create update
            ClusterUpdate update = new ClusterUpdate();
            update.setUpdateId(UUID.randomUUID().toString());
            update.setSessionId(sessionId);
            update.setTimestamp(System.currentTimeMillis());
            update.setZones(zones);
            update.setTotalPoints(session.getPoints().size());

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("deviceId", session.getDeviceId());
            metadata.put("duration", System.currentTimeMillis() - session.getStartTime());
            update.setMetadata(metadata);

            return update;
        });
    }

    /**
     * Create data point from device sample
     */
    private DataPoint createDataPoint(DeviceSample sample) {
        DataPoint point = new DataPoint();
        point.setLatitude(sample.getGps().getLatitude());
        point.setLongitude(sample.getGps().getLongitude());
        point.setRsrp(sample.getCellular().getRsrp());
        point.setRsrq(sample.getCellular().getRsrq());
        point.setSinr(sample.getCellular().getSinr());
        point.setCqi(sample.getCellular().getCqi());
        point.setCellId(sample.getCellular().getCellId());
        point.setPci(sample.getCellular().getPci());
        point.setTimestamp(sample.getTimestamp());
        return point;
    }

    /**
     * Perform K-means clustering on data points
     */
    private List<ClusterZone> performClustering(List<DataPoint> points, int numClusters) {
        // Create clusterable points
        List<ClusterablePoint> clusterablePoints = points.stream()
                .map(p -> new ClusterablePoint(p, new double[]{
                        p.getRsrp() != null ? p.getRsrp() : -120.0,
                        p.getRsrq() != null ? p.getRsrq() : -20.0,
                        p.getSinr() != null ? p.getSinr() : -10.0
                }))
                .collect(Collectors.toList());

        // Normalize features
        normalizeFeatures(clusterablePoints);

        // Run K-means
        int k = Math.min(numClusters, points.size());
        KMeansPlusPlusClusterer<ClusterablePoint> clusterer =
                new KMeansPlusPlusClusterer<>(k, 100);

        List<CentroidCluster<ClusterablePoint>> clusters = clusterer.cluster(clusterablePoints);

        // Convert to zones
        List<ClusterZone> zones = new ArrayList<>();
        for (int i = 0; i < clusters.size(); i++) {
            CentroidCluster<ClusterablePoint> cluster = clusters.get(i);
            List<ClusterablePoint> clusterPoints = cluster.getPoints();

            if (clusterPoints.isEmpty()) continue;

            // Calculate statistics
            double avgRsrp = clusterPoints.stream()
                    .mapToDouble(p -> p.dataPoint.getRsrp())
                    .average().orElse(-120.0);

            double avgRsrq = clusterPoints.stream()
                    .mapToDouble(p -> p.dataPoint.getRsrq())
                    .average().orElse(-20.0);

            double avgSinr = clusterPoints.stream()
                    .mapToDouble(p -> p.dataPoint.getSinr())
                    .average().orElse(-10.0);

            double centerLat = clusterPoints.stream()
                    .mapToDouble(p -> p.dataPoint.getLatitude())
                    .average().orElse(0.0);

            double centerLon = clusterPoints.stream()
                    .mapToDouble(p -> p.dataPoint.getLongitude())
                    .average().orElse(0.0);

            // Assign cluster ID to points
            for (ClusterablePoint cp : clusterPoints) {
                cp.dataPoint.setClusterId(i);
            }

            // Determine quality and color
            QualityInfo quality = determineQuality(avgRsrp);

            ClusterZone zone = new ClusterZone();
            zone.setClusterId(i);
            zone.setQuality(quality.name);
            zone.setColor(quality.color);
            zone.setAvgRsrp(avgRsrp);
            zone.setAvgRsrq(avgRsrq);
            zone.setAvgSinr(avgSinr);
            zone.setPointCount(clusterPoints.size());
            zone.setCenterLat(centerLat);
            zone.setCenterLon(centerLon);
            zone.setPoints(clusterPoints.stream()
                    .map(cp -> cp.dataPoint)
                    .collect(Collectors.toList()));

            zones.add(zone);
        }

        log.debug("Clustering complete: {} zones from {} points", zones.size(), points.size());
        return zones;
    }

    /**
     * Normalize features using Z-score
     */
    private void normalizeFeatures(List<ClusterablePoint> points) {
        for (int i = 0; i < 3; i++) {
            final int idx = i;
            double mean = points.stream().mapToDouble(p -> p.features[idx]).average().orElse(0);
            double variance = points.stream()
                    .mapToDouble(p -> Math.pow(p.features[idx] - mean, 2))
                    .average().orElse(1);
            double stdDev = Math.sqrt(variance);

            if (stdDev > 0) {
                for (ClusterablePoint p : points) {
                    p.features[idx] = (p.features[idx] - mean) / stdDev;
                }
            }
        }
    }

    /**
     * Determine signal quality from RSRP
     */
    private QualityInfo determineQuality(double rsrp) {
        if (rsrp >= -80) return new QualityInfo("Excellent", "#00FF00");
        if (rsrp >= -90) return new QualityInfo("Good", "#90EE90");
        if (rsrp >= -100) return new QualityInfo("Fair", "#FFA500");
        return new QualityInfo("Poor", "#FF0000");
    }

    @Data
    private static class QualityInfo {
        private final String name;
        private final String color;
    }

    /**
     * Clusterable wrapper for data point
     */
    private static class ClusterablePoint implements Clusterable {
        private final DataPoint dataPoint;
        private final double[] features;

        ClusterablePoint(DataPoint dataPoint, double[] features) {
            this.dataPoint = dataPoint;
            this.features = features;
        }

        @Override
        public double[] getPoint() {
            return features;
        }
    }
}

