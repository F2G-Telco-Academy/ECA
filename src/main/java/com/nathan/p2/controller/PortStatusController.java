package com.nathan.p2.controller;

import com.nathan.p2.service.PortStatusService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Port Status", description = "Scanner and port status monitoring")
public class PortStatusController {

    private final PortStatusService portStatusService;

    @GetMapping(value = "/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Map<String, Object>> streamPortStatus() {
        return portStatusService.getPortStatus();
    }
}
