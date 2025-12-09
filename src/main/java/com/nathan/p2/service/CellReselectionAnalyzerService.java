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
public class CellReselectionAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeCellReselection(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            int intraFreqReselections = countEvents(pcapPath, "lte-rrc.cellReselectionPriority && lte-rrc.carrierFreq == 0");
            int interFreqReselections = countEvents(pcapPath, "lte-rrc.cellReselectionPriority && lte-rrc.carrierFreq != 0");
            int interRatReselections = countEvents(pcapPath, "lte-rrc.t_ReselectionEUTRA");
            
            result.put("intraFreq", intraFreqReselections);
            result.put("interFreq", interFreqReselections);
            result.put("interRAT", interRatReselections);
            result.put("total", intraFreqReselections + interFreqReselections + interRatReselections);
            
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
