package com.nathan.p2.service;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DetailedKpiExtractor {

    private final KpiAggregateRepository kpiRepository;

    public Mono<Void> extractAll(Long sessionId, Path pcapFile) {
        log.info("Extracting detailed KPIs (by cause/type/cell) for session {}", sessionId);
        return Flux.merge(
            extractRrcByCause(sessionId, pcapFile),
            extractAttachByType(sessionId, pcapFile),
            extractPerCellKpis(sessionId, pcapFile)
        ).then();
    }

    private Mono<String> exec(String... command) {
        return Mono.fromCallable(() -> {
            Process p = new ProcessBuilder(command).start();
            StringBuilder out = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) out.append(line).append("\n");
            }
            p.waitFor();
            return out.toString();
        });
    }

    private Flux<KpiAggregate> extractRrcByCause(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "lte-rrc.rrcConnectionRequest_element || lte-rrc.rrcConnectionSetupComplete_element",
            "-T", "fields", "-e", "lte-rrc.establishmentCause", "-E", "separator=|")
            .flatMapMany(output -> {
                Map<String, Integer> req = new HashMap<>(), suc = new HashMap<>();
                String last = null;
                for (String line : output.split("\n")) {
                    if (!line.isEmpty()) {
                        req.merge(line.trim(), 1, Integer::sum);
                        last = line.trim();
                    } else if (last != null) {
                        suc.merge(last, 1, Integer::sum);
                    }
                }
                List<KpiAggregate> kpis = new ArrayList<>();
                for (String cause : req.keySet()) {
                    double sr = req.get(cause) > 0 ? (suc.getOrDefault(cause, 0) * 100.0 / req.get(cause)) : 0.0;
                    kpis.add(KpiAggregate.builder()
                        .sessionId(sessionId).metric("LTE_RRC_SR_" + cause.toUpperCase())
                        .windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now())
                        .avgValue(sr).rat("LTE").build());
                }
                return Flux.fromIterable(kpis);
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractAttachByType(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "nas-eps.nas_msg_emm_type == 0x41 || nas-eps.nas_msg_emm_type == 0x42",
            "-T", "fields", "-e", "nas-eps.emm.eps_att_type", "-E", "separator=|")
            .flatMapMany(output -> {
                Map<String, Integer> req = new HashMap<>(), acc = new HashMap<>();
                String last = null;
                for (String line : output.split("\n")) {
                    if (!line.isEmpty()) {
                        String type = line.equals("0") ? "EMERGENCY" : line.equals("1") ? "NORMAL" : "COMBINED";
                        if (last == null) {
                            req.merge(type, 1, Integer::sum);
                            last = type;
                        } else {
                            acc.merge(last, 1, Integer::sum);
                            last = null;
                        }
                    }
                }
                List<KpiAggregate> kpis = new ArrayList<>();
                for (String type : req.keySet()) {
                    double sr = req.get(type) > 0 ? (acc.getOrDefault(type, 0) * 100.0 / req.get(type)) : 0.0;
                    kpis.add(KpiAggregate.builder()
                        .sessionId(sessionId).metric("LTE_ATTACH_SR_" + type)
                        .windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now())
                        .avgValue(sr).rat("LTE").build());
                }
                return Flux.fromIterable(kpis);
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractPerCellKpis(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "lte-rrc.rrcConnectionRequest_element || lte-rrc.rrcConnectionSetupComplete_element",
            "-T", "fields", "-e", "lte-rrc.physCellId", "-E", "separator=|")
            .flatMapMany(output -> {
                Map<String, Integer> req = new HashMap<>(), suc = new HashMap<>();
                String last = null;
                for (String line : output.split("\n")) {
                    if (!line.isEmpty()) {
                        req.merge(line.trim(), 1, Integer::sum);
                        last = line.trim();
                    } else if (last != null) {
                        suc.merge(last, 1, Integer::sum);
                    }
                }
                List<KpiAggregate> kpis = new ArrayList<>();
                for (String cell : req.keySet()) {
                    double sr = req.get(cell) > 0 ? (suc.getOrDefault(cell, 0) * 100.0 / req.get(cell)) : 0.0;
                    kpis.add(KpiAggregate.builder()
                        .sessionId(sessionId).metric("LTE_RRC_SR_CELL")
                        .windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now())
                        .avgValue(sr).cellId(cell).rat("LTE").build());
                }
                return Flux.fromIterable(kpis);
            }).flatMap(kpiRepository::save);
    }
}
