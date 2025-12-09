package com.nathan.p2.service;

import com.nathan.p2.domain.GpsTrace;
import com.nathan.p2.repository.GpsTraceRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClusteringAnalyticsService {

    private final GpsTraceRepository gpsTraceRepository;

    public Mono<ElbowMethodResult> calculateElbowMethod(Long sessionId, int maxK) {
        return gpsTraceRepository.findBySessionId(sessionId)
                .collectList()
                .map(gpsData -> {
                    if (gpsData.isEmpty()) {
                        return new ElbowMethodResult(new HashMap<>(), 0);
                    }

                    double[][] features = prepareFeatures(gpsData);
                    Map<Integer, Double> sseValues = new LinkedHashMap<>();

                    for (int k = 1; k <= maxK; k++) {
                        double sse = calculateSSE(features, k);
                        sseValues.put(k, sse);
                    }

                    int optimalK = findElbowPoint(sseValues);
                    return new ElbowMethodResult(sseValues, optimalK);
                });
    }

    public Mono<SilhouetteResult> calculateSilhouetteScore(Long sessionId, int numClusters) {
        return gpsTraceRepository.findBySessionId(sessionId)
                .collectList()
                .map(gpsData -> {
                    if (gpsData.isEmpty() || gpsData.size() < numClusters) {
                        return new SilhouetteResult(0.0, new HashMap<>());
                    }

                    double[][] features = prepareFeatures(gpsData);
                    int[] assignments = performKMeans(features, numClusters);
                    
                    double overallScore = calculateSilhouetteScore(features, assignments, numClusters);
                    Map<Integer, Double> perClusterScores = calculatePerClusterSilhouette(features, assignments, numClusters);
                    
                    return new SilhouetteResult(overallScore, perClusterScores);
                });
    }

    public Mono<ClusterBoundaries> calculateClusterBoundaries(Long sessionId, int numClusters) {
        return gpsTraceRepository.findBySessionId(sessionId)
                .collectList()
                .map(gpsData -> {
                    if (gpsData.isEmpty()) {
                        return new ClusterBoundaries(new HashMap<>());
                    }

                    double[][] features = prepareFeatures(gpsData);
                    int[] assignments = performKMeans(features, numClusters);
                    
                    Map<Integer, List<double[]>> clusterPoints = new HashMap<>();
                    for (int i = 0; i < features.length; i++) {
                        clusterPoints.computeIfAbsent(assignments[i], k -> new ArrayList<>())
                                .add(features[i]);
                    }

                    Map<Integer, Polygon> boundaries = new HashMap<>();
                    clusterPoints.forEach((clusterId, points) -> {
                        if (points.size() >= 3) {
                            boundaries.put(clusterId, calculateConvexHull(points));
                        }
                    });

                    return new ClusterBoundaries(boundaries);
                });
    }

    public Mono<HeatmapData> generateHeatmap(Long sessionId, int gridSize) {
        return gpsTraceRepository.findBySessionId(sessionId)
                .collectList()
                .map(gpsData -> {
                    if (gpsData.isEmpty()) {
                        return new HeatmapData(new double[0][0], 0, 0, 0, 0);
                    }

                    double minLat = gpsData.stream().mapToDouble(GpsTrace::getLatitude).min().orElse(0);
                    double maxLat = gpsData.stream().mapToDouble(GpsTrace::getLatitude).max().orElse(0);
                    double minLon = gpsData.stream().mapToDouble(GpsTrace::getLongitude).min().orElse(0);
                    double maxLon = gpsData.stream().mapToDouble(GpsTrace::getLongitude).max().orElse(0);

                    double[][] grid = new double[gridSize][gridSize];
                    double latStep = (maxLat - minLat) / gridSize;
                    double lonStep = (maxLon - minLon) / gridSize;

                    for (GpsTrace gps : gpsData) {
                        int latIdx = Math.min((int)((gps.getLatitude() - minLat) / latStep), gridSize - 1);
                        int lonIdx = Math.min((int)((gps.getLongitude() - minLon) / lonStep), gridSize - 1);
                        grid[latIdx][lonIdx]++;
                    }

                    return new HeatmapData(grid, minLat, maxLat, minLon, maxLon);
                });
    }

    private double[][] prepareFeatures(List<GpsTrace> gpsData) {
        return gpsData.stream()
                .map(gps -> new double[]{gps.getLatitude(), gps.getLongitude()})
                .toArray(double[][]::new);
    }

    private double calculateSSE(double[][] features, int k) {
        if (features.length < k) k = features.length;
        
        int[] assignments = performKMeans(features, k);
        double[][] centroids = calculateCentroids(features, assignments, k);
        
        double sse = 0;
        for (int i = 0; i < features.length; i++) {
            double dist = euclideanDistance(features[i], centroids[assignments[i]]);
            sse += dist * dist;
        }
        return sse;
    }

    private int findElbowPoint(Map<Integer, Double> sseValues) {
        List<Map.Entry<Integer, Double>> entries = new ArrayList<>(sseValues.entrySet());
        if (entries.size() < 3) return 4;

        double maxCurvature = 0;
        int elbowK = 4;

        for (int i = 1; i < entries.size() - 1; i++) {
            double curvature = Math.abs(
                entries.get(i-1).getValue() - 2 * entries.get(i).getValue() + entries.get(i+1).getValue()
            );
            if (curvature > maxCurvature) {
                maxCurvature = curvature;
                elbowK = entries.get(i).getKey();
            }
        }

        return elbowK;
    }

    private double calculateSilhouetteScore(double[][] features, int[] assignments, int k) {
        double totalScore = 0;
        int validPoints = 0;

        for (int i = 0; i < features.length; i++) {
            double a = calculateIntraClusterDistance(features, assignments, i);
            double b = calculateNearestClusterDistance(features, assignments, i, k);
            
            if (Math.max(a, b) > 0) {
                totalScore += (b - a) / Math.max(a, b);
                validPoints++;
            }
        }

        return validPoints > 0 ? totalScore / validPoints : 0;
    }

    private Map<Integer, Double> calculatePerClusterSilhouette(double[][] features, int[] assignments, int k) {
        Map<Integer, List<Double>> clusterScores = new HashMap<>();

        for (int i = 0; i < features.length; i++) {
            double a = calculateIntraClusterDistance(features, assignments, i);
            double b = calculateNearestClusterDistance(features, assignments, i, k);
            
            if (Math.max(a, b) > 0) {
                double score = (b - a) / Math.max(a, b);
                clusterScores.computeIfAbsent(assignments[i], c -> new ArrayList<>()).add(score);
            }
        }

        return clusterScores.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0)
                ));
    }

    private double calculateIntraClusterDistance(double[][] features, int[] assignments, int pointIdx) {
        int cluster = assignments[pointIdx];
        List<Integer> clusterPoints = new ArrayList<>();
        
        for (int i = 0; i < assignments.length; i++) {
            if (assignments[i] == cluster && i != pointIdx) {
                clusterPoints.add(i);
            }
        }

        if (clusterPoints.isEmpty()) return 0;

        double sum = 0;
        for (int idx : clusterPoints) {
            sum += euclideanDistance(features[pointIdx], features[idx]);
        }
        return sum / clusterPoints.size();
    }

    private double calculateNearestClusterDistance(double[][] features, int[] assignments, int pointIdx, int k) {
        int currentCluster = assignments[pointIdx];
        double minDist = Double.MAX_VALUE;

        for (int cluster = 0; cluster < k; cluster++) {
            if (cluster == currentCluster) continue;

            List<Integer> clusterPoints = new ArrayList<>();
            for (int i = 0; i < assignments.length; i++) {
                if (assignments[i] == cluster) {
                    clusterPoints.add(i);
                }
            }

            if (!clusterPoints.isEmpty()) {
                double sum = 0;
                for (int idx : clusterPoints) {
                    sum += euclideanDistance(features[pointIdx], features[idx]);
                }
                double avgDist = sum / clusterPoints.size();
                minDist = Math.min(minDist, avgDist);
            }
        }

        return minDist == Double.MAX_VALUE ? 0 : minDist;
    }

    private Polygon calculateConvexHull(List<double[]> points) {
        if (points.size() < 3) {
            return new Polygon(points);
        }

        List<double[]> sorted = new ArrayList<>(points);
        sorted.sort((a, b) -> {
            int cmp = Double.compare(a[0], b[0]);
            return cmp != 0 ? cmp : Double.compare(a[1], b[1]);
        });

        List<double[]> hull = new ArrayList<>();
        
        // Lower hull
        for (double[] point : sorted) {
            while (hull.size() >= 2 && crossProduct(hull.get(hull.size()-2), hull.get(hull.size()-1), point) <= 0) {
                hull.remove(hull.size()-1);
            }
            hull.add(point);
        }

        // Upper hull
        int lowerSize = hull.size();
        for (int i = sorted.size() - 2; i >= 0; i--) {
            double[] point = sorted.get(i);
            while (hull.size() > lowerSize && crossProduct(hull.get(hull.size()-2), hull.get(hull.size()-1), point) <= 0) {
                hull.remove(hull.size()-1);
            }
            hull.add(point);
        }

        hull.remove(hull.size()-1);
        return new Polygon(hull);
    }

    private double crossProduct(double[] o, double[] a, double[] b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }

    private int[] performKMeans(double[][] features, int k) {
        if (features.length < k) k = Math.max(1, features.length);

        int[] assignments = new int[features.length];
        double[][] centroids = initializeCentroids(features, k);

        for (int iter = 0; iter < 100; iter++) {
            boolean changed = false;
            
            for (int i = 0; i < features.length; i++) {
                int nearest = findNearestCentroid(features[i], centroids);
                if (assignments[i] != nearest) {
                    assignments[i] = nearest;
                    changed = true;
                }
            }

            if (!changed) break;
            centroids = calculateCentroids(features, assignments, k);
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

    private double[][] calculateCentroids(double[][] features, int[] assignments, int k) {
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

    private double euclideanDistance(double[] a, double[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) {
            double diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    @Data
    public static class ElbowMethodResult {
        private final Map<Integer, Double> sseValues;
        private final int optimalK;
    }

    @Data
    public static class SilhouetteResult {
        private final double overallScore;
        private final Map<Integer, Double> perClusterScores;
    }

    @Data
    public static class ClusterBoundaries {
        private final Map<Integer, Polygon> boundaries;
    }

    @Data
    public static class Polygon {
        private final List<double[]> points;
    }

    @Data
    public static class HeatmapData {
        private final double[][] grid;
        private final double minLat;
        private final double maxLat;
        private final double minLon;
        private final double maxLon;
    }
}
