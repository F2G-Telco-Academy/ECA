package com.nathan.p2.controller;

import com.nathan.p2.dto.PaginatedResponse;
import com.nathan.p2.dto.RecordDto;
import com.nathan.p2.service.RecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Signaling Records", description = "APIs for accessing captured signaling protocol messages (RRC, NAS, MAC, PDCP, RLC, IP). Records are extracted from PCAP files and stored with timestamps, protocol types, and message content for detailed network analysis.")
public class RecordController {
    
    private final RecordService recordService;

    @Operation(
        summary = "Get paginated signaling records for a session",
        description = "Returns a paginated list of protocol messages captured during the session. Supports filtering by protocol type (RRC, NAS, MAC, etc.) and pagination for efficient data retrieval. Records are ordered by timestamp."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Records retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PaginatedResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}")
    public Mono<PaginatedResponse<RecordDto>> getSessionRecords(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId,
        @Parameter(description = "Page number (0-indexed)", example = "0")
        @RequestParam(defaultValue = "0") int page,
        @Parameter(description = "Number of records per page", example = "100")
        @RequestParam(defaultValue = "100") int size,
        @Parameter(description = "Filter by protocol type", example = "RRC", schema = @Schema(allowableValues = {"RRC", "NAS", "MAC", "PDCP", "RLC", "IP"}))
        @RequestParam(required = false) String protocol
    ) {
        log.debug("Fetching records for session {} (page={}, size={}, protocol={})", 
                  sessionId, page, size, protocol);
        return recordService.getSessionRecords(sessionId, page, size, protocol);
    }

    @Operation(
        summary = "Get specific record by ID",
        description = "Returns detailed information about a single signaling message record, including timestamp, protocol type, message type, and full message content."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Record found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RecordDto.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Record not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/{recordId}")
    public Mono<RecordDto> getRecord(
        @Parameter(description = "Record ID", required = true, example = "1")
        @PathVariable Long recordId
    ) {
        log.debug("Fetching record: {}", recordId);
        return recordService.getRecord(recordId);
    }
}
