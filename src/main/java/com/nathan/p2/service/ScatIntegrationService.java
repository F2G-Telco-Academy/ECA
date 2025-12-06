package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * SCAT Integration Service - Based on actual SCAT patterns
 * 
 * SCAT Command Pattern:
 * python3 -m scat.main -t qc -u --pcap output.pcap -P 4729 -H 127.0.0.1 -L ip,mac,rlc,pdcp,rrc,nas
 * 
 * Parsers: qc (Qualcomm), sec (Samsung), hisi (HiSilicon), unisoc (Unisoc)
 * Layers: ip, nas, rrc, pdcp, rlc, mac, qmi
 * Ports: 4729 (control plane), 47290 (user plane)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScatIntegrationService {
    private final ExternalToolService toolService;
    private final ToolsConfig config;

    /**
     * Start SCAT capture with USB device
     * Based on: scat/src/scat/main.py patterns
     */
    public Mono<ProcessHandle> startUsbCapture(Long sessionId, Path pcapOutput) {
        List<String> args = buildScatArgs(pcapOutput, true);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("scat-usb-" + sessionId)
            .command("python3")
            .args(args)
            .workingDirectory(Paths.get(config.getTools().getScat().getPath()).getParent())
            .environment(Map.of(
                "PYTHONPATH", Paths.get(config.getTools().getScat().getPath()).getParent().toString()
            ))
            .build();

        return toolService.start(spec)
            .doOnSuccess(h -> log.info("SCAT USB capture started: {}", pcapOutput));
    }

    /**
     * Read from dump file (offline analysis)
     * Based on: scat/src/scat/main.py --dump option
     */
    public Mono<ProcessHandle> readDump(Long sessionId, Path dumpFile, Path pcapOutput) {
        List<String> args = buildScatArgs(pcapOutput, false);
        args.add("-d");
        args.add(dumpFile.toString());
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("scat-dump-" + sessionId)
            .command("python3")
            .args(args)
            .workingDirectory(Paths.get(config.getTools().getScat().getPath()).getParent())
            .environment(Map.of(
                "PYTHONPATH", Paths.get(config.getTools().getScat().getPath()).getParent().toString()
            ))
            .build();

        return toolService.start(spec)
            .doOnSuccess(h -> log.info("SCAT dump read started: {}", dumpFile));
    }

    /**
     * Build SCAT command arguments based on actual patterns
     */
    private List<String> buildScatArgs(Path pcapOutput, boolean usb) {
        List<String> args = new ArrayList<>();
        
        // Module invocation
        args.add("-m");
        args.add("scat.main");
        
        // Parser type (from config or default to Qualcomm)
        args.add("-t");
        args.add("qc"); // Qualcomm parser
        
        // USB mode
        if (usb) {
            args.add("-u");
        }
        
        // PCAP output
        args.add("--pcap-file");
        args.add(pcapOutput.toString());
        
        // GSMTAP settings
        args.add("-P");
        args.add("4729"); // Control plane port
        
        args.add("--port-up");
        args.add("47290"); // User plane port
        
        args.add("-H");
        args.add("127.0.0.1");
        
        // Layers to capture (all important layers)
        args.add("-L");
        args.add("ip,mac,rlc,pdcp,rrc,nas");
        
        // Display format
        args.add("-f");
        args.add("x"); // Hexadecimal
        
        return args;
    }
}
