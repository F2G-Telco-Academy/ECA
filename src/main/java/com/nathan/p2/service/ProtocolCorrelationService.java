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
public class ProtocolCorrelationService {
    
    public Mono<Map<String, Object>> correlateProtocols(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            Map<String, List<Map<String, Object>>> protocolEvents = new HashMap<>();
            protocolEvents.put("RRC", extractProtocolEvents(pcapPath, "lte-rrc"));
            protocolEvents.put("NAS", extractProtocolEvents(pcapPath, "nas-eps"));
            protocolEvents.put("MAC", extractProtocolEvents(pcapPath, "mac-lte"));
            protocolEvents.put("RLC", extractProtocolEvents(pcapPath, "rlc-lte"));
            
            result.put("protocolEvents", protocolEvents);
            result.put("correlations", findCorrelations(protocolEvents));
            
            return result;
        });
    }
    
    private List<Map<String, Object>> extractProtocolEvents(String pcapPath, String protocol) {
        List<Map<String, Object>> events = new ArrayList<>();
        
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath,
                "-Y", protocol,
                "-T", "fields",
                "-e", "frame.number",
                "-e", "frame.time_epoch",
                "-e", protocol
            );
            
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] parts = line.split("\\t");
                    if (parts.length >= 2) {
                        Map<String, Object> event = new HashMap<>();
                        event.put("frameNumber", parts[0]);
                        event.put("timestamp", parts[1]);
                        event.put("protocol", protocol);
                        events.add(event);
                    }
                }
            }
            process.waitFor();
        } catch (Exception e) {
            log.error("Failed to extract protocol events", e);
        }
        
        return events;
    }
    
    private List<Map<String, Object>> findCorrelations(Map<String, List<Map<String, Object>>> protocolEvents) {
        List<Map<String, Object>> correlations = new ArrayList<>();
        
        List<Map<String, Object>> rrcEvents = protocolEvents.get("RRC");
        List<Map<String, Object>> nasEvents = protocolEvents.get("NAS");
        
        for (Map<String, Object> rrc : rrcEvents) {
            double rrcTime = Double.parseDouble(rrc.get("timestamp").toString());
            
            for (Map<String, Object> nas : nasEvents) {
                double nasTime = Double.parseDouble(nas.get("timestamp").toString());
                double timeDiff = Math.abs(nasTime - rrcTime);
                
                if (timeDiff < 0.1) {
                    Map<String, Object> correlation = new HashMap<>();
                    correlation.put("rrcFrame", rrc.get("frameNumber"));
                    correlation.put("nasFrame", nas.get("frameNumber"));
                    correlation.put("timeDiff", timeDiff);
                    correlations.add(correlation);
                }
            }
        }
        
        return correlations;
    }
}
