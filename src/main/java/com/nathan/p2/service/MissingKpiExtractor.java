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
public class MissingKpiExtractor {

    private final KpiAggregateRepository kpiRepository;

    public Mono<Void> extractAll(Long sessionId, Path pcapFile) {
        log.info("Extracting all missing KPIs for session {}", sessionId);
        return Flux.merge(
            extractAuthKpis(sessionId, pcapFile),
            extractDedicatedBearerKpis(sessionId, pcapFile),
            extractRejectCauses(sessionId, pcapFile),
            extractPdcpLoss(sessionId, pcapFile),
            extractBler(sessionId, pcapFile),
            extractTauLatency(sessionId, pcapFile),
            extractCellLoad(sessionId, pcapFile),
            extractModulationScheme(sessionId, pcapFile)
        ).then();
    }

    private Mono<String> exec(String... cmd) {
        return Mono.fromCallable(() -> {
            Process p = new ProcessBuilder(cmd).start();
            StringBuilder out = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) out.append(line).append("\n");
            }
            p.waitFor();
            return out.toString();
        });
    }

    private Flux<KpiAggregate> extractAuthKpis(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "nas-eps.nas_msg_emm_type == 0x52 || nas-eps.nas_msg_emm_type == 0x53 || nas-eps.nas_msg_emm_type == 0x54",
            "-T", "fields", "-e", "nas-eps.nas_msg_emm_type", "-E", "separator=|")
            .flatMapMany(output -> {
                int authReq = 0, authResp = 0, authRej = 0;
                for (String line : output.split("\n")) {
                    if (line.contains("82")) authReq++;
                    else if (line.contains("83")) authResp++;
                    else if (line.contains("84")) authRej++;
                }
                double authSr = authReq > 0 ? ((authResp * 100.0) / authReq) : 0.0;
                
                List<KpiAggregate> kpis = Arrays.asList(
                    KpiAggregate.builder().sessionId(sessionId).metric("AUTH_REQ")
                        .avgValue((double) authReq).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build(),
                    KpiAggregate.builder().sessionId(sessionId).metric("AUTH_SUC")
                        .avgValue((double) authResp).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build(),
                    KpiAggregate.builder().sessionId(sessionId).metric("AUTH_REJ")
                        .avgValue((double) authRej).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build(),
                    KpiAggregate.builder().sessionId(sessionId).metric("AUTH_SR")
                        .avgValue(authSr).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build()
                );
                return Flux.fromIterable(kpis);
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractDedicatedBearerKpis(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "nas-eps.nas_msg_esm_type == 0xc5 || nas-eps.nas_msg_esm_type == 0xc6",
            "-T", "fields", "-e", "nas-eps.esm.qci", "-e", "nas-eps.nas_msg_esm_type", "-E", "separator=|")
            .flatMapMany(output -> {
                Map<String, Integer> bearerReq = new HashMap<>();
                Map<String, Integer> bearerAcc = new HashMap<>();
                String lastQci = null;
                
                for (String line : output.split("\n")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 2) {
                        String qci = parts[0].isEmpty() ? "1" : parts[0];
                        String type = parts[1];
                        if (type.contains("197")) { // 0xc5 = 197
                            bearerReq.merge("QCI" + qci, 1, Integer::sum);
                            lastQci = qci;
                        } else if (type.contains("198") && lastQci != null) { // 0xc6 = 198
                            bearerAcc.merge("QCI" + lastQci, 1, Integer::sum);
                        }
                    }
                }
                
                List<KpiAggregate> kpis = new ArrayList<>();
                for (String qci : bearerReq.keySet()) {
                    int req = bearerReq.get(qci);
                    int acc = bearerAcc.getOrDefault(qci, 0);
                    double sr = req > 0 ? (acc * 100.0 / req) : 0.0;
                    
                    kpis.add(KpiAggregate.builder().sessionId(sessionId)
                        .metric("DEDICATED_BEARER_SR_" + qci + "_REQ").avgValue((double) req)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build());
                    kpis.add(KpiAggregate.builder().sessionId(sessionId)
                        .metric("DEDICATED_BEARER_SR_" + qci + "_SUC").avgValue((double) acc)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build());
                    kpis.add(KpiAggregate.builder().sessionId(sessionId)
                        .metric("DEDICATED_BEARER_SR_" + qci + "_SR").avgValue(sr)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build());
                }
                return Flux.fromIterable(kpis);
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractRejectCauses(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "nas-eps.nas_msg_emm_type == 0x4c || nas-eps.nas_msg_emm_type == 0x4b || nas-eps.nas_msg_emm_type == 0x54",
            "-T", "fields", "-e", "nas-eps.emm.cause", "-e", "nas-eps.nas_msg_emm_type", "-E", "separator=|")
            .flatMapMany(output -> {
                int srRej = 0, tauRej = 0, authRej = 0;
                for (String line : output.split("\n")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 2) {
                        String type = parts[1];
                        if (type.contains("76")) srRej++;      // 0x4c = Service Reject
                        else if (type.contains("75")) tauRej++; // 0x4b = TAU Reject
                        else if (type.contains("84")) authRej++; // 0x54 = Auth Reject
                    }
                }
                
                List<KpiAggregate> kpis = Arrays.asList(
                    KpiAggregate.builder().sessionId(sessionId).metric("SR_REJ").avgValue((double) srRej)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build(),
                    KpiAggregate.builder().sessionId(sessionId).metric("TAU_REJ").avgValue((double) tauRej)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build(),
                    KpiAggregate.builder().sessionId(sessionId).metric("AUTH_FAIL").avgValue((double) authRej)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build()
                );
                return Flux.fromIterable(kpis);
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractPdcpLoss(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "pdcp-lte",
            "-T", "fields", "-e", "pdcp-lte.seqnum", "-e", "pdcp-lte.direction", "-E", "separator=|")
            .flatMapMany(output -> {
                List<Integer> dlSeq = new ArrayList<>();
                List<Integer> ulSeq = new ArrayList<>();
                
                for (String line : output.split("\n")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 2) {
                        try {
                            int seq = Integer.parseInt(parts[0]);
                            String dir = parts[1];
                            if (dir.contains("0")) dlSeq.add(seq); // Downlink
                            else ulSeq.add(seq); // Uplink
                        } catch (NumberFormatException ignored) {}
                    }
                }
                
                double dlLoss = calculateLoss(dlSeq);
                double ulLoss = calculateLoss(ulSeq);
                
                List<KpiAggregate> kpis = Arrays.asList(
                    KpiAggregate.builder().sessionId(sessionId).metric("DL_PDCP_LOSS").avgValue(dlLoss)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build(),
                    KpiAggregate.builder().sessionId(sessionId).metric("UL_PDCP_LOSS").avgValue(ulLoss)
                        .rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build()
                );
                return Flux.fromIterable(kpis);
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractBler(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "lte-mac.dl-sch.lcid",
            "-T", "fields", "-e", "lte-mac.dl-sch.crc-status", "-E", "separator=|")
            .flatMapMany(output -> {
                int total = 0, errors = 0;
                for (String line : output.split("\n")) {
                    if (!line.isEmpty()) {
                        total++;
                        if (line.contains("1")) errors++; // CRC error
                    }
                }
                double bler = total > 0 ? (errors * 100.0 / total) : 0.0;
                
                return Flux.just(KpiAggregate.builder().sessionId(sessionId).metric("BLER")
                    .avgValue(bler).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build());
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractTauLatency(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "nas-eps.nas_msg_emm_type == 0x48 || nas-eps.nas_msg_emm_type == 0x49",
            "-T", "fields", "-e", "frame.time_epoch", "-e", "nas-eps.nas_msg_emm_type", "-E", "separator=|")
            .flatMapMany(output -> {
                List<Double> latencies = new ArrayList<>();
                Double lastReqTime = null;
                
                for (String line : output.split("\n")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 2) {
                        try {
                            double time = Double.parseDouble(parts[0]);
                            String type = parts[1];
                            if (type.contains("72")) { // 0x48 = TAU Request
                                lastReqTime = time;
                            } else if (type.contains("73") && lastReqTime != null) { // 0x49 = TAU Accept
                                latencies.add((time - lastReqTime) * 1000); // ms
                                lastReqTime = null;
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }
                
                double avgLatency = latencies.isEmpty() ? 0.0 : latencies.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                
                return Flux.just(KpiAggregate.builder().sessionId(sessionId).metric("TAU_SR_LATENCY")
                    .avgValue(avgLatency).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build());
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractCellLoad(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "lte-rrc.measResults_element",
            "-T", "fields", "-e", "lte-rrc.rsrpResult", "-E", "separator=|")
            .flatMapMany(output -> {
                int count = 0;
                for (String line : output.split("\n")) {
                    if (!line.isEmpty()) count++;
                }
                double load = count > 0 ? Math.min(100.0, count / 10.0) : 0.0; // Heuristic
                
                return Flux.just(KpiAggregate.builder().sessionId(sessionId).metric("CELL_LOAD")
                    .avgValue(load).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build());
            }).flatMap(kpiRepository::save);
    }

    private Flux<KpiAggregate> extractModulationScheme(Long sessionId, Path pcapFile) {
        return exec("tshark", "-r", pcapFile.toString(),
            "-Y", "lte-mac.dl-sch.mcs-index",
            "-T", "fields", "-e", "lte-mac.dl-sch.mcs-index", "-E", "separator=|")
            .flatMapMany(output -> {
                List<Integer> mcsValues = new ArrayList<>();
                for (String line : output.split("\n")) {
                    if (!line.isEmpty()) {
                        try {
                            mcsValues.add(Integer.parseInt(line.trim()));
                        } catch (NumberFormatException ignored) {}
                    }
                }
                
                double avgMcs = mcsValues.isEmpty() ? 0.0 : mcsValues.stream().mapToInt(Integer::intValue).average().orElse(0.0);
                String modulation = avgMcs < 10 ? "QPSK" : avgMcs < 17 ? "16QAM" : "64QAM";
                
                return Flux.just(KpiAggregate.builder().sessionId(sessionId).metric("MODULATION_SCHEME")
                    .avgValue(avgMcs).rat("LTE").windowStart(LocalDateTime.now()).windowEnd(LocalDateTime.now()).build());
            }).flatMap(kpiRepository::save);
    }

    private double calculateLoss(List<Integer> seqNums) {
        if (seqNums.size() < 2) return 0.0;
        Collections.sort(seqNums);
        int expected = seqNums.get(seqNums.size() - 1) - seqNums.get(0) + 1;
        int received = seqNums.size();
        int lost = expected - received;
        return lost > 0 ? (lost * 100.0 / expected) : 0.0;
    }
}
