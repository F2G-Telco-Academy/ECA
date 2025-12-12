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
 * Combines SCAT parser output with TShark PDML/PSML analysis
 * Based on termshark patterns: pkg/pcap/cmds.go
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ComprehensivePcapAnalysisService {

    /**
     * Extract LTE RRC State using TShark PDML
     * Pattern: tshark -T pdml -r file.pcap -Y "lte-rrc"
     */
    public Mono<Map<String, Object>> extractLteRrcState(Path pcapPath) {
        return Mono.fromCallable(() -> {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-T", "pdml", "-r", pcapPath.toString(),
                "-Y", "lte-rrc.rrcConnectionRequest_element or lte-rrc.rrcConnectionSetup_element or lte-rrc.rrcConnectionRelease_element",
                "-d", "udp.port==4729,gsmtap"
            );
            
            Process process = pb.start();
            List<String> states = new ArrayList<>();
            String currentState = "IDLE";
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("rrcConnectionSetup")) currentState = "CONNECTED";
                    else if (line.contains("rrcConnectionRelease")) currentState = "IDLE";
                    states.add(line);
                }
            }
            
            process.waitFor();
            
            Map<String, Object> result = new HashMap<>();
            result.put("currentState", currentState);
            result.put("transitions", states.size());
            result.put("pdmlData", states.subList(0, Math.min(10, states.size())));
            return result;
        });
    }

    /**
     * Extract 5GNR information using TShark PSML (table format)
     * Pattern: tshark -T psml -r file.pcap -Y "nr-rrc"
     */
    public Mono<List<Map<String, String>>> extract5gnrPsml(Path pcapPath) {
        return Mono.fromCallable(() -> {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-T", "psml", "-r", pcapPath.toString(),
                "-Y", "nr-rrc",
                "-d", "udp.port==4729,gsmtap"
            );
            
            Process process = pb.start();
            List<Map<String, String>> packets = new ArrayList<>();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("<packet>")) {
                        Map<String, String> packet = new HashMap<>();
                        packet.put("data", line);
                        packets.add(packet);
                    }
                }
            }
            
            process.waitFor();
            return packets;
        });
    }

    /**
     * Extract specific protocol fields using TShark fields extraction
     * Pattern: tshark -T fields -e field1 -e field2 -r file.pcap
     */
    public Mono<List<Map<String, String>>> extractFields(Path pcapPath, String filter, List<String> fields) {
        return Mono.fromCallable(() -> {
            List<String> args = new ArrayList<>();
            args.add("tshark");
            args.add("-T");
            args.add("fields");
            
            for (String field : fields) {
                args.add("-e");
                args.add(field);
            }
            
            args.add("-r");
            args.add(pcapPath.toString());
            
            if (filter != null && !filter.isEmpty()) {
                args.add("-Y");
                args.add(filter);
            }
            
            args.add("-d");
            args.add("udp.port==4729,gsmtap");
            
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

    /**
     * Get protocol hierarchy statistics
     * Pattern: tshark -q -z io,phs -r file.pcap
     */
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
            
            Map<String, Object> result = new HashMap<>();
            result.put("hierarchy", output.toString());
            result.put("hasGsmtap", output.toString().contains("gsmtap"));
            result.put("hasLteRrc", output.toString().contains("lte_rrc"));
            result.put("hasNrRrc", output.toString().contains("nr-rrc"));
            return result;
        });
    }
}
