package com.nathan.p2.controller;

import com.nathan.p2.service.ComprehensivePcapExtractorService;
import com.nathan.p2.service.EnhancedKMeansClusteringService;
import com.nathan.p2.service.MultiFilePcapProcessor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/enhanced-clustering")
@RequiredArgsConstructor
@Tag(name = "Enhanced Clustering", description = "Advanced K-means clustering with PCA and StandardScaler")
public class EnhancedClusteringController {
    
    private final EnhancedKMeansClusteringService clusteringService;
    private final ComprehensivePcapExtractorService pcapExtractor;
    private final MultiFilePcapProcessor multiFileProcessor;
    
    @PostMapping("/analyze")
    @Operation(summary = "Perform clustering analysis on PCAP file")
    public Mono<EnhancedKMeansClusteringService.ClusteringResult> analyzePcap(
            @RequestParam String pcapPath,
            @RequestParam(defaultValue = "4") int numClusters) {
        return clusteringService.performClustering(Paths.get(pcapPath), numClusters);
    }
    
    @GetMapping("/optimal-k")
    @Operation(summary = "Find optimal K using elbow method")
    public Mono<EnhancedKMeansClusteringService.ElbowResult> findOptimalK(
            @RequestParam String pcapPath,
            @RequestParam(defaultValue = "10") int maxK) {
        return clusteringService.findOptimalClusters(Paths.get(pcapPath), maxK);
    }
    
    @GetMapping("/extract-data")
    @Operation(summary = "Extract complete dataset from PCAP")
    public Mono<List<Map<String, Object>>> extractData(@RequestParam String pcapPath) {
        return pcapExtractor.extractCompleteDataset(Paths.get(pcapPath));
    }
    
    @GetMapping("/gps-traces")
    @Operation(summary = "Extract GPS traces")
    public Mono<List<Map<String, Object>>> extractGpsTraces(@RequestParam String pcapPath) {
        return pcapExtractor.extractGpsTraces(Paths.get(pcapPath));
    }
    
    @GetMapping("/kpi-summary")
    @Operation(summary = "Get KPI summary statistics")
    public Mono<Map<String, Object>> getKpiSummary(@RequestParam String pcapPath) {
        return pcapExtractor.extractKpiSummary(Paths.get(pcapPath));
    }
    
    @PostMapping("/batch-analyze")
    @Operation(summary = "Analyze multiple PCAP files")
    public Mono<MultiFilePcapProcessor.MergedDataset> batchAnalyze(
            @RequestBody List<String> pcapPaths) {
        List<Path> paths = pcapPaths.stream()
            .map(Paths::get)
            .collect(Collectors.toList());
        return multiFileProcessor.processMultipleFiles(paths);
    }
}
