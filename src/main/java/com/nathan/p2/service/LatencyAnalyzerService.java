package com.nathan.p2.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LatencyAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeLatency(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            List<Double> latencies = new ArrayList<>();
            
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath,
                "-Y", "icmp || tcp.flags.syn==1",
                "-T", "fields",
                "-e", "frame.time_epoch",
                "-e", "frame.time_delta"
            );
            
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] parts = line.split("\\t");
                    if (parts.length >= 2) {
                        try {
                            double delta = Double.parseDouble(parts[1]) * 1000;
                            if (delta > 0 && delta < 10000) {
                                latencies.add(delta);
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }
                process.waitFor();
            }
            
            if (!latencies.isEmpty()) {
                Collections.sort(latencies);
                result.put("minLatency", latencies.get(0));
                result.put("maxLatency", latencies.get(latencies.size() - 1));
                result.put("avgLatency", latencies.stream().mapToDouble(Double::doubleValue).average().orElse(0));
                result.put("p50Latency", latencies.get(latencies.size() / 2));
                result.put("p95Latency", latencies.get((int) (latencies.size() * 0.95)));
                result.put("p99Latency", latencies.get((int) (latencies.size() * 0.99)));
                result.put("samples", latencies.size());
            }
            
            return result;
        });
    }
}
