package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import com.nathan.p2.util.PlatformUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * SCAT Integration Service
 * Executes SCAT commands for baseband log capture
 * 
 * Based on SCAT main.py patterns:
 * - python3 -m scat -t qc -u --qmdl output.qmdl (Qualcomm)
 * - python3 -m scat -t sec -u --sdmraw output.sdm (Samsung)
 * - python3 -m scat -t mtk -u (MediaTek)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScatIntegrationService {
    private final ExternalToolService toolService;
    private final ToolsConfig config;

    public enum Chipset {
        QUALCOMM("qc"),
        SAMSUNG("sec"),
        MEDIATEK("mtk"),
        HISILICON("hisi"),
        UNISOC("unisoc");

        private final String scatType;

        Chipset(String scatType) {
            this.scatType = scatType;
        }

        public String getScatType() {
            return scatType;
        }
    }

    /**
     * Start SCAT capture
     * Based on: scat main.py
     */
    public Mono<ProcessHandle> startCapture(String deviceId, Path outputFile, Chipset chipset) {
        List<String> args = new ArrayList<>();
        args.add("-m");
        args.add("scat");
        args.add("-t");
        args.add(chipset.getScatType());
        args.add("-u");  // USB mode
        
        // Chipset-specific output format
        switch (chipset) {
            case QUALCOMM:
                args.add("--qmdl");
                args.add(outputFile.toString());
                break;
            case SAMSUNG:
                args.add("--sdmraw");
                args.add(outputFile.toString());
                break;
            default:
                // Other chipsets output to stdout
                break;
        }
        
        String pythonPath = PlatformUtils.resolvePythonPath(config.getTools().getScat().getPythonPath());
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("scat-" + deviceId + "-" + System.currentTimeMillis())
            .command(pythonPath)
            .args(args)
            .workingDirectory(Path.of(config.getTools().getScat().getPath()))
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .doOnSuccess(h -> log.info("SCAT capture started for device: {} on {}", deviceId, PlatformUtils.getPlatformName()))
            .doOnError(e -> log.error("Failed to start SCAT capture: {}", e.getMessage()));
    }

    /**
     * Stop SCAT capture
     */
    public Mono<Integer> stopCapture(ProcessHandle handle) {
        return toolService.stop(handle)
            .doOnSuccess(code -> log.info("SCAT capture stopped with code: {}", code));
    }

    /**
     * List USB devices
     * Based on: scat -l
     */
    public Flux<String> listDevices() {
        List<String> args = List.of("-m", "scat", "-l");
        
        String pythonPath = PlatformUtils.resolvePythonPath(config.getTools().getScat().getPythonPath());
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("scat-list-" + System.currentTimeMillis())
            .command(pythonPath)
            .args(args)
            .workingDirectory(Path.of(config.getTools().getScat().getPath()))
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs);
    }

    /**
     * Get SCAT stderr for debugging
     */
    public Flux<String> getStderr(ProcessHandle handle) {
        return toolService.stderr(handle);
    }
}
