package com.nathan.p2.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ThroughputAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeThroughput(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath,
                "-q", "-z", "io,stat,1"
            );
            
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                double totalBytes = 0;
                double duration = 0;
                int intervals = 0;
                
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("|")) {
                        String[] parts = line.split("\\|");
                        if (parts.length >= 3) {
                            try {
                                String bytesStr = parts[2].trim();
                                totalBytes += Double.parseDouble(bytesStr);
                                intervals++;
                            } catch (NumberFormatException ignored) {}
                        }
                    }
                }
                
                duration = intervals;
                double avgThroughput = duration > 0 ? (totalBytes * 8) / (duration * 1_000_000) : 0;
                
                result.put("totalBytes", totalBytes);
                result.put("duration", duration);
                result.put("avgThroughputMbps", avgThroughput);
                result.put("intervals", intervals);
                
                process.waitFor();
            }
            
            return result;
        });
    }
    
    public Mono<Map<String, Object>> analyzeDetailedThroughput(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            String[] filters = {
                "ip.dst", "ip.src"
            };
            
            for (String filter : filters) {
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-r", pcapPath,
                    "-Y", filter,
                    "-T", "fields",
                    "-e", "frame.time_epoch",
                    "-e", "frame.len"
                );
                
                Process process = pb.start();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    double bytes = 0;
                    int packets = 0;
                    
                    String line;
                    while ((line = reader.readLine()) != null) {
                        String[] parts = line.split("\\t");
                        if (parts.length >= 2) {
                            try {
                                bytes += Double.parseDouble(parts[1]);
                                packets++;
                            } catch (NumberFormatException ignored) {}
                        }
                    }
                    
                    String direction = filter.contains("dst") ? "downlink" : "uplink";
                    result.put(direction + "Bytes", bytes);
                    result.put(direction + "Packets", packets);
                    
                    process.waitFor();
                }
            }
            
            return result;
        });
    }
}
