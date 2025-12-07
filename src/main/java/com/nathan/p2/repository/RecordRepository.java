package com.nathan.p2.repository;

import com.nathan.p2.domain.Record;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Reactive repository for signaling message records.
 */
@Repository
public interface RecordRepository extends ReactiveCrudRepository<Record, Long> {
    
    /**
     * Find all records for a session.
     */
    Flux<Record> findBySessionId(Long sessionId);
    
    /**
     * Find records by session and protocol.
     */
    Flux<Record> findBySessionIdAndProtocol(Long sessionId, String protocol);
    
    /**
     * Count records for a session.
     */
    @Query("SELECT COUNT(*) FROM records WHERE session_id = :sessionId")
    Mono<Long> countBySessionId(Long sessionId);
    
    /**
     * Find records by session and direction.
     */
    Flux<Record> findBySessionIdAndDirection(Long sessionId, String direction);
}
