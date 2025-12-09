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
public class HandoverAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeHandovers(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            int hoCommands = countEvents(pcapPath, "lte-rrc.rrcConnectionReconfiguration_element");
            int hoCompletes = countEvents(pcapPath, "lte-rrc.rrcConnectionReconfigurationComplete_element");
            int hoFailures = countEvents(pcapPath, "lte-rrc.handoverFailure_element");
            
            double successRate = hoCommands > 0 ? (hoCompletes * 100.0 / hoCommands) : 0;
            double failureRate = hoCommands > 0 ? (hoFailures * 100.0 / hoCommands) : 0;
            
            result.put("hoCommands", hoCommands);
            result.put("hoCompletes", hoCompletes);
            result.put("hoFailures", hoFailures);
            result.put("successRate", successRate);
            result.put("failureRate", failureRate);
            result.put("hoTypes", analyzeHandoverTypes(pcapPath));
            
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
    
    private Map<String, Integer> analyzeHandoverTypes(String pcapPath) {
        Map<String, Integer> types = new HashMap<>();
        types.put("intraFreq", countEvents(pcapPath, "lte-rrc.mobilityControlInfo_element && lte-rrc.carrierFreq == 0"));
        types.put("interFreq", countEvents(pcapPath, "lte-rrc.mobilityControlInfo_element && lte-rrc.carrierFreq != 0"));
        types.put("interRAT", countEvents(pcapPath, "lte-rrc.mobilityFromEUTRACommand_element"));
        return types;
    }
}
