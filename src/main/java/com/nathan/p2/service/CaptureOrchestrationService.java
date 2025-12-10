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

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final Map<Long, reactor.core.Disposable> kpiStreamDisposables = new ConcurrentHashMap<>();
    
    private static final int CREATE_NO_WINDOW = 0x08000000;

    private final DiagnosticModeChecker diagnosticModeChecker;
    
    public Mono<Session> startCapture(String deviceId) {
        // Check diagnostic mode first
        return Mono.fromCallable(() -> diagnosticModeChecker.checkDiagnosticMode(deviceId))
                .flatMap(diagResult -> {
                    if (!diagResult.isInDiagnosticMode()) {
                        log.error("Device not in diagnostic mode: {}", diagResult.getMessage());
                        return Mono.error(new IllegalStateException(
                            "Device not in diagnostic mode. " + diagResult.getInstructions()));
                    }
                    log.info("Device in diagnostic mode: {}", diagResult.getUsbAddress());
                    return sessionService.createSession(deviceId);
                })
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
        
        String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") 
            ? "python" : "python3";
        
        Path scatDir = Paths.get("scat").toAbsolutePath();
        Path scatSrc = scatDir.resolve("src");
        
        Map<String, String> env = new HashMap<>(System.getenv());
        String pythonPath = scatSrc.toString();
        if (env.containsKey("PYTHONPATH")) {
            pythonPath = pythonPath + File.pathSeparator + env.get("PYTHONPATH");
        }
        env.put("PYTHONPATH", pythonPath);
        
        // Detect COM ports on Windows, use USB on Linux
        List<String> args;
        if (System.getProperty("os.name").toLowerCase().contains("win")) {
            List<String> comPorts = detectComPorts();
            if (!comPorts.isEmpty()) {
                String comPort = comPorts.get(0);
                log.info("Found {} COM port(s), using: {}", comPorts.size(), comPort);
                args = List.of(
                    "-m", "scat.main",
                    "-t", toolsConfig.getTools().getScat().getType(),
                    "-s", comPort,
                    "-b", "115200",
                    "--pcap-file", pcapOutput.toString()
                );
            } else {
                log.warn("No COM ports found, using USB mode");
                args = List.of(
                    "-m", "scat.main",
                    "-t", toolsConfig.getTools().getScat().getType(),
                    "-u",
                    "--pcap-file", pcapOutput.toString()
                );
            }
        } else {
            args = List.of(
                "-m", "scat.main",
                "-t", toolsConfig.getTools().getScat().getType(),
                "-u",
                "--pcap-file", pcapOutput.toString()
            );
        }
        
        ProcessSpec spec = ProcessSpec.builder()
                .id("scat-" + session.getId())
                .command(pythonCmd)
                .args(args)
                .workingDirectory(scatDir.getParent())
                .environment(env)
                .captureStderr(true)
                .build();
        
        return externalToolService.start(spec)
                .doOnSuccess(handle -> {
                    activeCaptures.put(session.getId(), handle);
                    log.info("SCAT capture started for session {} using orchestrator", session.getId());

                    // Create log sink for streaming
                    Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
                    logSinks.put(session.getId(), sink);
                    
                    // Stream logs asynchronously with proper formatting
                    externalToolService.logs(handle)
                            .subscribe(
                                    line -> {
                                        String timestamp = java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
                                        String formattedLine = String.format("[%s] %s", timestamp, line);
                                        log.debug("SCAT: {}", line);
                                        sink.tryEmitNext(formattedLine);
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
                    
                    // Also stream stderr for errors
                    externalToolService.stderr(handle)
                            .subscribe(
                                    line -> {
                                        String timestamp = java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
                                        String formattedLine = String.format("[%s] ERROR: %s", timestamp, line);
                                        log.warn("SCAT ERROR: {}", line);
                                        sink.tryEmitNext(formattedLine);
                                    },
                                    error -> log.error("Error streaming SCAT stderr", error)
                            );
                    
                    // Save artifact (after a delay to ensure file is created)
                    reactor.core.publisher.Mono.delay(java.time.Duration.ofSeconds(2))
                        .then(saveArtifact(session.getId(), pcapOutput, ArtifactType.PCAP))
                        .subscribe();
                    
                    // Start real-time KPI streaming (every 5 seconds)
                    startRealtimeKpiStreaming(session.getId(), pcapOutput);
                })
                .doOnError(error -> log.error("Failed to start SCAT capture", error));
    }

    public Mono<Void> stopCapture(Long sessionId) {
        ProcessHandle handle = activeCaptures.get(sessionId);
        if (handle == null) {
            log.warn("No active capture process for session {}, cleaning up", sessionId);
            cleanupSession(sessionId);
            return sessionService.updateSessionStatus(sessionId, SessionStatus.COMPLETED).then();
        }
        
        return externalToolService.stop(handle)
                .timeout(java.time.Duration.ofSeconds(10))
                .then(sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZING))
                .then(runKpiCalculation(sessionId))
                .then(sessionService.updateSessionStatus(sessionId, SessionStatus.COMPLETED))
                .onErrorResume(error -> {
                    log.error("Error stopping capture for session {}", sessionId, error);
                    return sessionService.updateSessionStatus(sessionId, SessionStatus.FAILED)
                            .then(Mono.error(error));
                })
                .doFinally(signal -> {
                    cleanupSession(sessionId);
                })
                .then();
    }

    private void cleanupSession(Long sessionId) {
        try {
            activeCaptures.remove(sessionId);
            Sinks.Many<String> sink = logSinks.remove(sessionId);
            if (sink != null) {
                sink.tryEmitComplete();
            }
            
            // Stop KPI streaming
            reactor.core.Disposable kpiDisposable = kpiStreamDisposables.remove(sessionId);
            if (kpiDisposable != null && !kpiDisposable.isDisposed()) {
                kpiDisposable.dispose();
                log.info("Stopped real-time KPI streaming for session {}", sessionId);
            }
            
            log.info("Cleaned up resources for session {}", sessionId);
        } catch (Exception e) {
            log.error("Error cleaning up session {}", sessionId, e);
        }
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
    
    /**
     * Start real-time KPI streaming during live capture
     * Extracts KPIs every 5 seconds and emits to frontend
     */
    private void startRealtimeKpiStreaming(Long sessionId, Path pcapFile) {
        log.info("🔄 Starting real-time KPI streaming for session {}", sessionId);
        
        reactor.core.Disposable disposable = Flux.interval(java.time.Duration.ofSeconds(5))
            .flatMap(tick -> {
                // Check if file exists and has data
                if (!java.nio.file.Files.exists(pcapFile)) {
                    return Mono.empty();
                }
                
                try {
                    long fileSize = java.nio.file.Files.size(pcapFile);
                    if (fileSize < 1000) { // Wait for at least 1KB of data
                        return Mono.empty();
                    }
                    
                    // Extract KPIs from PCAP
                    return kpiCalculatorService.calculate(sessionId, pcapFile);
                } catch (Exception e) {
                    log.error("Error in real-time KPI extraction", e);
                    return Mono.empty();
                }
            })
            .subscribe(
                v -> log.debug("Real-time KPI extracted for session {}", sessionId),
                error -> log.error("Error in KPI streaming", error)
            );
        
        kpiStreamDisposables.put(sessionId, disposable);
    }
    
    private List<String> detectComPorts() {
        List<String> comPorts = new ArrayList<>();
        try {
            String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") ? "python" : "python3";
            ProcessBuilder pb = new ProcessBuilder(pythonCmd, "-c",
                "import serial.tools.list_ports; " +
                "[print(p.device) for p in serial.tools.list_ports.comports() " +
                "if p.vid == 0x05C6 and p.pid in [0x90B8, 0x90DB]]"
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.startsWith("COM") || line.startsWith("/dev/")) {
                        comPorts.add(line);
                    }
                }
            }
            process.waitFor();
        } catch (Exception e) {
            log.debug("COM port detection failed (pyserial not installed?)", e);
        }
        return comPorts;
    }
}
