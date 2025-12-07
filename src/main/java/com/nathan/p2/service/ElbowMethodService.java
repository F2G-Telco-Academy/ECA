package com.nathan.p2.service;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.ml.clustering.CentroidCluster;
import org.apache.commons.math3.ml.clustering.KMeansPlusPlusClusterer;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ElbowMethodService {

    private final KpiAggregateRepository kpiRepository;

    public Mono<ElbowResult> findOptimalK(Long sessionId, int maxK) {
        return kpiRepository.findBySessionId(sessionId)
            .collectList()
            .map(kpis -> {
                List<KMeansClusteringService.FeaturePoint> points = extractFeaturePoints(kpis);
                normalizeFeatures(points);
                
                List<Double> sseValues = new ArrayList<>();
                
                for (int k = 1; k <= maxK; k++) {
                    KMeansPlusPlusClusterer<KMeansClusteringService.FeaturePoint> clusterer = 
                        new KMeansPlusPlusClusterer<>(k, 100);
                    List<CentroidCluster<KMeansClusteringService.FeaturePoint>> clusters = clusterer.cluster(points);
                    
                    double sse = calculateSSE(clusters);
                    sseValues.add(sse);
                    log.debug("K={}, SSE={}", k, sse);
                }
                
                int optimalK = findElbow(sseValues);
                
                return ElbowResult.builder()
                    .sseValues(sseValues)
                    .optimalK(optimalK)
                    .build();
            });
    }

    private List<KMeansClusteringService.FeaturePoint> extractFeaturePoints(List<KpiAggregate> kpis) {
        Map<LocalDateTime, Map<String, KpiAggregate>> grouped = kpis.stream()
            .filter(k -> k.getLatitude() != null && k.getLongitude() != null)
            .collect(Collectors.groupingBy(
                KpiAggregate::getWindowStart,
                Collectors.toMap(KpiAggregate::getMetric, k -> k, (a, b) -> a)
            ));
        
        List<KMeansClusteringService.FeaturePoint> points = new ArrayList<>();
        for (Map.Entry<LocalDateTime, Map<String, KpiAggregate>> entry : grouped.entrySet()) {
            Map<String, KpiAggregate> metrics = entry.getValue();
            
            double rsrp = getValue(metrics, "RSRP", -120.0);
            double rsrq = getValue(metrics, "RSRQ", -20.0);
            double sinr = getValue(metrics, "SINR", -10.0);
            double cqi = getValue(metrics, "CQI", 0.0);
            double rssi = getValue(metrics, "RSSI", -100.0);
            
            KpiAggregate ref = metrics.values().iterator().next();
            points.add(new KMeansClusteringService.FeaturePoint(
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

    private void normalizeFeatures(List<KMeansClusteringService.FeaturePoint> points) {
        for (int i = 0; i < 5; i++) {
            final int idx = i;
            double mean = points.stream().mapToDouble(p -> p.getPoint()[idx]).average().orElse(0);
            double stdDev = Math.sqrt(points.stream()
                .mapToDouble(p -> Math.pow(p.getPoint()[idx] - mean, 2))
                .sum() / points.size());
            
            for (KMeansClusteringService.FeaturePoint point : points) {
                double[] features = point.getPoint();
                features[idx] = stdDev > 0 ? (features[idx] - mean) / stdDev : 0;
            }
        }
    }

    private double calculateSSE(List<CentroidCluster<KMeansClusteringService.FeaturePoint>> clusters) {
        double sse = 0;
        for (CentroidCluster<KMeansClusteringService.FeaturePoint> cluster : clusters) {
            double[] center = cluster.getCenter().getPoint();
            for (KMeansClusteringService.FeaturePoint point : cluster.getPoints()) {
                sse += euclideanDistanceSquared(point.getPoint(), center);
            }
        }
        return sse;
    }

    private double euclideanDistanceSquared(double[] a, double[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return sum;
    }

    private int findElbow(List<Double> sseValues) {
        if (sseValues.size() < 3) return 2;
        
        double maxDecrease = 0;
        int optimalK = 2;
        
        for (int i = 1; i < sseValues.size() - 1; i++) {
            double decrease = sseValues.get(i - 1) - sseValues.get(i);
            double nextDecrease = sseValues.get(i) - sseValues.get(i + 1);
            double rateChange = decrease - nextDecrease;
            
            if (rateChange > maxDecrease) {
                maxDecrease = rateChange;
                optimalK = i + 1;
            }
        }
        
        return optimalK;
    }

    @Data
    @lombok.Builder
    public static class ElbowResult {
        private List<Double> sseValues;
        private int optimalK;
    }
}
