package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import com.nathan.p2.util.PlatformUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OfflineLogConversionService {
    private final ExternalToolService toolService;
    private final ToolsConfig config;

    public enum LogFormat {
        QMDL("qc"),
        SDM("sec"),
        LPD("hisi");

        private final String scatType;
        LogFormat(String scatType) { this.scatType = scatType; }
        public String getScatType() { return scatType; }
    }

    public Mono<Path> convertToPcap(Path inputLog, Path outputPcap, LogFormat format) {
        List<String> args = new ArrayList<>();
        args.add("main.py");
        args.add("-t");
        args.add(format.getScatType());
        args.add("-d");
        args.add(inputLog.toAbsolutePath().toString());
        args.add("-F");
        args.add(outputPcap.toAbsolutePath().toString());
        args.add("-L");
        args.add("ip,mac,rlc,pdcp,rrc,nas");  // GSMTAP layers
        
        String pythonPath = PlatformUtils.resolvePythonPath(config.getTools().getScat().getPythonPath());
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("scat-convert-" + System.currentTimeMillis())
            .command(pythonPath)
            .args(args)
            .workingDirectory(Path.of(config.getTools().getScat().getPath()))
            .environment(Map.of("PYTHONPATH", ".."))
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMap(handle -> toolService.awaitExit(handle)
                .flatMap(code -> {
                    if (code == 0) {
                        log.info("SCAT process completed with code 0");
                        // Verify PCAP was created and has minimum size
                        if (java.nio.file.Files.exists(outputPcap)) {
                            try {
                                long size = java.nio.file.Files.size(outputPcap);
                                if (size > 100) {
                                    log.info("Successfully converted {} to {} ({} bytes)", inputLog, outputPcap, size);
                                    return Mono.just(outputPcap);
                                } else {
                                    log.error("PCAP file too small ({} bytes), likely empty or corrupted", size);
                                    return Mono.error(new RuntimeException("PCAP file created but too small (< 100 bytes)"));
                                }
                            } catch (Exception e) {
                                log.error("Error checking PCAP file: {}", e.getMessage());
                                return Mono.error(new RuntimeException("PCAP file created but cannot read: " + e.getMessage()));
                            }
                        } else {
                            log.error("SCAT completed but PCAP not found at: {}", outputPcap);
                            return Mono.error(new RuntimeException("Conversion completed but PCAP file not created"));
                        }
                    } else {
                        log.error("Conversion failed with exit code: {}", code);
                        return Mono.error(new RuntimeException("SCAT conversion failed with exit code: " + code));
                    }
                }));
    }

    public LogFormat detectFormat(Path logFile) {
        String filename = logFile.getFileName().toString().toLowerCase();
        if (filename.endsWith(".qmdl") || filename.endsWith(".qmdl2")) {
            return LogFormat.QMDL;
        } else if (filename.endsWith(".sdm")) {
            return LogFormat.SDM;
        } else if (filename.endsWith(".lpd")) {
            return LogFormat.LPD;
        }
        throw new IllegalArgumentException("Unknown log format: " + filename);
    }
}
