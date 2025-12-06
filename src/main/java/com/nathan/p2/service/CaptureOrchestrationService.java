package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.domain.*;
import com.nathan.p2.repository.ArtifactRepository;
import com.nathan.p2.repository.KpiAggregateRepository;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaptureOrchestrationService {
    
    private final ExternalToolService externalToolService;
    private final SessionService sessionService;
    private final ArtifactRepository artifactRepository;
    private final KpiAggregateRepository kpiRepository;
    private final KpiCalculatorService kpiCalculatorService;
    private final ToolsConfig toolsConfig;
    
    private final Map<Long, ProcessHandle> activeCaptures = new ConcurrentHashMap<>();
    private final Map<Long, Sinks.Many<String>> logSinks = new ConcurrentHashMap<>();

    public Mono<Session> startCapture(String deviceId) {
        return sessionService.createSession(deviceId)
                .flatMap(session -> {
                    log.info("Starting capture for session {}", session.getId());
                    return startScatCapture(session)
                            .then(sessionService.updateSessionStatus(session.getId(), SessionStatus.CAPTURING))
                            .thenReturn(session);
                });
    }

    private Mono<ProcessHandle> startScatCapture(Session session) {
        Path sessionDir = Paths.get(session.getSessionDir());
        Path pcapOutput = sessionDir.resolve("capture.pcap");
        
        // Build SCAT command: python3 -m scat.main -t qc -u --pcap output.pcap
        List<String> args = Arrays.asList(
                "-m", "scat.main",
                "-t", "qc",  // Qualcomm parser
                "-u",        // USB mode
                "--pcap", pcapOutput.toString()
        );
        
        ProcessSpec spec = ProcessSpec.builder()
                .id("scat-" + session.getId())
                .command("python3")
                .args(args)
                .workingDirectory(Paths.get(toolsConfig.getTools().getScat().getPath()).getParent())
                .build();
        
        return externalToolService.start(spec)
                .doOnSuccess(handle -> {
                    activeCaptures.put(session.getId(), handle);
                    log.info("SCAT capture started for session {}", session.getId());
                    
                    // Create log sink for streaming
                    Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
                    logSinks.put(session.getId(), sink);
                    
                    // Stream logs asynchronously
                    externalToolService.logs(handle)
                            .subscribe(
                                    line -> {
                                        log.debug("SCAT: {}", line);
                                        sink.tryEmitNext(line);
                                    },
                                    error -> {
                                        log.error("Error streaming SCAT logs", error);
                                        sink.tryEmitError(error);
                                    },
                                    () -> {
                                        log.info("SCAT capture completed for session {}", session.getId());
                                        sink.tryEmitComplete();
                                    }
                            );
                    
                    // Save artifact
                    saveArtifact(session.getId(), pcapOutput, ArtifactType.PCAP).subscribe();
                })
                .doOnError(error -> log.error("Failed to start SCAT capture", error));
    }

    public Mono<Void> stopCapture(Long sessionId) {
        ProcessHandle handle = activeCaptures.get(sessionId);
        if (handle == null) {
            return Mono.error(new IllegalStateException("No active capture for session " + sessionId));
        }
        
        return externalToolService.stop(handle)
                .then(sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZING))
                .then(runKpiCalculation(sessionId))
                .then(sessionService.updateSessionStatus(sessionId, SessionStatus.COMPLETED))
                .doFinally(signal -> {
                    activeCaptures.remove(sessionId);
                    Sinks.Many<String> sink = logSinks.remove(sessionId);
                    if (sink != null) {
                        sink.tryEmitComplete();
                    }
                })
                .then();
    }

    private Mono<Void> runKpiCalculation(Long sessionId) {
        return sessionService.getSession(sessionId)
                .flatMap(session -> {
                    Path pcapFile = Paths.get(session.getSessionDir()).resolve("capture.pcap");
                    return kpiCalculatorService.calculate(sessionId, pcapFile);
                });
    }

    private KpiAggregate createKpi(Long sessionId, String metric, Double avg, Double min, Double max, String rat) {
        LocalDateTime now = LocalDateTime.now();
        return KpiAggregate.builder()
                .sessionId(sessionId)
                .metric(metric)
                .windowStart(now.minusMinutes(5))
                .windowEnd(now)
                .avgValue(avg)
                .minValue(min)
                .maxValue(max)
                .rat(rat)
                .build();
    }

    private Mono<Artifact> saveArtifact(Long sessionId, Path filePath, ArtifactType type) {
        Artifact artifact = Artifact.builder()
                .sessionId(sessionId)
                .type(type)
                .path(filePath.toString())
                .size(0L)  // TODO: Get actual file size
                .createdAt(LocalDateTime.now())
                .build();
        
        return artifactRepository.save(artifact);
    }

    public Flux<String> streamLogs(Long sessionId) {
        Sinks.Many<String> sink = logSinks.get(sessionId);
        if (sink == null) {
            return Flux.error(new IllegalStateException("No active capture for session " + sessionId));
        }
        return sink.asFlux();
    }
}
