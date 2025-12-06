package com.nathan.p2.repository;

import com.nathan.p2.domain.KpiAggregate;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface KpiAggregateRepository extends ReactiveCrudRepository<KpiAggregate, Long> {
    Flux<KpiAggregate> findBySessionId(Long sessionId);
    
    Flux<KpiAggregate> findBySessionIdAndMetric(Long sessionId, String metric);
}
