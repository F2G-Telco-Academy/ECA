package com.nathan.p2.controller;

import com.nathan.p2.service.FiveGNRParserService;
import com.nathan.p2.service.SessionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.nio.file.Paths;
import java.util.Map;

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
}
