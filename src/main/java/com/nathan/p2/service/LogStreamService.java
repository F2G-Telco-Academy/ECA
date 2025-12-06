package com.nathan.p2.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class LogStreamService {
    
    private final Map<Long, Sinks.Many<String>> sessionSinks = new ConcurrentHashMap<>();
    
    public Flux<String> streamLogs(Long sessionId) {
        Sinks.Many<String> sink = sessionSinks.computeIfAbsent(sessionId, 
            id -> Sinks.many().multicast().onBackpressureBuffer());
        
        return sink.asFlux()
            .doOnCancel(() -> log.info("Client disconnected from session {}", sessionId))
            .timeout(Duration.ofHours(2));
    }
    
    public void publishLog(Long sessionId, String logLine) {
        Sinks.Many<String> sink = sessionSinks.get(sessionId);
        if (sink != null) {
            sink.tryEmitNext(logLine);
        }
    }
    
    public void closeStream(Long sessionId) {
        Sinks.Many<String> sink = sessionSinks.remove(sessionId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }
}
