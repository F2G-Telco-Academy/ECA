package com.nathan.p2.service;

import com.nathan.p2.domain.SignalQuality;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.ml.clustering.CentroidCluster;
import org.apache.commons.math3.ml.clustering.DoublePoint;
import org.apache.commons.math3.ml.clustering.KMeansPlusPlusClusterer;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EnhancedKMeansClusteringService {
    
    private final ComprehensivePcapExtractorService pcapExtractor;
    private final FeatureEngineeringService featureEngineering;

    public Mono<ClusteringResult> performClustering(Path pcapPath, int numClusters) {
        return pcapExtractor.extractCompleteDataset(pcapPath)
            .map(dataset -> {
                if (dataset.size() < numClusters) {
                    throw new IllegalArgumentException("Insufficient data points");
                }
                
                // Extract features
                double[][] features = extractFeatures(dataset);
                
                // Step 1: Standardize
                FeatureEngineeringService.StandardizedData standardized = 
                    featureEngineering.standardize(features);
                
                // Step 2: PCA
                FeatureEngineeringService.PCAResult pca = 
                    featureEngineering.applyPCA(standardized.getScaled(), 2);
                
                // Step 3: K-Means
                List<DoublePoint> points = toDoublePoints(standardized.getScaled());
                KMeansPlusPlusClusterer<DoublePoint> clusterer = 
                    new KMeansPlusPlusClusterer<>(numClusters, 100);
                List<CentroidCluster<DoublePoint>> clusters = clusterer.cluster(points);
                
                // Step 4: Calculate metrics
                double sse = calculateSSE(clusters);
                double silhouette = calculateSilhouetteScore(standardized.getScaled(), clusters);
                
                // Step 5: Cluster statistics
                Map<Integer, ClusterStats> stats = calculateClusterStats(
                    dataset, clusters, standardized.getMeans(), standardized.getStds());
                
                return ClusteringResult.builder()
                    .totalPoints(dataset.size())
                    .numClusters(numClusters)
                    .silhouetteScore(silhouette)
                    .sse(sse)
                    .pcaExplainedVariance(pca.getExplainedVariance())
                    .clusterStatistics(stats)
                    .pcaTransformed(pca.getTransformed())
                    .build();
            });
    }

    public Mono<ElbowResult> findOptimalClusters(Path pcapPath, int maxK) {
        return pcapExtractor.extractCompleteDataset(pcapPath)
            .map(dataset -> {
                double[][] features = extractFeatures(dataset);
                FeatureEngineeringService.StandardizedData standardized = 
                    featureEngineering.standardize(features);
                
                List<Double> sseValues = new ArrayList<>();
                List<Double> silhouetteScores = new ArrayList<>();
                
                for (int k = 2; k <= Math.min(maxK, dataset.size()); k++) {
                    List<DoublePoint> points = toDoublePoints(standardized.getScaled());
                    KMeansPlusPlusClusterer<DoublePoint> clusterer = 
                        new KMeansPlusPlusClusterer<>(k, 100);
                    List<CentroidCluster<DoublePoint>> clusters = clusterer.cluster(points);
                    
                    double sse = calculateSSE(clusters);
                    double silhouette = calculateSilhouetteScore(standardized.getScaled(), clusters);
                    
                    sseValues.add(sse);
                    silhouetteScores.add(silhouette);
                }
                
                int optimalK = detectElbowPoint(sseValues);
                
                return ElbowResult.builder()
                    .optimalK(optimalK)
                    .sseValues(sseValues)
                    .silhouetteScores(silhouetteScores)
                    .build();
            });
    }

    private double[][] extractFeatures(List<Map<String, Object>> dataset) {
        String[] featureNames = {"rsrp", "rsrq", "sinr", "cqi", "rssi"};
        double[][] features = new double[dataset.size()][featureNames.length];
        
        for (int i = 0; i < dataset.size(); i++) {
            Map<String, Object> row = dataset.get(i);
            for (int j = 0; j < featureNames.length; j++) {
                Object val = row.get(featureNames[j]);
                features[i][j] = val != null ? ((Number) val).doubleValue() : 0.0;
            }
        }
        return features;
    }

    private List<DoublePoint> toDoublePoints(double[][] data) {
        return Arrays.stream(data)
            .map(DoublePoint::new)
            .collect(Collectors.toList());
    }

    private double calculateSSE(List<CentroidCluster<DoublePoint>> clusters) {
        double sse = 0;
        for (CentroidCluster<DoublePoint> cluster : clusters) {
            double[] center = cluster.getCenter().getPoint();
            for (DoublePoint point : cluster.getPoints()) {
                double[] p = point.getPoint();
                for (int i = 0; i < p.length; i++) {
                    sse += Math.pow(p[i] - center[i], 2);
                }
            }
        }
        return sse;
    }

    private double calculateSilhouetteScore(double[][] data, List<CentroidCluster<DoublePoint>> clusters) {
        int n = data.length;
        double totalScore = 0;
        
        for (int i = 0; i < n; i++) {
            int clusterIdx = findClusterIndex(data[i], clusters);
            double a = avgDistanceWithinCluster(data[i], clusters.get(clusterIdx));
            double b = minAvgDistanceToOtherClusters(data[i], clusters, clusterIdx);
            totalScore += (b - a) / Math.max(a, b);
        }
        
        return totalScore / n;
    }

    private int findClusterIndex(double[] point, List<CentroidCluster<DoublePoint>> clusters) {
        for (int i = 0; i < clusters.size(); i++) {
            for (DoublePoint p : clusters.get(i).getPoints()) {
                if (Arrays.equals(p.getPoint(), point)) return i;
            }
        }
        return 0;
    }

    private double avgDistanceWithinCluster(double[] point, CentroidCluster<DoublePoint> cluster) {
        double sum = 0;
        int count = 0;
        for (DoublePoint p : cluster.getPoints()) {
            sum += euclideanDistance(point, p.getPoint());
            count++;
        }
        return count > 0 ? sum / count : 0;
    }

    private double minAvgDistanceToOtherClusters(double[] point, List<CentroidCluster<DoublePoint>> clusters, int currentIdx) {
        double minDist = Double.MAX_VALUE;
        for (int i = 0; i < clusters.size(); i++) {
            if (i != currentIdx) {
                double avgDist = avgDistanceWithinCluster(point, clusters.get(i));
                minDist = Math.min(minDist, avgDist);
            }
        }
        return minDist;
    }

    private double euclideanDistance(double[] a, double[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }

    private int detectElbowPoint(List<Double> sseValues) {
        if (sseValues.size() < 3) return 2;
        
        double maxDiff = 0;
        int elbowK = 2;
        
        for (int i = 1; i < sseValues.size() - 1; i++) {
            double diff = sseValues.get(i - 1) - sseValues.get(i);
            if (diff > maxDiff) {
                maxDiff = diff;
                elbowK = i + 2;
            }
        }
        return elbowK;
    }

    private Map<Integer, ClusterStats> calculateClusterStats(
            List<Map<String, Object>> dataset,
            List<CentroidCluster<DoublePoint>> clusters,
            double[] means, double[] stds) {
        
        Map<Integer, ClusterStats> stats = new HashMap<>();
        
        for (int i = 0; i < clusters.size(); i++) {
            List<DoublePoint> points = clusters.get(i).getPoints();
            double[] center = clusters.get(i).getCenter().getPoint();
            
            // Denormalize center
            double[] denormalized = new double[center.length];
            for (int j = 0; j < center.length; j++) {
                denormalized[j] = center[j] * stds[j] + means[j];
            }
            
            SignalQuality quality = SignalQuality.classify(denormalized[0]);
            
            stats.put(i, ClusterStats.builder()
                .clusterId(i)
                .pointCount(points.size())
                .avgRsrp(denormalized[0])
                .avgRsrq(denormalized[1])
                .avgSinr(denormalized[2])
                .avgCqi(denormalized[3])
                .avgRssi(denormalized[4])
                .quality(quality.name())
                .color(quality.getColor())
                .description(quality.getDescription())
                .build());
        }
        
        return stats;
    }

    @Data
    @lombok.Builder
    public static class ClusteringResult {
        private int totalPoints;
        private int numClusters;
        private double silhouetteScore;
        private double sse;
        private double[] pcaExplainedVariance;
        private Map<Integer, ClusterStats> clusterStatistics;
        private double[][] pcaTransformed;
    }

    @Data
    @lombok.Builder
    public static class ClusterStats {
        private int clusterId;
        private int pointCount;
        private double avgRsrp;
        private double avgRsrq;
        private double avgSinr;
        private double avgCqi;
        private double avgRssi;
        private String quality;
        private String color;
        private String description;
    }

    @Data
    @lombok.Builder
    public static class ElbowResult {
        private int optimalK;
        private List<Double> sseValues;
        private List<Double> silhouetteScores;
    }
}
