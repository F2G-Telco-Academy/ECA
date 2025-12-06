package com.nathan.p2.repository;

import com.nathan.p2.domain.GpsTrace;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface GpsTraceRepository extends ReactiveCrudRepository<GpsTrace, Long> {
    @Query("SELECT * FROM gps_traces WHERE session_id = :sessionId ORDER BY timestamp ASC")
    Flux<GpsTrace> findBySessionIdOrderByTimestampAsc(Long sessionId);
}
