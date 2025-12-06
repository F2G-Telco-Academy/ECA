package com.nathan.p2.repository;

import com.nathan.p2.domain.Session;
import com.nathan.p2.domain.SessionStatus;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface SessionRepository extends ReactiveCrudRepository<Session, Long> {
    Flux<Session> findByStatus(SessionStatus status);
    
    Flux<Session> findByDeviceId(String deviceId);
    
    @Query("SELECT * FROM sessions ORDER BY start_time DESC LIMIT :limit")
    Flux<Session> findRecentSessions(int limit);
}
