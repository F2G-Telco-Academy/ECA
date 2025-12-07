package com.nathan.p2.service;

import com.nathan.p2.dto.PaginatedResponse;
import com.nathan.p2.dto.RecordDto;
import com.nathan.p2.repository.RecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Service for managing signaling message records.
 * Handles retrieval and filtering of protocol messages.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecordService {
    
    private final RecordRepository recordRepository;

    /**
     * Get paginated records for a session with optional protocol filter.
     * 
     * @param sessionId Session identifier
     * @param page Page number (0-indexed)
     * @param size Page size
     * @param protocol Optional protocol filter
     * @return Paginated response with records
     */
    public Mono<PaginatedResponse<RecordDto>> getSessionRecords(
            Long sessionId, int page, int size, String protocol) {
        
        var recordsFlux = protocol != null
                ? recordRepository.findBySessionIdAndProtocol(sessionId, protocol)
                : recordRepository.findBySessionId(sessionId);
        
        return recordsFlux
                .skip((long) page * size)
                .take(size)
                .map(this::toDto)
                .collectList()
                .zipWith(recordRepository.countBySessionId(sessionId))
                .map(tuple -> {
                    var content = tuple.getT1();
                    var total = tuple.getT2();
                    var totalPages = (int) Math.ceil((double) total / size);
                    
                    return PaginatedResponse.<RecordDto>builder()
                            .content(content)
                            .page(page)
                            .size(size)
                            .totalElements(total)
                            .totalPages(totalPages)
                            .first(page == 0)
                            .last(page >= totalPages - 1)
                            .build();
                });
    }

    /**
     * Get specific record by ID.
     * 
     * @param recordId Record identifier
     * @return Record DTO
     */
    public Mono<RecordDto> getRecord(Long recordId) {
        return recordRepository.findById(recordId)
                .map(this::toDto);
    }

    private RecordDto toDto(com.nathan.p2.domain.Record record) {
        return RecordDto.builder()
                .id(record.getId())
                .sessionId(record.getSessionId())
                .timestamp(record.getTimestamp())
                .protocol(record.getProtocol())
                .direction(record.getDirection())
                .messageType(record.getMessageType())
                .layer(record.getLayer())
                .frameNumber(record.getFrameNumber())
                .hexData(record.getHexData())
                .decodedData(record.getDecodedData())
                .length(record.getLength())
                .build();
    }
}
