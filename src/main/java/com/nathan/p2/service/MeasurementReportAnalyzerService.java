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
public class MeasurementReportAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeMeasurementReports(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            int totalReports = countEvents(pcapPath, "lte-rrc.measurementReport_element");
            List<Map<String, Object>> reports = extractMeasurementData(pcapPath);
            
            result.put("totalReports", totalReports);
            result.put("reports", reports);
            result.put("avgReportInterval", calculateAvgInterval(reports));
            
            return result;
        });
    }
    
    private List<Map<String, Object>> extractMeasurementData(String pcapPath) {
        List<Map<String, Object>> reports = new ArrayList<>();
        
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath,
                "-Y", "lte-rrc.measurementReport_element",
                "-T", "fields",
                "-e", "frame.number",
                "-e", "frame.time_epoch",
                "-e", "lte-rrc.rsrpResult",
                "-e", "lte-rrc.rsrqResult"
            );
            
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] parts = line.split("\\t");
                    if (parts.length >= 2) {
                        Map<String, Object> report = new HashMap<>();
                        report.put("frameNumber", parts[0]);
                        report.put("timestamp", parts[1]);
                        if (parts.length > 2) report.put("rsrp", parts[2]);
                        if (parts.length > 3) report.put("rsrq", parts[3]);
                        reports.add(report);
                    }
                }
            }
            process.waitFor();
        } catch (Exception e) {
            log.error("Failed to extract measurement data", e);
        }
        
        return reports;
    }
    
    private double calculateAvgInterval(List<Map<String, Object>> reports) {
        if (reports.size() < 2) return 0;
        
        double totalInterval = 0;
        for (int i = 1; i < reports.size(); i++) {
            try {
                double t1 = Double.parseDouble(reports.get(i - 1).get("timestamp").toString());
                double t2 = Double.parseDouble(reports.get(i).get("timestamp").toString());
                totalInterval += (t2 - t1);
            } catch (Exception ignored) {}
        }
        
        return totalInterval / (reports.size() - 1);
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
