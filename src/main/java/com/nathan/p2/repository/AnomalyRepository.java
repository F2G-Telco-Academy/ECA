package com.nathan.p2.repository;

import com.nathan.p2.domain.Anomaly;
import com.nathan.p2.domain.AnomalyCategory;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface AnomalyRepository extends ReactiveCrudRepository<Anomaly, Long> {
    Flux<Anomaly> findBySessionId(Long sessionId);
    
    Flux<Anomaly> findBySessionIdAndCategory(Long sessionId, AnomalyCategory category);
}
