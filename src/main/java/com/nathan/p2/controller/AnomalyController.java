package com.nathan.p2.controller;

import com.nathan.p2.domain.Anomaly;
import com.nathan.p2.repository.AnomalyRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/anomalies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Anomaly Detection", description = "APIs for accessing detected network anomalies including connection failures, signal degradation, handover issues, and performance problems.")
public class AnomalyController {
    
    private final AnomalyRepository anomalyRepository;

    @Operation(
        summary = "Get anomalies for a session",
        description = "Returns all detected anomalies during the capture session. Anomalies include connection failures, signal quality issues, handover problems, and performance degradation events with timestamps and severity levels."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Anomalies retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Anomaly.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}")
    public Flux<Anomaly> getSessionAnomalies(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId
    ) {
        return anomalyRepository.findBySessionId(sessionId);
    }
}
