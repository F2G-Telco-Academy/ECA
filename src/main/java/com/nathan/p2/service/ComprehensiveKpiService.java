package com.nathan.p2.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComprehensiveKpiService {
    private final ExternalToolService toolService;
    private final ToolsConfig config;
    private final ObjectMapper objectMapper;

    public Mono<Map<String, Object>> extractKpis(Path pcapFile) {
        String scriptPath = Path.of(config.getTools().getScat().getPath())
            .resolve("scripts/kpi_calculator_comprehensive.py")
            .toString();
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("kpi-extract-" + System.currentTimeMillis())
            .command("python3")
            .args(List.of(scriptPath, pcapFile.toString()))
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMap(handle -> toolService.logs(handle)
                .collectList()
                .flatMap(lines -> {
                    String jsonOutput = String.join("\n", lines);
                    try {
                        JsonNode kpis = objectMapper.readTree(jsonOutput);
                        @SuppressWarnings("unchecked")
                        Map<String, Object> result = objectMapper.convertValue(kpis, Map.class);
                        return Mono.just(result);
                    } catch (Exception e) {
                        log.error("Failed to parse KPI JSON", e);
                        return Mono.error(e);
                    }
                }));
    }

    public Mono<KpiResult> extractDetailedKpis(Path pcapFile) {
        return extractKpis(pcapFile)
            .map(kpis -> {
                @SuppressWarnings("unchecked")
                Map<String, Double> kpiMap = (Map<String, Double>) kpis.get("kpis");
                @SuppressWarnings("unchecked")
                Map<String, List<EventDetail>> eventDetails = (Map<String, List<EventDetail>>) kpis.get("event_details");
                return new KpiResult(kpiMap, eventDetails);
            });
    }

    public record KpiResult(
        Map<String, Double> kpis,
        Map<String, List<EventDetail>> eventDetails
    ) {}

    public record EventDetail(
        int frame,
        double timestamp
    ) {}
}
