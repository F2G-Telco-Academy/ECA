package com.nathan.p2.controller;

import com.nathan.p2.domain.Artifact;
import com.nathan.p2.repository.ArtifactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Paths;

@RestController
@RequestMapping("/api/artifacts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ArtifactController {
    
    private final ArtifactRepository artifactRepository;

    @GetMapping("/session/{sessionId}")
    public Flux<Artifact> getSessionArtifacts(@PathVariable Long sessionId) {
        return artifactRepository.findBySessionId(sessionId);
    }

    @GetMapping("/{id}/download")
    public Mono<ResponseEntity<Resource>> downloadArtifact(@PathVariable Long id) {
        return artifactRepository.findById(id)
                .map(artifact -> {
                    Resource resource = new FileSystemResource(Paths.get(artifact.getPath()));
                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION, 
                                    "attachment; filename=\"" + Paths.get(artifact.getPath()).getFileName() + "\"")
                            .contentType(MediaType.APPLICATION_OCTET_STREAM)
                            .body(resource);
                })
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
