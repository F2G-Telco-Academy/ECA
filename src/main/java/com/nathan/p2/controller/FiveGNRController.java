package com.nathan.p2.controller;

import com.nathan.p2.service.FiveGNRParserService;
import com.nathan.p2.service.SessionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Paths;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/5gnr")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "5GNR Information", description = "5GNR MIB, SIB, and UE Capability parsing")
public class FiveGNRController {

    private final FiveGNRParserService parserService;
    private final SessionService sessionService;

    @GetMapping("/session/{sessionId}/mib")
    public Mono<Map<String, Object>> getMIB(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .flatMap(session -> {
                String pcapPath = session.getSessionDir() + "/capture.pcap";
                return parserService.parseMIB(Paths.get(pcapPath));
            });
    }

    @GetMapping("/session/{sessionId}/sib1")
    public Mono<Map<String, Object>> getSIB1(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .flatMap(session -> {
                String pcapPath = session.getSessionDir() + "/capture.pcap";
                return parserService.parseSIB1(Paths.get(pcapPath));
            });
    }

    @GetMapping("/session/{sessionId}/ue-capability")
    public Mono<Map<String, Object>> getUECapability(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .flatMap(session -> {
                String pcapPath = session.getSessionDir() + "/capture.pcap";
                return parserService.parseUECapability(Paths.get(pcapPath));
            });
    }

    @GetMapping("/session/{sessionId}/rrc-state")
    public Mono<Map<String, Object>> getRrcState(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "state", "CONNECTED",
                "message", "5GNR RRC state tracking"
            ));
    }

    @GetMapping("/session/{sessionId}/nsa-status")
    public Mono<Map<String, Object>> getNsaStatus(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "mode", "NSA",
                "scgState", "CONFIGURED",
                "message", "5GNR NSA status information"
            ));
    }

    @GetMapping("/session/{sessionId}/sa-status")
    public Mono<Map<String, Object>> getSaStatus(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "mode", "SA",
                "state", "REGISTERED",
                "message", "5GNR SA status information"
            ));
    }

    @GetMapping("/session/{sessionId}/handover-stats")
    public Mono<Map<String, Object>> getHandoverStats(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .map(session -> Map.of(
                "sessionId", sessionId,
                "totalHandovers", 0,
                "successRate", 0.0,
                "message", "5GNR handover statistics"
            ));
    }

    @GetMapping("/session/{sessionId}/tdd-config")
    public Mono<Map<String, Object>> getTddConfig(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                String pcapPath = session.getSessionDir() + "/capture.pcap";
                
                // Extract TDD UL-DL configuration from NR RRC SIB1
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-r", pcapPath,
                    "-Y", "nr-rrc.tdd-UL-DL-ConfigurationCommon",
                    "-T", "fields",
                    "-e", "nr-rrc.referenceSubcarrierSpacing",
                    "-e", "nr-rrc.pattern1.dl-UL-TransmissionPeriodicity",
                    "-e", "nr-rrc.pattern1.nrofDownlinkSlots",
                    "-e", "nr-rrc.pattern1.nrofDownlinkSymbols",
                    "-e", "nr-rrc.pattern1.nrofUplinkSlots",
                    "-e", "nr-rrc.pattern1.nrofUplinkSymbols"
                );
                
                Process process = pb.start();
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line = reader.readLine();
                    if (line != null) {
                        String[] fields = line.split("\t");
                        if (fields.length >= 6) {
                            result.put("scs", fields[0]);
                            result.put("periodicity", fields[1]);
                            result.put("dlSlots", fields[2]);
                            result.put("dlSymbols", fields[3]);
                            result.put("ulSlots", fields[4]);
                            result.put("ulSymbols", fields[5]);
                        }
                    } else {
                        result.put("message", "No TDD configuration found");
                    }
                }
                
                process.waitFor();
                return result;
            }));
    }

    @GetMapping("/session/{sessionId}/sipcell-info")
    public Mono<Map<String, Object>> getSipCellInfo(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                String pcapPath = session.getSessionDir() + "/capture.pcap";
                
                // Extract SCell information from RRC Reconfiguration
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-r", pcapPath,
                    "-Y", "nr-rrc.rrcReconfiguration && nr-rrc.sCellToAddModList",
                    "-T", "fields",
                    "-e", "frame.number",
                    "-e", "nr-rrc.sCellIndex",
                    "-e", "nr-rrc.physCellId",
                    "-e", "nr-rrc.absoluteFrequencyPointA"
                );
                
                Process process = pb.start();
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                List<Map<String, String>> sipCells = new ArrayList<>();
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        String[] fields = line.split("\t");
                        if (fields.length >= 4) {
                            Map<String, String> cell = new HashMap<>();
                            cell.put("frame", fields[0]);
                            cell.put("sCellIndex", fields[1]);
                            cell.put("physCellId", fields[2]);
                            cell.put("frequency", fields[3]);
                            sipCells.add(cell);
                        }
                    }
                }
                
                result.put("sipCells", sipCells);
                result.put("totalSipCells", sipCells.size());
                process.waitFor();
                return result;
            }));
    }

    @GetMapping("/session/{sessionId}/feature-sets")
    public Mono<Map<String, Object>> getFeatureSets(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                String pcapPath = session.getSessionDir() + "/capture.pcap";
                
                // Extract UE feature sets from UE capability
                ProcessBuilder pb = new ProcessBuilder(
                    "tshark", "-r", pcapPath,
                    "-Y", "nr-rrc.ue-CapabilityRAT-ContainerList",
                    "-T", "fields",
                    "-e", "nr-rrc.featureSets",
                    "-e", "nr-rrc.featureSetDownlink",
                    "-e", "nr-rrc.featureSetUplink"
                );
                
                Process process = pb.start();
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                List<String> featureSets = new ArrayList<>();
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (!line.trim().isEmpty()) {
                            featureSets.add(line);
                        }
                    }
                }
                
                result.put("featureSets", featureSets);
                result.put("totalFeatures", featureSets.size());
                process.waitFor();
                return result;
            }));
    }
}
