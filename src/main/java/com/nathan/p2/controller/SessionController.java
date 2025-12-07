package com.nathan.p2.controller;

import com.nathan.p2.domain.Session;
import com.nathan.p2.service.CaptureOrchestrationService;
import com.nathan.p2.service.SessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Session Management", description = "APIs for managing capture sessions. Sessions represent individual data capture operations from connected devices, including start/stop control, status monitoring, and log streaming.")
public class SessionController {
    
    private final SessionService sessionService;
    private final CaptureOrchestrationService captureService;

    @Operation(
        summary = "Start a new capture session",
        description = "Initiates a new data capture session for the specified device. This will start ADB logging, SCAT conversion, and TShark packet capture processes. The device must be connected and detected before starting a session."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Session started successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Session.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid device ID or device not found",
            content = @Content(mediaType = "application/json")
        ),
        @ApiResponse(
            responseCode = "500",
            description = "Internal server error - failed to start capture processes",
            content = @Content(mediaType = "application/json")
        )
    })
    @PostMapping("/start")
    public Mono<Session> startSession(
        @Parameter(description = "Device ID from ADB (e.g., 'emulator-5554' or device serial number)", required = true, example = "RF8N41JBXXX")
        @RequestParam String deviceId
    ) {
        log.info("Starting capture session for device: {}", deviceId);
        return captureService.startCapture(deviceId);
    }

    @Operation(
        summary = "Stop an active capture session",
        description = "Stops all capture processes for the specified session and finalizes data collection. This will terminate ADB logging, SCAT conversion, and TShark processes, then update the session status to COMPLETED."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Session stopped successfully"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        ),
        @ApiResponse(
            responseCode = "500",
            description = "Internal server error - failed to stop capture processes",
            content = @Content(mediaType = "application/json")
        )
    })
    @PostMapping("/{id}/stop")
    public Mono<Void> stopSession(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long id
    ) {
        log.info("Stopping capture session: {}", id);
        return captureService.stopCapture(id);
    }

    @Operation(
        summary = "Get session details",
        description = "Retrieves complete information about a specific capture session including status, timestamps, device info, and file paths."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Session found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Session.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/{id}")
    public Mono<Session> getSession(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long id
    ) {
        return sessionService.getSession(id);
    }

    @Operation(
        summary = "List all sessions",
        description = "Retrieves all capture sessions from the database, ordered by creation time (newest first). Use this for session history and management."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Sessions retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Session.class)
            )
        )
    })
    @GetMapping
    public Flux<Session> getAllSessions() {
        return sessionService.getAllSessions();
    }

    @Operation(
        summary = "Get recent sessions",
        description = "Retrieves the most recent capture sessions, limited by the specified count. Useful for dashboard displays and quick access to recent work."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Recent sessions retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Session.class)
            )
        )
    })
    @GetMapping("/recent")
    public Flux<Session> getRecentSessions(
        @Parameter(description = "Maximum number of sessions to return", example = "10")
        @RequestParam(defaultValue = "10") int limit
    ) {
        return sessionService.getRecentSessions(limit);
    }

    @Operation(
        summary = "Stream session logs in real-time",
        description = "Establishes a Server-Sent Events (SSE) stream that provides real-time log output from SCAT and TShark processes. The stream remains open until the session ends or the client disconnects."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Log stream established",
            content = @Content(
                mediaType = "text/event-stream",
                schema = @Schema(type = "string", description = "Stream of log messages")
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping(value = "/{id}/logs", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamLogs(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long id
    ) {
        return captureService.streamLogs(id)
                .onErrorResume(error -> {
                    log.error("Error streaming logs for session {}", id, error);
                    return Flux.just("Error: " + error.getMessage());
                });
    }
}
