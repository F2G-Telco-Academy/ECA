package com.nathan.p2.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.*;

/**
 * Comprehensive PCAP Analysis Service
 * Based on SCAT + TShark proven patterns
 * Reference: termshark/pkg/pcap/cmds.go
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ComprehensivePcapAnalysisService {

    public Mono<Map<String, Object>> getProtocolHierarchy(Path pcapPath) {
        return Mono.fromCallable(() -> {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-q", "-z", "io,phs", "-r", pcapPath.toString()
            );
            
            Process process = pb.start();
            StringBuilder output = new StringBuilder();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            
            process.waitFor();
            
            String hierarchy = output.toString();
            Map<String, Object> result = new HashMap<>();
            result.put("hierarchy", hierarchy);
            result.put("hasGsmtap", hierarchy.contains("gsmtap"));
            result.put("hasLteRrc", hierarchy.contains("lte_rrc"));
            return result;
        });
    }

    public Mono<List<Map<String, String>>> extractFields(Path pcapPath, List<String> fields, String displayFilter) {
        return Mono.fromCallable(() -> {
            List<String> args = new ArrayList<>();
            args.add("tshark");
            args.add("-T");
            args.add("fields");
            
            for (String field : fields) {
                args.add("-e");
                args.add(field);
            }
            
            if (displayFilter != null && !displayFilter.isEmpty()) {
                args.add("-Y");
                args.add(displayFilter);
            }
            
            args.add("-r");
            args.add(pcapPath.toString());
            
            ProcessBuilder pb = new ProcessBuilder(args);
            Process process = pb.start();
            List<Map<String, String>> results = new ArrayList<>();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] values = line.split("\t");
                    Map<String, String> row = new HashMap<>();
                    for (int i = 0; i < Math.min(fields.size(), values.length); i++) {
                        row.put(fields.get(i), values[i]);
                    }
                    results.add(row);
                }
            }
            
            process.waitFor();
            return results;
        });
    }
}
