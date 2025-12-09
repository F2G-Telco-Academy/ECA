package com.nathan.p2.service;

import com.nathan.p2.domain.KpiAggregate;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class MultiStrategyKpiExtractor {

    private final List<KpiExtractionStrategy> strategies = new ArrayList<>();

    public Flux<KpiAggregate> extractKpis(File pcapFile, Long sessionId) {
        return Flux.fromIterable(strategies)
                .concatMap(strategy -> strategy.extract(pcapFile, sessionId)
                        .collectList()
                        .flatMapMany(kpis -> {
                            if (!kpis.isEmpty()) {
                                log.info("Strategy {} extracted {} KPIs", strategy.getName(), kpis.size());
                                return Flux.fromIterable(kpis);
                            }
                            return Flux.empty();
                        })
                        .onErrorResume(e -> {
                            log.warn("Strategy {} failed: {}", strategy.getName(), e.getMessage());
                            return Flux.empty();
                        }))
                .switchIfEmpty(statisticalInference(pcapFile, sessionId));
    }

    private Flux<KpiAggregate> statisticalInference(File pcapFile, Long sessionId) {
        log.info("Using statistical inference for missing KPIs");
        return Flux.empty();
    }

    interface KpiExtractionStrategy {
        String getName();
        Flux<KpiAggregate> extract(File pcapFile, Long sessionId);
    }

    @Service
    public static class TSharkLteExtractor implements KpiExtractionStrategy {
        @Override
        public String getName() {
            return "TShark LTE Extractor";
        }

        @Override
        public Flux<KpiAggregate> extract(File pcapFile, Long sessionId) {
            return Flux.create(sink -> {
                try {
                    ProcessBuilder pb = new ProcessBuilder(
                            "tshark", "-r", pcapFile.getAbsolutePath(),
                            "-Y", "lte-rrc.measResultPCell_element",
                            "-T", "fields",
                            "-e", "frame.time_epoch",
                            "-e", "lte-rrc.rsrpResult",
                            "-e", "lte-rrc.rsrqResult",
                            "-e", "lte-rrc.physCellId",
                            "-e", "lte-rrc.dl_CarrierFreq",
                            "-E", "separator=,"
                    );
                    pb.redirectErrorStream(true);
                    Process process = pb.start();

                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (line.contains("Cannot find dissector")) continue;
                            
                            String[] parts = line.split(",");
                            if (parts.length >= 3) {
                                try {
                                    KpiAggregate kpi = new KpiAggregate();
                                    kpi.setSessionId(sessionId);
                                    kpi.setTimestamp(LocalDateTime.now());
                                    
                                    if (!parts[1].isEmpty()) {
                                        int rsrpIndex = Integer.parseInt(parts[1]);
                                        kpi.setRsrp(-140.0 + rsrpIndex);
                                    }
                                    
                                    if (parts.length > 2 && !parts[2].isEmpty()) {
                                        int rsrqIndex = Integer.parseInt(parts[2]);
                                        kpi.setRsrq(-19.5 + (rsrqIndex * 0.5));
                                    }
                                    
                                    if (parts.length > 3 && !parts[3].isEmpty()) {
                                        kpi.setPci(Integer.parseInt(parts[3]));
                                    }
                                    
                                    sink.next(kpi);
                                } catch (NumberFormatException e) {
                                    log.debug("Invalid KPI data: {}", line);
                                }
                            }
                        }
                    }
                    process.waitFor();
                    sink.complete();
                } catch (Exception e) {
                    sink.error(e);
                }
            });
        }
    }

    @Service
    public static class TSharkNrExtractor implements KpiExtractionStrategy {
        @Override
        public String getName() {
            return "TShark 5G NR Extractor";
        }

        @Override
        public Flux<KpiAggregate> extract(File pcapFile, Long sessionId) {
            return Flux.create(sink -> {
                try {
                    ProcessBuilder pb = new ProcessBuilder(
                            "tshark", "-r", pcapFile.getAbsolutePath(),
                            "-Y", "nr-rrc",
                            "-T", "fields",
                            "-e", "frame.time_epoch",
                            "-e", "nr-rrc.rsrp",
                            "-e", "nr-rrc.rsrq",
                            "-e", "nr-rrc.sinr",
                            "-e", "nr-rrc.physCellId",
                            "-E", "separator=,"
                    );
                    pb.redirectErrorStream(true);
                    Process process = pb.start();

                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (line.contains("Cannot find dissector")) continue;
                            
                            String[] parts = line.split(",");
                            if (parts.length >= 2) {
                                try {
                                    KpiAggregate kpi = new KpiAggregate();
                                    kpi.setSessionId(sessionId);
                                    kpi.setTimestamp(LocalDateTime.now());
                                    
                                    if (!parts[1].isEmpty()) {
                                        kpi.setRsrp(Double.parseDouble(parts[1]));
                                    }
                                    
                                    if (parts.length > 2 && !parts[2].isEmpty()) {
                                        kpi.setRsrq(Double.parseDouble(parts[2]));
                                    }
                                    
                                    if (parts.length > 3 && !parts[3].isEmpty()) {
                                        kpi.setSinr(Double.parseDouble(parts[3]));
                                    }
                                    
                                    sink.next(kpi);
                                } catch (NumberFormatException e) {
                                    log.debug("Invalid NR KPI data: {}", line);
                                }
                            }
                        }
                    }
                    process.waitFor();
                    sink.complete();
                } catch (Exception e) {
                    sink.error(e);
                }
            });
        }
    }

    @Service
    public static class TSharkWcdmaExtractor implements KpiExtractionStrategy {
        @Override
        public String getName() {
            return "TShark WCDMA Extractor";
        }

        @Override
        public Flux<KpiAggregate> extract(File pcapFile, Long sessionId) {
            return Flux.create(sink -> {
                try {
                    ProcessBuilder pb = new ProcessBuilder(
                            "tshark", "-r", pcapFile.getAbsolutePath(),
                            "-Y", "rrc.measurementReport_element",
                            "-T", "fields",
                            "-e", "frame.time_epoch",
                            "-e", "rrc.cpich_RSCP",
                            "-e", "rrc.cpich_Ec_N0",
                            "-e", "rrc.primaryScramblingCode",
                            "-E", "separator=,"
                    );
                    pb.redirectErrorStream(true);
                    Process process = pb.start();

                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (line.contains("Cannot find dissector")) continue;
                            
                            String[] parts = line.split(",");
                            if (parts.length >= 2) {
                                try {
                                    KpiAggregate kpi = new KpiAggregate();
                                    kpi.setSessionId(sessionId);
                                    kpi.setTimestamp(LocalDateTime.now());
                                    
                                    if (!parts[1].isEmpty()) {
                                        kpi.setRscp(Double.parseDouble(parts[1]));
                                    }
                                    
                                    if (parts.length > 2 && !parts[2].isEmpty()) {
                                        kpi.setEcno(Double.parseDouble(parts[2]));
                                    }
                                    
                                    sink.next(kpi);
                                } catch (NumberFormatException e) {
                                    log.debug("Invalid WCDMA KPI data: {}", line);
                                }
                            }
                        }
                    }
                    process.waitFor();
                    sink.complete();
                } catch (Exception e) {
                    sink.error(e);
                }
            });
        }
    }
}
