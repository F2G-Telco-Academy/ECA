package com.nathan.p2.controller;

import com.nathan.p2.service.CaptureOrchestrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogStreamController {
    private final CaptureOrchestrationService orchestration;

    @GetMapping(value = "/sessions/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@PathVariable Long id) {
        return orchestration.streamLogs(id)
            .map(line -> ServerSentEvent.<String>builder().data(line).build());
    }
}
