package com.nathan.p2.repository;

import com.nathan.p2.domain.Artifact;
import com.nathan.p2.domain.ArtifactType;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ArtifactRepository extends ReactiveCrudRepository<Artifact, Long> {
    Flux<Artifact> findBySessionId(Long sessionId);
    
    Flux<Artifact> findBySessionIdAndType(Long sessionId, ArtifactType type);
}
