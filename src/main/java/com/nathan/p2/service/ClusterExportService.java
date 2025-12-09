package com.nathan.p2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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
public class ClusterExportService {

    private final GpsTraceRepository gpsTraceRepository;
    private final ObjectMapper objectMapper;

    public Mono<String> exportToCsv(Long sessionId, int numClusters) {
        return gpsTraceRepository.findBySessionId(sessionId)
                .collectList()
                .map(gpsData -> {
                    if (gpsData.isEmpty()) {
                        return "latitude,longitude,cluster,quality\n";
                    }

                    double[][] features = prepareFeatures(gpsData);
                    int[] assignments = performKMeans(features, numClusters);

                    StringBuilder csv = new StringBuilder();
                    csv.append("latitude,longitude,altitude,timestamp,cluster,quality\n");

                    for (int i = 0; i < gpsData.size(); i++) {
                        GpsTrace gps = gpsData.get(i);
                        int cluster = assignments[i];
                        String quality = determineQuality(cluster, numClusters);

                        csv.append(String.format("%f,%f,%f,%s,%d,%s\n",
                                gps.getLatitude(),
                                gps.getLongitude(),
                                gps.getAltitude(),
                                gps.getTimestamp(),
                                cluster,
                                quality));
                    }

                    return csv.toString();
                });
    }

    public Mono<String> exportToGeoJson(Long sessionId, int numClusters) {
        return gpsTraceRepository.findBySessionId(sessionId)
                .collectList()
                .map(gpsData -> {
                    if (gpsData.isEmpty()) {
                        return createEmptyGeoJson();
                    }

                    double[][] features = prepareFeatures(gpsData);
                    int[] assignments = performKMeans(features, numClusters);

                    Map<Integer, List<GpsTrace>> clusterMap = new HashMap<>();
                    for (int i = 0; i < gpsData.size(); i++) {
                        clusterMap.computeIfAbsent(assignments[i], k -> new ArrayList<>())
                                .add(gpsData.get(i));
                    }

                    GeoJsonFeatureCollection collection = new GeoJsonFeatureCollection();
                    collection.setType("FeatureCollection");
                    collection.setFeatures(new ArrayList<>());

                    clusterMap.forEach((clusterId, points) -> {
                        for (GpsTrace gps : points) {
                            GeoJsonFeature feature = new GeoJsonFeature();
                            feature.setType("Feature");

                            GeoJsonGeometry geometry = new GeoJsonGeometry();
                            geometry.setType("Point");
                            geometry.setCoordinates(Arrays.asList(gps.getLongitude(), gps.getLatitude()));
                            feature.setGeometry(geometry);

                            Map<String, Object> properties = new HashMap<>();
                            properties.put("cluster", clusterId);
                            properties.put("quality", determineQuality(clusterId, numClusters));
                            properties.put("timestamp", gps.getTimestamp().toString());
                            properties.put("altitude", gps.getAltitude());
                            feature.setProperties(properties);

                            collection.getFeatures().add(feature);
                        }
                    });

                    try {
                        return objectMapper.writeValueAsString(collection);
                    } catch (Exception e) {
                        log.error("Failed to serialize GeoJSON", e);
                        return createEmptyGeoJson();
                    }
                });
    }

    private String createEmptyGeoJson() {
        return "{\"type\":\"FeatureCollection\",\"features\":[]}";
    }

    private double[][] prepareFeatures(List<GpsTrace> gpsData) {
        return gpsData.stream()
                .map(gps -> new double[]{gps.getLatitude(), gps.getLongitude()})
                .toArray(double[][]::new);
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

    private String determineQuality(int clusterId, int totalClusters) {
        double ratio = (double) clusterId / totalClusters;
        if (ratio < 0.25) return "Excellent";
        if (ratio < 0.5) return "Good";
        if (ratio < 0.75) return "Moderate";
        return "Poor";
    }

    @Data
    public static class GeoJsonFeatureCollection {
        private String type;
        private List<GeoJsonFeature> features;
    }

    @Data
    public static class GeoJsonFeature {
        private String type;
        private GeoJsonGeometry geometry;
        private Map<String, Object> properties;
    }

    @Data
    public static class GeoJsonGeometry {
        private String type;
        private List<Double> coordinates;
    }
}
