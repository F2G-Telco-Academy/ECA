package com.nathan.p2.service;

import com.nathan.p2.dto.PaginatedResponse;
import com.nathan.p2.dto.RecordDto;
import com.nathan.p2.domain.Record;
import com.nathan.p2.repository.RecordRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing signaling message records.
 * Handles retrieval and filtering of protocol messages.
 */
@Slf4j
@Service
public class RecordService {
    
    private final RecordRepository recordRepository;
    private final SessionService sessionService;

    public RecordService(RecordRepository recordRepository, SessionService sessionService) {
        this.recordRepository = recordRepository;
        this.sessionService = sessionService;
    }

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
        
        return ensureRecords(sessionId)
                .thenMany(protocol != null
                        ? recordRepository.findBySessionIdAndProtocol(sessionId, protocol)
                        : recordRepository.findBySessionId(sessionId))
                .skip((long) page * size)
                .take(size)
                .map(this::toDto)
                .doOnError(err -> log.error("Failed to fetch records for session {}", sessionId, err))
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
                })
                .onErrorResume(err -> {
                    log.error("Falling back to empty record list for session {}", sessionId, err);
                    return Mono.just(
                            PaginatedResponse.<RecordDto>builder()
                                    .content(Collections.emptyList())
                                    .page(page)
                                    .size(size)
                                    .totalElements(0)
                                    .totalPages(0)
                                    .first(true)
                                    .last(true)
                                    .build()
                    );
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
                .map(this::toDto)
                .doOnError(err -> log.error("Failed to fetch record {}", recordId, err))
                .onErrorResume(err -> Mono.empty());
    }

    /**
     * Garantit qu'on a des records: si la table est vide, tente de générer
     * quelques entrées à partir du log SCAT brut.
     */
    private Mono<Void> ensureRecords(Long sessionId) {
        return recordRepository.countBySessionId(sessionId)
                .flatMap(count -> count > 0 ? Mono.empty() : generateRecordsFromScatLog(sessionId));
    }

    private Mono<Void> generateRecordsFromScatLog(Long sessionId) {
        return sessionService.getSession(sessionId)
                .flatMap(session -> Mono.fromCallable(() -> {
                    Path logPath = Paths.get(session.getSessionDir(), "scat.log");
                    if (!Files.exists(logPath)) {
                        return Collections.<Record>emptyList();
                    }
                    List<String> lines = Files.readAllLines(logPath);
                    if (lines.isEmpty()) {
                        return Collections.<Record>emptyList();
                    }
                    return lines.stream()
                            .skip(Math.max(0, lines.size() - 50)) // garder les dernières lignes
                            .map(line -> toRecordFromLogLine(sessionId, line))
                            .collect(Collectors.toList());
                }))
                .flatMapMany(Flux::fromIterable)
                .flatMap(recordRepository::save)
                .then();
    }

    private Record toRecordFromLogLine(Long sessionId, String line) {
        String message = line == null ? "" : line.trim();
        String messageType = message.length() > 100 ? message.substring(0, 100) : message;
        return Record.builder()
                .sessionId(sessionId)
                .timestamp(Instant.now())
                .protocol("LOG")
                .direction("DL")
                .messageType(messageType)
                .layer("L3")
                .rat("LTE")
                .decodedData(message)
                .length(message.length())
                .build();
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
                .rat(record.getRat())
                .frameNumber(record.getFrameNumber())
                .hexData(record.getHexData())
                .decodedData(record.getDecodedData())
                .payloadJson(record.getPayloadJson())
                .length(record.getLength())
                .build();
    }
}
