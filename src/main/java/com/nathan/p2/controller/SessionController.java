package com.nathan.p2.controller;

import com.nathan.p2.domain.Session;
import com.nathan.p2.service.CaptureOrchestrationService;
import com.nathan.p2.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SessionController {
    
    private final SessionService sessionService;
    private final CaptureOrchestrationService captureService;

    @PostMapping("/start")
    public Mono<Session> startSession(@RequestParam String deviceId) {
        log.info("Starting capture session for device: {}", deviceId);
        return captureService.startCapture(deviceId);
    }

    @PostMapping("/{id}/stop")
    public Mono<Void> stopSession(@PathVariable Long id) {
        log.info("Stopping capture session: {}", id);
        return captureService.stopCapture(id);
    }

    @GetMapping("/{id}")
    public Mono<Session> getSession(@PathVariable Long id) {
        return sessionService.getSession(id);
    }

    @GetMapping
    public Flux<Session> getAllSessions() {
        return sessionService.getAllSessions();
    }

    @GetMapping("/recent")
    public Flux<Session> getRecentSessions(@RequestParam(defaultValue = "10") int limit) {
        return sessionService.getRecentSessions(limit);
    }

    @GetMapping(value = "/{id}/logs", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamLogs(@PathVariable Long id) {
        return captureService.streamLogs(id)
                .onErrorResume(error -> {
                    log.error("Error streaming logs for session {}", id, error);
                    return Flux.just("Error: " + error.getMessage());
                });
    }
}
