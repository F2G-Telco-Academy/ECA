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
public class RachAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeRach(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            int rachAttempts = countEvents(pcapPath, "mac-lte.rar");
            int rachSuccess = countEvents(pcapPath, "lte-rrc.rrcConnectionRequest_element");
            int rachFailures = rachAttempts - rachSuccess;
            
            double successRate = rachAttempts > 0 ? (rachSuccess * 100.0 / rachAttempts) : 0;
            
            result.put("rachAttempts", rachAttempts);
            result.put("rachSuccess", rachSuccess);
            result.put("rachFailures", rachFailures);
            result.put("successRate", successRate);
            
            return result;
        });
    }
    
    private int countEvents(String pcapPath, String filter) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath,
                "-Y", filter,
                "-T", "fields",
                "-e", "frame.number"
            );
            
            Process process = pb.start();
            int count = 0;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                while (reader.readLine() != null) {
                    count++;
                }
            }
            process.waitFor();
            return count;
        } catch (Exception e) {
            log.error("Failed to count events", e);
            return 0;
        }
    }
}
