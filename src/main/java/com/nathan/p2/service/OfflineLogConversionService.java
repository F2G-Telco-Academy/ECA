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
        args.add("-m");
        args.add("scat");
        args.add("-t");
        args.add(format.getScatType());
        args.add("-d");
        args.add(inputLog.toString());
        args.add("-F");
        args.add(outputPcap.toString());
        
        String pythonPath = PlatformUtils.resolvePythonPath(config.getTools().getScat().getPythonPath());
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("scat-convert-" + System.currentTimeMillis())
            .command(pythonPath)
            .args(args)
            .workingDirectory(Path.of(config.getTools().getScat().getPath()))
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMap(handle -> toolService.awaitExit(handle)
                .doOnSuccess(code -> {
                    if (code == 0) {
                        log.info("Successfully converted {} to {}", inputLog, outputPcap);
                    } else {
                        log.error("Conversion failed with code: {}", code);
                    }
                })
                .thenReturn(outputPcap));
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
