package com.nathan.p2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeKpiStreamingService {
    private final EnhancedKpiExtractionService kpiService;
    private final ObjectMapper objectMapper;
    
    private final Map<Long, Sinks.Many<String>> sessionStreams = new ConcurrentHashMap<>();

    public Flux<String> streamKpis(Long sessionId) {
        log.info("Creating KPI stream for session: {}", sessionId);
        
        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
        sessionStreams.put(sessionId, sink);
        
        Flux.interval(Duration.ofSeconds(2))
            .flatMap(tick -> extractAndEmitKpis(sessionId, sink))
            .subscribe();
        
        return sink.asFlux()
            .doOnCancel(() -> {
                log.info("KPI stream cancelled for session: {}", sessionId);
                sessionStreams.remove(sessionId);
            })
            .doOnError(e -> log.error("KPI stream error for session: {}", sessionId, e));
    }

    private Flux<Void> extractAndEmitKpis(Long sessionId, Sinks.Many<String> sink) {
        Path pcapPath = Paths.get("./data/sessions")
            .resolve("session_" + sessionId)
            .resolve("capture.pcap");
        
        return kpiService.extractAllKpis(pcapPath)
            .doOnSuccess(kpis -> {
                try {
                    String json = objectMapper.writeValueAsString(Map.of(
                        "type", "kpi_update",
                        "sessionId", sessionId,
                        "timestamp", System.currentTimeMillis(),
                        "data", kpis
                    ));
                    sink.tryEmitNext(json);
                } catch (Exception e) {
                    log.error("Failed to serialize KPIs", e);
                }
            })
            .onErrorResume(e -> {
                log.debug("KPI extraction failed (file may not exist yet): {}", e.getMessage());
                return Mono.empty();
            })
            .thenMany(Flux.empty());
    }

    public void emitEvent(Long sessionId, String eventType, Object data) {
        Sinks.Many<String> sink = sessionStreams.get(sessionId);
        if (sink != null) {
            try {
                String json = objectMapper.writeValueAsString(Map.of(
                    "type", eventType,
                    "sessionId", sessionId,
                    "timestamp", System.currentTimeMillis(),
                    "data", data
                ));
                sink.tryEmitNext(json);
            } catch (Exception e) {
                log.error("Failed to emit event", e);
            }
        }
    }

    public void stopStream(Long sessionId) {
        Sinks.Many<String> sink = sessionStreams.remove(sessionId);
        if (sink != null) {
            sink.tryEmitComplete();
            log.info("Stopped KPI stream for session: {}", sessionId);
        }
    }
}
