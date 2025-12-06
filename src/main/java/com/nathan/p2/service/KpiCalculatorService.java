package com.nathan.p2.service;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * KPI Calculator Service - Based on actual patterns from:
 * - scat/scripts/kpi_calculator_comprehensive.py (TShark filters)
 * - mobileinsight-core-master/mobile_insight/analyzer/kpi/ (KPI logic)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KpiCalculatorService {
    private final TSharkIntegrationService tshark;
    private final KpiAggregateRepository kpiRepo;

    public Mono<Void> calculate(Long sessionId, Path pcap) {
        log.info("Calculating KPIs for session {} from {}", sessionId, pcap);
        
        return Flux.merge(
            calculateLteRrcSr(sessionId, pcap),
            calculateLteAttachSr(sessionId, pcap),
            calculateLteTauSr(sessionId, pcap),
            calculateLteHoSr(sessionId, pcap),
            calculateWcdmaRrcSr(sessionId, pcap),
            calculateCallSr(sessionId, pcap)
        )
        .flatMap(kpiRepo::save)
        .then()
        .doOnSuccess(v -> log.info("KPI calculation completed for session {}", sessionId))
        .doOnError(e -> log.error("KPI calculation failed for session {}", sessionId, e));
    }

    /**
     * LTE RRC Success Rate
     * Based on: mobileinsight RrcSrAnalyzer and SCAT KPI calculator
     * Filters from kpi_calculator_comprehensive.py
     */
    private Mono<KpiAggregate> calculateLteRrcSr(Long sessionId, Path pcap) {
        return Mono.zip(
            tshark.countPackets(pcap, "lte-rrc.rrcConnectionRequest_element"),
            tshark.countPackets(pcap, "lte-rrc.rrcConnectionSetup_element")
        ).map(tuple -> {
            int req = tuple.getT1();
            int setup = tuple.getT2();
            double sr = req > 0 ? (setup * 100.0 / req) : 0.0;
            
            return createKpi(sessionId, "LTE_RRC_SR", sr, "LTE");
        });
    }

    /**
     * LTE Attach Success Rate
     * Based on: mobileinsight AttachSrAnalyzer
     * NAS message types from TS 24.301
     */
    private Mono<KpiAggregate> calculateLteAttachSr(Long sessionId, Path pcap) {
        return Mono.zip(
            tshark.countPackets(pcap, "nas_eps.nas_msg_emm_type == 0x41"), // Attach Request
            tshark.countPackets(pcap, "nas_eps.nas_msg_emm_type == 0x42")  // Attach Accept
        ).map(tuple -> {
            int req = tuple.getT1();
            int acc = tuple.getT2();
            double sr = req > 0 ? (acc * 100.0 / req) : 0.0;
            
            return createKpi(sessionId, "LTE_ATTACH_SR", sr, "LTE");
        });
    }

    /**
     * LTE TAU (Tracking Area Update) Success Rate
     */
    private Mono<KpiAggregate> calculateLteTauSr(Long sessionId, Path pcap) {
        return Mono.zip(
            tshark.countPackets(pcap, "nas_eps.nas_msg_emm_type == 0x48"), // TAU Request
            tshark.countPackets(pcap, "nas_eps.nas_msg_emm_type == 0x49")  // TAU Accept
        ).map(tuple -> {
            int req = tuple.getT1();
            int acc = tuple.getT2();
            double sr = req > 0 ? (acc * 100.0 / req) : 0.0;
            
            return createKpi(sessionId, "LTE_TAU_SR", sr, "LTE");
        });
    }

    /**
     * LTE Handover Success Rate
     */
    private Mono<KpiAggregate> calculateLteHoSr(Long sessionId, Path pcap) {
        return Mono.zip(
            tshark.countPackets(pcap, "lte-rrc.mobilityFromEUTRACommand_element"),
            tshark.countPackets(pcap, "lte-rrc.rrcConnectionReconfigurationComplete_element")
        ).map(tuple -> {
            int cmd = tuple.getT1();
            int complete = tuple.getT2();
            double sr = cmd > 0 ? (complete * 100.0 / cmd) : 0.0;
            
            return createKpi(sessionId, "LTE_HO_SR", sr, "LTE");
        });
    }

    /**
     * WCDMA RRC Success Rate
     */
    private Mono<KpiAggregate> calculateWcdmaRrcSr(Long sessionId, Path pcap) {
        return Mono.zip(
            tshark.countPackets(pcap, "rrc.rrcConnectionRequest_element"),
            tshark.countPackets(pcap, "rrc.rrcConnectionSetup_element")
        ).map(tuple -> {
            int req = tuple.getT1();
            int setup = tuple.getT2();
            double sr = req > 0 ? (setup * 100.0 / req) : 0.0;
            
            return createKpi(sessionId, "WCDMA_RRC_SR", sr, "WCDMA");
        });
    }

    /**
     * Call Success Rate (CS domain)
     */
    private Mono<KpiAggregate> calculateCallSr(Long sessionId, Path pcap) {
        return Mono.zip(
            tshark.countPackets(pcap, "gsm_a.dtap.msg_cc_type == 0x05"), // Call Setup
            tshark.countPackets(pcap, "gsm_a.dtap.msg_cc_type == 0x0f")  // Call Connect
        ).map(tuple -> {
            int setup = tuple.getT1();
            int connect = tuple.getT2();
            double sr = setup > 0 ? (connect * 100.0 / setup) : 0.0;
            
            return createKpi(sessionId, "CALL_SUCCESS_RATE", sr, "CS");
        });
    }

    private KpiAggregate createKpi(Long sessionId, String metric, Double value, String rat) {
        LocalDateTime now = LocalDateTime.now();
        return KpiAggregate.builder()
            .sessionId(sessionId)
            .metric(metric)
            .windowStart(now.minusMinutes(5))
            .windowEnd(now)
            .avgValue(value)
            .minValue(value)
            .maxValue(value)
            .rat(rat)
            .build();
    }
}
