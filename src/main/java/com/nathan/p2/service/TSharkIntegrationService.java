package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import com.nathan.p2.util.PlatformUtils;
import lombok.Builder;
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
 * TShark Integration Service - Based on Termshark patterns
 * 
 * TShark Commands from termshark/pkg/pcap/cmds.go:
 * - PSML: tshark -r file.pcap -T psml -Y "display_filter"
 * - PDML: tshark -r file.pcap -T pdml -Y "display_filter"
 * - JSON: tshark -r file.pcap -T json -Y "display_filter"
 * - Fields: tshark -r file.pcap -T fields -e field1 -e field2
 * - Live: tshark -i interface -w file.pcap -f "capture_filter"
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TSharkIntegrationService {
    private final ExternalToolService toolService;
    private final ToolsConfig config;

    @Builder
    public record TSharkOptions(
        String displayFilter,
        String captureFilter,
        List<String> decodeAs,
        String profile,
        String columnFormat,
        boolean color,
        boolean liveMode
    ) {
        public static TSharkOptions defaults() {
            return TSharkOptions.builder()
                .decodeAs(List.of("udp.port==4729,gsmtap"))
                .color(false)
                .liveMode(false)
                .build();
        }
    }

    /**
     * Start live capture from network interface
     * Based on: termshark/pkg/pcap/cmds.go Iface()
     */
    public Mono<ProcessHandle> startLiveCapture(String iface, Path outputFile, TSharkOptions opts) {
        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(iface);
        args.add("-w");
        args.add(outputFile.toString());
        
        if (opts.captureFilter() != null && !opts.captureFilter().isEmpty()) {
            args.add("-f");
            args.add(opts.captureFilter());
        }
        
        addCommonOptions(args, opts);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-live-" + System.currentTimeMillis())
            .command(PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath()))
            .args(args)
            .workingDirectory(outputFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec);
    }

    /**
     * Extract PSML (Packet Summary Markup Language) - for table view
     * Based on: termshark/pkg/pcap/cmds.go Psml()
     */
    public Flux<String> extractPsml(Path pcapFile, TSharkOptions opts) {
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-T");
        args.add("psml");
        
        if (opts.displayFilter() != null && !opts.displayFilter().isEmpty()) {
            args.add("-Y");
            args.add(opts.displayFilter());
        }
        
        addCommonOptions(args, opts);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-psml-" + System.currentTimeMillis())
            .command(PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath()))
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs);
    }

    /**
     * Extract PDML (Packet Details Markup Language) - for detailed inspection
     * Based on: termshark/pkg/pcap/cmds.go Pdml()
     */
    public Flux<String> extractPdml(Path pcapFile, TSharkOptions opts) {
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-T");
        args.add("pdml");
        
        if (opts.displayFilter() != null && !opts.displayFilter().isEmpty()) {
            args.add("-Y");
            args.add(opts.displayFilter());
        }
        
        addCommonOptions(args, opts);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-pdml-" + System.currentTimeMillis())
            .command(PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath()))
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs);
    }

    /**
     * Extract JSON for detailed analysis
     */
    public Flux<String> extractJson(Path pcapFile, TSharkOptions opts) {
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-T");
        args.add("json");
        
        if (opts.displayFilter() != null && !opts.displayFilter().isEmpty()) {
            args.add("-Y");
            args.add(opts.displayFilter());
        }
        
        addCommonOptions(args, opts);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-json-" + System.currentTimeMillis())
            .command(PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath()))
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs);
    }

    /**
     * Extract specific fields for KPI calculation
     */
    public Mono<Integer> countPackets(Path pcapFile, String filter) {
        TSharkOptions opts = TSharkOptions.builder()
            .displayFilter(filter)
            .decodeAs(List.of("udp.port==4729,gsmtap"))
            .build();
        
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-Y");
        args.add(filter);
        args.add("-T");
        args.add("fields");
        args.add("-e");
        args.add("frame.number");
        
        addCommonOptions(args, opts);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-count-" + System.currentTimeMillis())
            .command(PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath()))
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs)
            .filter(line -> !line.isEmpty() && !line.startsWith("Cannot"))
            .count()
            .map(Long::intValue);
    }

    /**
     * Extract packet details with timestamps for KPI calculation
     */
    public Flux<PacketDetail> extractPacketDetails(Path pcapFile, String filter) {
        TSharkOptions opts = TSharkOptions.builder()
            .displayFilter(filter)
            .decodeAs(List.of("udp.port==4729,gsmtap"))
            .build();
        
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-Y");
        args.add(filter);
        args.add("-T");
        args.add("fields");
        args.add("-e");
        args.add("frame.number");
        args.add("-e");
        args.add("frame.time_epoch");
        args.add("-E");
        args.add("separator=|");
        
        addCommonOptions(args, opts);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-details-" + System.currentTimeMillis())
            .command(PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath()))
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs)
            .filter(line -> !line.isEmpty() && !line.startsWith("Cannot"))
            .map(line -> {
                String[] parts = line.split("\\|");
                return new PacketDetail(
                    Integer.parseInt(parts[0]),
                    Double.parseDouble(parts[1])
                );
            });
    }

    /**
     * Extract specific field values (e.g., RSRP, RSRQ) for signal quality KPIs
     */
    public Flux<String> extractFields(Path pcapFile, List<String> fields) {
        TSharkOptions opts = TSharkOptions.builder()
            .decodeAs(List.of("udp.port==4729,gsmtap"))
            .build();
        
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-T");
        args.add("fields");
        
        for (String field : fields) {
            args.add("-e");
            args.add(field);
        }
        
        args.add("-E");
        args.add("separator=,");
        
        addCommonOptions(args, opts);
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-fields-" + System.currentTimeMillis())
            .command(PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath()))
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs)
            .filter(line -> !line.isEmpty() && !line.startsWith("Cannot"));
    }

    /**
     * Get stderr output for debugging
     */
    public Flux<String> getStderr(ProcessHandle handle) {
        return toolService.stderr(handle);
    }

    /**
     * Add common TShark options (decode-as, profile, color, column format)
     * Based on: termshark patterns
     */
    private void addCommonOptions(List<String> args, TSharkOptions opts) {
        // Decode-as options
        if (opts.decodeAs() != null) {
            for (String decode : opts.decodeAs()) {
                args.add("-d");
                args.add(decode);
            }
        }
        
        // Profile support
        if (opts.profile() != null && !opts.profile().isEmpty()) {
            args.add("-C");
            args.add(opts.profile());
        }
        
        // Column format (for PSML)
        if (opts.columnFormat() != null && !opts.columnFormat().isEmpty()) {
            args.add("-o");
            args.add("gui.column.format:" + opts.columnFormat());
        }
        
        // Color support
        if (opts.color()) {
            args.add("--color");
        }
    }

    public record PacketDetail(int frameNumber, double timestamp) {}
}
