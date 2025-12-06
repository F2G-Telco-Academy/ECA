package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
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
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TSharkIntegrationService {
    private final ExternalToolService toolService;
    private final ToolsConfig config;

    /**
     * Extract PSML (Packet Summary Markup Language) - for table view
     * Based on: termshark/pkg/pcap/cmds.go Psml()
     */
    public Flux<String> extractPsml(Path pcapFile, String displayFilter) {
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-T");
        args.add("psml");
        
        if (displayFilter != null && !displayFilter.isEmpty()) {
            args.add("-Y");
            args.add(displayFilter);
        }
        
        // GSMTAP decode
        args.add("-d");
        args.add("udp.port==4729,gsmtap");
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-psml-" + System.currentTimeMillis())
            .command(config.getTools().getTshark().getPath())
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs);
    }

    /**
     * Extract JSON for detailed analysis
     * Based on: termshark patterns for structured output
     */
    public Flux<String> extractJson(Path pcapFile, String displayFilter) {
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-T");
        args.add("json");
        
        if (displayFilter != null && !displayFilter.isEmpty()) {
            args.add("-Y");
            args.add(displayFilter);
        }
        
        // GSMTAP decode
        args.add("-d");
        args.add("udp.port==4729,gsmtap");
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-json-" + System.currentTimeMillis())
            .command(config.getTools().getTshark().getPath())
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs);
    }

    /**
     * Extract specific fields for KPI calculation
     * Based on: KPI calculator patterns using TShark filters
     */
    public Mono<Integer> countPackets(Path pcapFile, String filter) {
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-d");
        args.add("udp.port==4729,gsmtap");
        args.add("-Y");
        args.add(filter);
        args.add("-T");
        args.add("fields");
        args.add("-e");
        args.add("frame.number");
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-count-" + System.currentTimeMillis())
            .command(config.getTools().getTshark().getPath())
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs)
            .filter(line -> !line.isEmpty() && !line.startsWith("Cannot"))
            .count()
            .map(Long::intValue);
    }

    /**
     * Extract packet details with timestamps for KPI calculation
     * Based on: scat/scripts/kpi_calculator_comprehensive.py patterns
     */
    public Flux<PacketDetail> extractPacketDetails(Path pcapFile, String filter) {
        List<String> args = new ArrayList<>();
        args.add("-r");
        args.add(pcapFile.toString());
        args.add("-d");
        args.add("udp.port==4729,gsmtap");
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
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("tshark-details-" + System.currentTimeMillis())
            .command(config.getTools().getTshark().getPath())
            .args(args)
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
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

    public record PacketDetail(int frameNumber, double timestamp) {}
}
