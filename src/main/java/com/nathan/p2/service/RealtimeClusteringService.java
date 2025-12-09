package com.nathan.p2.service;

import com.nathan.p2.domain.GpsTrace;
import com.nathan.p2.repository.GpsTraceRepository;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeClusteringService {

    private final GpsTraceRepository gpsTraceRepository;
    private final KpiAggregateRepository kpiAggregateRepository;
    private final EnhancedKMeansClusteringService clusteringService;

    public Flux<ClusterUpdate> streamClusterUpdates(Long sessionId, int numClusters) {
        return Flux.interval(Duration.ofSeconds(2))
                .flatMap(tick -> generateClusterUpdate(sessionId, numClusters))
                .distinctUntilChanged(ClusterUpdate::getUpdateId);
    }

    private Mono<ClusterUpdate> generateClusterUpdate(Long sessionId, int numClusters) {
        return gpsTraceRepository.findBySessionId(sessionId)
                .collectList()
                .zipWith(kpiAggregateRepository.findBySessionId(sessionId).collectList())
                .flatMap(tuple -> {
                    List<GpsTrace> gpsData = tuple.getT1();
                    if (gpsData.isEmpty()) {
                        return Mono.empty();
                    }

                    // Prepare data for clustering
                    double[][] features = prepareFeatures(gpsData);
                    
                    // Run clustering
                    int[] clusterAssignments = performKMeans(features, numClusters);
                    
                    // Calculate cluster statistics
                    List<ClusterZone> zones = calculateClusterZones(gpsData, clusterAssignments, numClusters);
                    
                    ClusterUpdate update = new ClusterUpdate();
                    update.setUpdateId(UUID.randomUUID().toString());
                    update.setSessionId(String.valueOf(sessionId));
                    update.setTimestamp(System.currentTimeMillis());
                    update.setZones(zones);
                    update.setTotalPoints(gpsData.size());
                    
                    return Mono.just(update);
                });
    }

    private double[][] prepareFeatures(List<GpsTrace> gpsData) {
        return gpsData.stream()
                .map(gps -> new double[]{gps.getLatitude(), gps.getLongitude()})
                .toArray(double[][]::new);
    }

    private int[] performKMeans(double[][] features, int k) {
        if (features.length < k) {
            k = Math.max(1, features.length);
        }

        int[] assignments = new int[features.length];
        double[][] centroids = initializeCentroids(features, k);

        for (int iter = 0; iter < 100; iter++) {
            boolean changed = false;
            
            // Assign points to nearest centroid
            for (int i = 0; i < features.length; i++) {
                int nearest = findNearestCentroid(features[i], centroids);
                if (assignments[i] != nearest) {
                    assignments[i] = nearest;
                    changed = true;
                }
            }

            if (!changed) break;

            // Update centroids
            centroids = updateCentroids(features, assignments, k);
        }

        return assignments;
    }

    private double[][] initializeCentroids(double[][] features, int k) {
        Random rand = new Random();
        double[][] centroids = new double[k][features[0].length];
        Set<Integer> selected = new HashSet<>();
        
        for (int i = 0; i < k; i++) {
            int idx;
            do {
                idx = rand.nextInt(features.length);
            } while (selected.contains(idx));
            selected.add(idx);
            centroids[i] = features[idx].clone();
        }
        
        return centroids;
    }

    private int findNearestCentroid(double[] point, double[][] centroids) {
        int nearest = 0;
        double minDist = euclideanDistance(point, centroids[0]);
        
        for (int i = 1; i < centroids.length; i++) {
            double dist = euclideanDistance(point, centroids[i]);
            if (dist < minDist) {
                minDist = dist;
                nearest = i;
            }
        }
        
        return nearest;
    }

    private double euclideanDistance(double[] a, double[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) {
            double diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    private double[][] updateCentroids(double[][] features, int[] assignments, int k) {
        double[][] centroids = new double[k][features[0].length];
        int[] counts = new int[k];

        for (int i = 0; i < features.length; i++) {
            int cluster = assignments[i];
            for (int j = 0; j < features[i].length; j++) {
                centroids[cluster][j] += features[i][j];
            }
            counts[cluster]++;
        }

        for (int i = 0; i < k; i++) {
            if (counts[i] > 0) {
                for (int j = 0; j < centroids[i].length; j++) {
                    centroids[i][j] /= counts[i];
                }
            }
        }

        return centroids;
    }

    private List<ClusterZone> calculateClusterZones(List<GpsTrace> gpsData, int[] assignments, int k) {
        Map<Integer, List<GpsTrace>> clusterMap = new HashMap<>();
        
        for (int i = 0; i < gpsData.size(); i++) {
            int cluster = assignments[i];
            clusterMap.computeIfAbsent(cluster, c -> new ArrayList<>()).add(gpsData.get(i));
        }

        return clusterMap.entrySet().stream()
                .map(entry -> {
                    int clusterId = entry.getKey();
                    List<GpsTrace> points = entry.getValue();
                    
                    double avgLat = points.stream().mapToDouble(GpsTrace::getLatitude).average().orElse(0);
                    double avgLon = points.stream().mapToDouble(GpsTrace::getLongitude).average().orElse(0);
                    
                    ClusterZone zone = new ClusterZone();
                    zone.setClusterId(clusterId);
                    zone.setCentroidLat(avgLat);
                    zone.setCentroidLon(avgLon);
                    zone.setPointCount(points.size());
                    zone.setQuality(determineQuality(clusterId, k));
                    zone.setColor(getClusterColor(clusterId, k));
                    
                    return zone;
                })
                .collect(Collectors.toList());
    }

    private String determineQuality(int clusterId, int totalClusters) {
        double ratio = (double) clusterId / totalClusters;
        if (ratio < 0.25) return "Excellent";
        if (ratio < 0.5) return "Good";
        if (ratio < 0.75) return "Moderate";
        return "Poor";
    }

    private String getClusterColor(int clusterId, int totalClusters) {
        String[] colors = {"#33FF57", "#3186cc", "#FF5733", "#FF0000"};
        int index = Math.min(clusterId, colors.length - 1);
        return colors[index];
    }

    @Data
    public static class ClusterUpdate {
        private String updateId;
        private String sessionId;
        private long timestamp;
        private List<ClusterZone> zones;
        private int totalPoints;
    }

    @Data
    public static class ClusterZone {
        private int clusterId;
        private double centroidLat;
        private double centroidLon;
        private int pointCount;
        private String quality;
        private String color;
        private Double avgRsrp;
        private Double avgRsrq;
        private Double avgSinr;
    }
}
