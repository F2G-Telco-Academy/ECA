package com.nathan.p2.controller;

import com.nathan.p2.dto.PaginatedResponse;
import com.nathan.p2.dto.RecordDto;
import com.nathan.p2.service.RecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

/**
 * REST controller for signaling message records.
 * Provides paginated access to protocol messages captured during sessions.
 */
@Slf4j
@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecordController {
    
    private final RecordService recordService;

    /**
     * Get paginated records for a session.
     * @param sessionId Session identifier
     * @param page Page number (0-indexed)
     * @param size Page size
     * @param protocol Optional protocol filter (RRC, NAS, MAC, etc.)
     * @return Paginated list of records
     */
    @GetMapping("/session/{sessionId}")
    public Mono<PaginatedResponse<RecordDto>> getSessionRecords(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String protocol) {
        
        log.debug("Fetching records for session {} (page={}, size={}, protocol={})", 
                  sessionId, page, size, protocol);
        
        return recordService.getSessionRecords(sessionId, page, size, protocol);
    }

    /**
     * Get specific record by ID.
     * @param recordId Record identifier
     * @return Record details
     */
    @GetMapping("/{recordId}")
    public Mono<RecordDto> getRecord(@PathVariable Long recordId) {
        log.debug("Fetching record: {}", recordId);
        return recordService.getRecord(recordId);
    }
}
