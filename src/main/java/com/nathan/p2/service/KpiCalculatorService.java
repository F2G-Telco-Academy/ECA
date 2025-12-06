package com.nathan.p2.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import com.nathan.p2.config.ToolsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class KpiCalculatorService {
    private final ExternalToolService toolService;
    private final KpiAggregateRepository kpiRepo;
    private final ToolsConfig config;
    private final ObjectMapper mapper = new ObjectMapper();

    public Mono<Void> calculate(Long sessionId, Path pcap) {
        Path script = Paths.get(config.getTools().getScat().getPath())
            .getParent().resolve("scripts/kpi_calculator_comprehensive.py");
        Path output = pcap.getParent().resolve("kpis.json");

        ProcessSpec spec = ProcessSpec.builder()
            .id("kpi-" + sessionId)
            .command("python3")
            .args(List.of(script.toString(), pcap.toString()))
            .workingDirectory(pcap.getParent())
            .environment(Map.of())
            .build();

        return toolService.start(spec)
            .flatMap(toolService::awaitExit)
            .flatMap(code -> code == 0 ? parseKpis(sessionId, output) : 
                Mono.error(new RuntimeException("KPI calc failed: " + code)))
            .then();
    }

    private Mono<Void> parseKpis(Long sessionId, Path file) {
        return Mono.fromCallable(() -> mapper.readTree(Files.readString(file)))
            .flatMapMany(root -> {
                List<KpiAggregate> kpis = new ArrayList<>();
                LocalDateTime now = LocalDateTime.now();
                LocalDateTime start = now.minusMinutes(5);

                // LTE KPIs
                add(kpis, sessionId, "LTE_RRC_SR", root.path("lte_rrc_success").asDouble(), start, now, "LTE");
                add(kpis, sessionId, "LTE_ATTACH_SR", root.path("lte_attach_success").asDouble(), start, now, "LTE");
                add(kpis, sessionId, "LTE_TAU_SR", root.path("lte_tau_success").asDouble(), start, now, "LTE");
                add(kpis, sessionId, "LTE_HO_SR", root.path("lte_ho_success").asDouble(), start, now, "LTE");
                add(kpis, sessionId, "LTE_SERVICE_SR", root.path("lte_service_success").asDouble(), start, now, "LTE");
                add(kpis, sessionId, "LTE_PDN_SR", root.path("lte_pdn_success").asDouble(), start, now, "LTE");
                
                // WCDMA KPIs
                add(kpis, sessionId, "WCDMA_RRC_SR", root.path("wcdma_rrc_success").asDouble(), start, now, "WCDMA");
                add(kpis, sessionId, "WCDMA_RAB_SR", root.path("wcdma_rab_success").asDouble(), start, now, "WCDMA");
                add(kpis, sessionId, "WCDMA_HO_SR", root.path("wcdma_ho_success").asDouble(), start, now, "WCDMA");
                
                // Call KPIs
                add(kpis, sessionId, "CALL_SUCCESS_RATE", root.path("call_success").asDouble(), start, now, "CS");
                add(kpis, sessionId, "CALL_DROP_RATE", root.path("call_drop_rate").asDouble(), start, now, "CS");

                return Flux.fromIterable(kpis);
            })
            .flatMap(kpiRepo::save)
            .then();
    }

    private void add(List<KpiAggregate> list, Long sid, String metric, Double val, 
                     LocalDateTime start, LocalDateTime end, String rat) {
        list.add(KpiAggregate.builder()
            .sessionId(sid)
            .metric(metric)
            .windowStart(start)
            .windowEnd(end)
            .avgValue(val)
            .minValue(val)
            .maxValue(val)
            .rat(rat)
            .build());
    }
}
