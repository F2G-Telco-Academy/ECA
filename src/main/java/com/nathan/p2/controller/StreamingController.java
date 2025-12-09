package com.nathan.p2.controller;

import com.nathan.p2.service.RealtimeKpiStreamingService;
import com.nathan.p2.service.TerminalPacketStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.time.Duration;

@Slf4j
@RestController
@RequestMapping("/api/streaming")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StreamingController {
    
    private final RealtimeKpiStreamingService kpiStreamingService;
    private final TerminalPacketStreamService packetStreamService;
    
    @GetMapping(value = "/kpis/{sessionId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamKpis(@PathVariable Long sessionId) {
        log.info("Starting KPI stream for session: {}", sessionId);
        
        return kpiStreamingService.streamKpis(sessionId)
            .map(kpi -> ServerSentEvent.<String>builder()
                .event("kpi-update")
                .data(kpi)
                .build())
            .doOnSubscribe(s -> log.info("Client subscribed to KPI stream: {}", sessionId))
            .doOnCancel(() -> log.info("Client cancelled KPI stream: {}", sessionId))
            .doOnError(e -> log.error("Error in KPI stream: {}", e.getMessage()));
    }
    
    @GetMapping(value = "/packets/{sessionId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamPackets(@PathVariable Long sessionId) {
        log.info("Starting packet stream for session: {}", sessionId);
        
        return packetStreamService.streamPsml(sessionId)
            .map(packet -> ServerSentEvent.<String>builder()
                .event("packet")
                .data(packet)
                .build())
            .doOnSubscribe(s -> log.info("Client subscribed to packet stream: {}", sessionId))
            .doOnCancel(() -> log.info("Client cancelled packet stream: {}", sessionId))
            .doOnError(e -> log.error("Error in packet stream: {}", e.getMessage()));
    }
    
    @GetMapping(value = "/packets/{sessionId}/json", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamPacketsJson(@PathVariable Long sessionId) {
        log.info("Starting JSON packet stream for session: {}", sessionId);
        
        return packetStreamService.streamJson(sessionId)
            .map(packet -> ServerSentEvent.<String>builder()
                .event("packet-json")
                .data(packet)
                .build())
            .doOnSubscribe(s -> log.info("Client subscribed to JSON packet stream: {}", sessionId))
            .doOnCancel(() -> log.info("Client cancelled JSON packet stream: {}", sessionId))
            .doOnError(e -> log.error("Error in JSON packet stream: {}", e.getMessage()));
    }
    
    @GetMapping(value = "/heartbeat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> heartbeat() {
        return Flux.interval(Duration.ofSeconds(30))
            .map(seq -> ServerSentEvent.<String>builder()
                .event("heartbeat")
                .data("ping")
                .build());
    }
}
