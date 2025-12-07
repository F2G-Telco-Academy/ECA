package com.nathan.p2.service;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.ml.clustering.CentroidCluster;
import org.apache.commons.math3.ml.clustering.Clusterable;
import org.apache.commons.math3.ml.clustering.KMeansPlusPlusClusterer;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KMeansClusteringService {

    private final KpiAggregateRepository kpiRepository;
    private List<CentroidCluster<FeaturePoint>> clusters;
    private Map<String, FeatureStats> featureStats;

    public Mono<ClusterResult> performClustering(Long sessionId, int numClusters) {
        return kpiRepository.findBySessionId(sessionId)
            .collectList()
            .map(kpis -> {
                List<FeaturePoint> points = extractFeaturePoints(kpis);
                
                if (points.isEmpty()) {
                    throw new IllegalStateException("No valid KPI data for clustering");
                }
                
                // Normalize features
                normalizeFeatures(points);
                
                // Perform K-Means clustering
                KMeansPlusPlusClusterer<FeaturePoint> clusterer = 
                    new KMeansPlusPlusClusterer<>(numClusters, 100);
                clusters = clusterer.cluster(points);
                
                // Assign cluster IDs back to KPIs
                assignClustersToKpis(kpis, points);
                
                // Calculate statistics
                Map<Integer, ClusterStats> stats = calculateClusterStatistics();
                double silhouette = calculateSilhouetteScore(points);
                
                log.info("Clustering complete: {} clusters, {} points, silhouette={}", 
                    numClusters, points.size(), silhouette);
                
                return ClusterResult.builder()
                    .totalPoints(points.size())
                    .numClusters(numClusters)
                    .silhouetteScore(silhouette)
                    .clusterStatistics(stats)
                    .build();
            })
            .flatMap(result -> kpiRepository.saveAll(
                kpiRepository.findBySessionId(sessionId).collectList().block()
            ).collectList().thenReturn(result));
    }

    private List<FeaturePoint> extractFeaturePoints(List<KpiAggregate> kpis) {
        Map<LocalDateTime, Map<String, KpiAggregate>> grouped = kpis.stream()
            .filter(k -> k.getLatitude() != null && k.getLongitude() != null)
            .collect(Collectors.groupingBy(
                KpiAggregate::getWindowStart,
                Collectors.toMap(KpiAggregate::getMetric, k -> k, (a, b) -> a)
            ));
        
        List<FeaturePoint> points = new ArrayList<>();
        for (Map.Entry<LocalDateTime, Map<String, KpiAggregate>> entry : grouped.entrySet()) {
            Map<String, KpiAggregate> metrics = entry.getValue();
            
            double rsrp = getValue(metrics, "RSRP", -120.0);
            double rsrq = getValue(metrics, "RSRQ", -20.0);
            double sinr = getValue(metrics, "SINR", -10.0);
            double cqi = getValue(metrics, "CQI", 0.0);
            double rssi = getValue(metrics, "RSSI", -100.0);
            
            KpiAggregate ref = metrics.values().iterator().next();
            points.add(new FeaturePoint(
                new double[]{rsrp, rsrq, sinr, cqi, rssi},
                ref.getSessionId(),
                entry.getKey(),
                ref.getLatitude(),
                ref.getLongitude()
            ));
        }
        
        return points;
    }

    private double getValue(Map<String, KpiAggregate> metrics, String key, double defaultValue) {
        KpiAggregate kpi = metrics.get(key);
        return kpi != null && kpi.getAvgValue() != null ? kpi.getAvgValue() : defaultValue;
    }

    private void normalizeFeatures(List<FeaturePoint> points) {
        int numFeatures = 5;
        featureStats = new HashMap<>();
        String[] featureNames = {"RSRP", "RSRQ", "SINR", "CQI", "RSSI"};
        
        for (int i = 0; i < numFeatures; i++) {
            final int idx = i;
            double min = points.stream().mapToDouble(p -> p.getPoint()[idx]).min().orElse(0);
            double max = points.stream().mapToDouble(p -> p.getPoint()[idx]).max().orElse(1);
            double mean = points.stream().mapToDouble(p -> p.getPoint()[idx]).average().orElse(0);
            double stdDev = calculateStdDev(points, idx, mean);
            
            featureStats.put(featureNames[i], new FeatureStats(min, max, mean, stdDev));
            
            // Z-score normalization
            for (FeaturePoint point : points) {
                double[] features = point.getPoint();
                features[idx] = stdDev > 0 ? (features[idx] - mean) / stdDev : 0;
            }
        }
    }

    private double calculateStdDev(List<FeaturePoint> points, int featureIdx, double mean) {
        double sumSquares = points.stream()
            .mapToDouble(p -> Math.pow(p.getPoint()[featureIdx] - mean, 2))
            .sum();
        return Math.sqrt(sumSquares / points.size());
    }

    private void assignClustersToKpis(List<KpiAggregate> kpis, List<FeaturePoint> points) {
        Map<LocalDateTime, Integer> clusterMap = new HashMap<>();
        
        for (int i = 0; i < clusters.size(); i++) {
            for (FeaturePoint point : clusters.get(i).getPoints()) {
                clusterMap.put(point.timestamp, i);
            }
        }
        
        for (KpiAggregate kpi : kpis) {
            Integer cluster = clusterMap.get(kpi.getWindowStart());
            if (cluster != null) {
                kpi.setPci(cluster);
            }
        }
    }

    private Map<Integer, ClusterStats> calculateClusterStatistics() {
        Map<Integer, ClusterStats> stats = new HashMap<>();
        
        for (int i = 0; i < clusters.size(); i++) {
            List<FeaturePoint> points = clusters.get(i).getPoints();
            double[] center = clusters.get(i).getCenter().getPoint();
            
            // Denormalize center
            double[] denormalized = new double[5];
            String[] names = {"RSRP", "RSRQ", "SINR", "CQI", "RSSI"};
            for (int j = 0; j < 5; j++) {
                FeatureStats fs = featureStats.get(names[j]);
                denormalized[j] = center[j] * fs.stdDev + fs.mean;
            }
            
            stats.put(i, ClusterStats.builder()
                .clusterId(i)
                .pointCount(points.size())
                .centerRsrp(denormalized[0])
                .centerRsrq(denormalized[1])
                .centerSinr(denormalized[2])
                .centerCqi(denormalized[3])
                .centerRssi(denormalized[4])
                .label(determineLabel(denormalized))
                .build());
        }
        
        return stats;
    }

    private String determineLabel(double[] center) {
        double rsrp = center[0];
        double rsrq = center[1];
        double sinr = center[2];
        
        if (rsrp >= -85 && rsrq >= -10 && sinr >= 20) return "Excellent Coverage";
        if (rsrp >= -95 && rsrq >= -12 && sinr >= 10) return "Good Coverage";
        if (rsrp >= -105 && rsrq >= -15 && sinr >= 0) return "Moderate Coverage";
        return "Poor Coverage";
    }

    private double calculateSilhouetteScore(List<FeaturePoint> points) {
        if (clusters.size() < 2) return 0.0;
        
        double totalScore = 0;
        int validPoints = 0;
        
        for (CentroidCluster<FeaturePoint> cluster : clusters) {
            for (FeaturePoint point : cluster.getPoints()) {
                double a = avgDistanceWithinCluster(point, cluster);
                double b = minAvgDistanceToOtherClusters(point, cluster);
                
                if (Math.max(a, b) > 0) {
                    totalScore += (b - a) / Math.max(a, b);
                    validPoints++;
                }
            }
        }
        
        return validPoints > 0 ? totalScore / validPoints : 0.0;
    }

    private double avgDistanceWithinCluster(FeaturePoint point, CentroidCluster<FeaturePoint> cluster) {
        List<FeaturePoint> others = cluster.getPoints().stream()
            .filter(p -> p != point)
            .collect(Collectors.toList());
        
        if (others.isEmpty()) return 0;
        
        return others.stream()
            .mapToDouble(p -> euclideanDistance(point.getPoint(), p.getPoint()))
            .average()
            .orElse(0);
    }

    private double minAvgDistanceToOtherClusters(FeaturePoint point, CentroidCluster<FeaturePoint> ownCluster) {
        return clusters.stream()
            .filter(c -> c != ownCluster)
            .mapToDouble(c -> c.getPoints().stream()
                .mapToDouble(p -> euclideanDistance(point.getPoint(), p.getPoint()))
                .average()
                .orElse(Double.MAX_VALUE))
            .min()
            .orElse(Double.MAX_VALUE);
    }

    private double euclideanDistance(double[] a, double[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }

    @Data
    @AllArgsConstructor
    public static class FeaturePoint implements Clusterable {
        private double[] point;
        private Long sessionId;
        private LocalDateTime timestamp;
        private Double latitude;
        private Double longitude;
    }

    @Data
    @AllArgsConstructor
    private static class FeatureStats {
        double min;
        double max;
        double mean;
        double stdDev;
    }

    @Data
    @lombok.Builder
    public static class ClusterResult {
        private int totalPoints;
        private int numClusters;
        private double silhouetteScore;
        private Map<Integer, ClusterStats> clusterStatistics;
    }

    @Data
    @lombok.Builder
    public static class ClusterStats {
        private int clusterId;
        private int pointCount;
        private double centerRsrp;
        private double centerRsrq;
        private double centerSinr;
        private double centerCqi;
        private double centerRssi;
        private String label;
    }
}
