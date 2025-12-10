package com.nathan.p2.controller;

import com.nathan.p2.service.TerminalPacketStreamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * Terminal Stream Controller
 * Provides packet streaming for terminal display
 */
@Slf4j
@RestController
@RequestMapping("/api/terminal")
@RequiredArgsConstructor
@Tag(name = "Terminal Streaming", description = "Packet streaming for terminal display")
public class TerminalStreamController {
    private final TerminalPacketStreamService streamService;

    @GetMapping(value = "/stream/{sessionId}/psml", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream packets in PSML format (packet summary)")
    public Flux<String> streamPsml(@PathVariable Long sessionId) {
        log.info("Client connected to PSML stream for session: {}", sessionId);
        return streamService.streamPsml(sessionId)
            .map(line -> "data: " + line.replace("\n", " ") + "\n\n")
            .onErrorResume(e -> {
                log.error("PSML stream error", e);
                return Flux.just("data: [ERROR] " + e.getMessage() + "\n\n");
            });
    }

    @GetMapping(value = "/stream/{sessionId}/json", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream packets in JSON format")
    public Flux<String> streamJson(@PathVariable Long sessionId) {
        log.info("Client connected to JSON stream for session: {}", sessionId);
        return streamService.streamJson(sessionId)
            .map(line -> "data: " + line.replace("\n", " ") + "\n\n")
            .onErrorResume(e -> {
                log.error("JSON stream error", e);
                return Flux.just("data: [ERROR] " + e.getMessage() + "\n\n");
            });
    }

    @GetMapping(value = "/stream/{sessionId}/text", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream packets in text format (verbose)")
    public Flux<String> streamText(@PathVariable Long sessionId) {
        log.info("Client connected to text stream for session: {}", sessionId);
        return streamService.streamText(sessionId)
            .map(line -> "data: " + line.replace("\n", " ") + "\n\n")
            .onErrorResume(e -> {
                log.error("Text stream error", e);
                return Flux.just("data: [ERROR] " + e.getMessage() + "\n\n");
            });
    }

    @PostMapping("/stream/{sessionId}/stop")
    @Operation(summary = "Stop packet streaming")
    public void stopStream(@PathVariable Long sessionId) {
        log.info("Stopping packet stream for session: {}", sessionId);
        streamService.stopStream(sessionId);
    }
}
