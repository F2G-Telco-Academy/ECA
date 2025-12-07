package com.nathan.p2.controller;

import com.nathan.p2.domain.Artifact;
import com.nathan.p2.repository.ArtifactRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Artifact Management", description = "APIs for accessing and downloading session artifacts including PCAP files, JSON analysis results, and generated reports.")
public class ArtifactController {
    
    private final ArtifactRepository artifactRepository;

    @Operation(
        summary = "List artifacts for a session",
        description = "Returns all artifacts generated during the capture session including PCAP files, converted JSON data, analysis results, and reports. Each artifact includes file path, type, size, and creation timestamp."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Artifacts retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Artifact.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Session not found",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/session/{sessionId}")
    public Flux<Artifact> getSessionArtifacts(
        @Parameter(description = "Session ID", required = true, example = "1")
        @PathVariable Long sessionId
    ) {
        return artifactRepository.findBySessionId(sessionId);
    }

    @Operation(
        summary = "Download artifact file",
        description = "Downloads the specified artifact file. The file is returned as an octet-stream with appropriate Content-Disposition header for browser download. Supports PCAP, JSON, PDF, and other file types."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "File download initiated",
            content = @Content(
                mediaType = "application/octet-stream"
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Artifact not found or file does not exist",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/{id}/download")
    public Mono<ResponseEntity<Resource>> downloadArtifact(
        @Parameter(description = "Artifact ID", required = true, example = "1")
        @PathVariable Long id
    ) {
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
