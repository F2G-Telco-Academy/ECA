package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.util.PlatformUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Enhanced KPI Extraction Service
 * Extracts 40+ KPIs using TShark filters directly (no Python dependencies)
 * Based on patterns from MobileInsight and comprehensive KPI calculator
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnhancedKpiExtractionService {
    private final ToolsConfig config;

    public record KpiResult(
        Map<String, Double> successRates,
        Map<String, Integer> counters,
        Map<String, List<EventDetail>> events,
        Map<String, Double> measurements
    ) {}

    public record EventDetail(int frameNumber, double timestamp) {}

    /**
     * Extract all KPIs from PCAP file
     */
    public Mono<KpiResult> extractAllKpis(Path pcapFile) {
        return Mono.fromCallable(() -> {
            Map<String, Integer> counters = new HashMap<>();
            Map<String, List<EventDetail>> events = new HashMap<>();
            Map<String, Double> measurements = new HashMap<>();
            
            // LTE RRC Connection
            counters.put("lte_rrc_req", countPackets(pcapFile, "lte-rrc.rrcConnectionRequest_element"));
            counters.put("lte_rrc_setup", countPackets(pcapFile, "lte-rrc.rrcConnectionSetup_element"));
            events.put("lte_rrc_req", getPacketDetails(pcapFile, "lte-rrc.rrcConnectionRequest_element"));
            events.put("lte_rrc_setup", getPacketDetails(pcapFile, "lte-rrc.rrcConnectionSetup_element"));
            
            // LTE Attach
            counters.put("lte_attach_req", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x41"));
            counters.put("lte_attach_acc", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x42"));
            counters.put("lte_attach_rej", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x44"));
            events.put("lte_attach_req", getPacketDetails(pcapFile, "nas-eps.nas_msg_emm_type == 0x41"));
            events.put("lte_attach_acc", getPacketDetails(pcapFile, "nas-eps.nas_msg_emm_type == 0x42"));
            
            // LTE TAU
            counters.put("lte_tau_req", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x48"));
            counters.put("lte_tau_acc", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x49"));
            counters.put("lte_tau_rej", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x4b"));
            
            // LTE E-RAB Setup
            counters.put("lte_erab_setup", countPackets(pcapFile, "lte-rrc.rrcConnectionReconfiguration_element"));
            counters.put("lte_erab_complete", countPackets(pcapFile, "lte-rrc.rrcConnectionReconfigurationComplete_element"));
            
            // LTE PDN Connectivity
            counters.put("lte_pdn_req", countPackets(pcapFile, "nas-eps.nas_msg_esm_type == 0xd0"));
            counters.put("lte_pdn_acc", countPackets(pcapFile, "nas-eps.nas_msg_esm_type == 0xd1"));
            counters.put("lte_pdn_rej", countPackets(pcapFile, "nas-eps.nas_msg_esm_type == 0xd2"));
            
            // LTE Service Request
            counters.put("lte_service_req", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x4c"));
            counters.put("lte_service_acc", countPackets(pcapFile, "nas-eps.nas_msg_emm_type == 0x4e"));
            
            // LTE Handover
            counters.put("lte_ho_cmd", countPackets(pcapFile, "lte-rrc.mobilityFromEUTRACommand_element"));
            counters.put("lte_ho_complete", countPackets(pcapFile, "lte-rrc.rrcConnectionReconfigurationComplete_element"));
            
            // LTE Measurement Reports
            counters.put("lte_meas_report", countPackets(pcapFile, "lte-rrc.measurementReport_element"));
            
            // LTE Security Mode
            counters.put("lte_sec_cmd", countPackets(pcapFile, "lte-rrc.securityModeCommand_element"));
            counters.put("lte_sec_complete", countPackets(pcapFile, "lte-rrc.securityModeComplete_element"));
            
            // WCDMA RRC
            counters.put("wcdma_rrc_req", countPackets(pcapFile, "rrc.rrcConnectionRequest_element"));
            counters.put("wcdma_rrc_setup", countPackets(pcapFile, "rrc.rrcConnectionSetup_element"));
            
            // WCDMA RAB
            counters.put("wcdma_rab_assign", countPackets(pcapFile, "rrc.radioBearerSetup"));
            counters.put("wcdma_rab_complete", countPackets(pcapFile, "rrc.radioBearerSetupComplete_element"));
            
            // WCDMA Handover
            counters.put("wcdma_ho_cmd", countPackets(pcapFile, "rrc.physicalChannelReconfiguration"));
            counters.put("wcdma_ho_complete", countPackets(pcapFile, "rrc.physicalChannelReconfigurationComplete_element"));
            
            // WCDMA Active Set Update
            counters.put("wcdma_asu_cmd", countPackets(pcapFile, "rrc.activeSetUpdate_element"));
            counters.put("wcdma_asu_complete", countPackets(pcapFile, "rrc.activeSetUpdateComplete_element"));
            
            // WCDMA Cell Update
            counters.put("wcdma_cell_update", countPackets(pcapFile, "rrc.cellUpdate_element"));
            counters.put("wcdma_cell_update_confirm", countPackets(pcapFile, "rrc.cellUpdateConfirm_element"));
            
            // 3G PDP Context
            counters.put("pdp_req", countPackets(pcapFile, "gsm_a.gm.sm.msg_type == 0x41"));
            counters.put("pdp_acc", countPackets(pcapFile, "gsm_a.gm.sm.msg_type == 0x42"));
            
            // 3G Routing Area Update
            counters.put("wcdma_rau_req", countPackets(pcapFile, "gsm_a.gm.gmm.msg_type == 0x08"));
            counters.put("wcdma_rau_acc", countPackets(pcapFile, "gsm_a.gm.gmm.msg_type == 0x09"));
            
            // Call Control
            counters.put("call_setup", countPackets(pcapFile, "gsm_a.dtap.msg_cc_type == 0x05"));
            counters.put("call_connect", countPackets(pcapFile, "gsm_a.dtap.msg_cc_type == 0x0f"));
            counters.put("call_disconnect", countPackets(pcapFile, "gsm_a.dtap.msg_cc_type == 0x25"));
            
            // GSM RACH
            counters.put("rach_attempts", countPackets(pcapFile, "gsm_a.rach"));
            
            // Extract RSRP/RSRQ measurements
            measurements.putAll(extractMeasurements(pcapFile));
            
            // Calculate success rates
            Map<String, Double> successRates = calculateSuccessRates(counters);
            
            return new KpiResult(successRates, counters, events, measurements);
        });
    }

    /**
     * Count packets matching TShark filter
     */
    private int countPackets(Path pcapFile, String filter) {
        try {
            String tsharkPath = PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath());
            ProcessBuilder pb = new ProcessBuilder(
                tsharkPath, "-r", pcapFile.toString(),
                "-d", "udp.port==4729,gsmtap",
                "-Y", filter,
                "-T", "fields", "-e", "frame.number"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            int count = 0;
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty() && !line.startsWith("Cannot")) {
                    count++;
                }
            }
            
            process.waitFor(30, TimeUnit.SECONDS);
            return count;
        } catch (Exception e) {
            log.error("Error counting packets with filter: {}", filter, e);
            return 0;
        }
    }

    /**
     * Get packet details with timestamps
     */
    private List<EventDetail> getPacketDetails(Path pcapFile, String filter) {
        List<EventDetail> details = new ArrayList<>();
        try {
            String tsharkPath = PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath());
            ProcessBuilder pb = new ProcessBuilder(
                tsharkPath, "-r", pcapFile.toString(),
                "-d", "udp.port==4729,gsmtap",
                "-Y", filter,
                "-T", "fields",
                "-e", "frame.number",
                "-e", "frame.time_epoch",
                "-E", "separator=|"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty() && !line.startsWith("Cannot")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 2) {
                        details.add(new EventDetail(
                            Integer.parseInt(parts[0]),
                            Double.parseDouble(parts[1])
                        ));
                    }
                }
            }
            
            process.waitFor(30, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Error getting packet details", e);
        }
        return details;
    }

    /**
     * Extract RSRP/RSRQ/SINR measurements with CORRECT field names
     */
    private Map<String, Double> extractMeasurements(Path pcapFile) {
        Map<String, Double> measurements = new HashMap<>();
        List<Double> rsrpValues = new ArrayList<>();
        List<Double> rsrqValues = new ArrayList<>();
        List<Double> sinrValues = new ArrayList<>();
        
        try {
            String tsharkPath = PlatformUtils.resolveTSharkPath(config.getTools().getTshark().getPath());
            ProcessBuilder pb = new ProcessBuilder(
                tsharkPath, "-r", pcapFile.toString(),
                "-d", "udp.port==4729,gsmtap",
                "-Y", "lte-rrc.measResultPCell_element || lte-rrc.measResultSCell_r12_element",
                "-T", "fields",
                "-e", "lte-rrc.rsrpResult_r12",
                "-e", "lte-rrc.rsrqResult_r12",
                "-e", "lte-rrc.rs_sinr_Result_r13",
                "-e", "lte-rrc.physCellId_r12"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    String[] parts = line.split("\\t");
                    if (parts.length >= 1 && !parts[0].isEmpty()) {
                        double rsrp = -180 + Double.parseDouble(parts[0]) * 0.0625;
                        rsrpValues.add(rsrp);
                    }
                    if (parts.length >= 2 && !parts[1].isEmpty()) {
                        double rsrq = -30 + Double.parseDouble(parts[1]) * 0.0625;
                        rsrqValues.add(rsrq);
                    }
                }
            }
            
            process.waitFor(30, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Error extracting measurements", e);
        }
        
        if (!rsrpValues.isEmpty()) {
            measurements.put("rsrp_avg", rsrpValues.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
            measurements.put("rsrp_min", rsrpValues.stream().mapToDouble(Double::doubleValue).min().orElse(0.0));
            measurements.put("rsrp_max", rsrpValues.stream().mapToDouble(Double::doubleValue).max().orElse(0.0));
        }
        
        if (!rsrqValues.isEmpty()) {
            measurements.put("rsrq_avg", rsrqValues.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
            measurements.put("rsrq_min", rsrqValues.stream().mapToDouble(Double::doubleValue).min().orElse(0.0));
            measurements.put("rsrq_max", rsrqValues.stream().mapToDouble(Double::doubleValue).max().orElse(0.0));
        }
        
        return measurements;
    }

    /**
     * Calculate success rates from counters
     */
    private Map<String, Double> calculateSuccessRates(Map<String, Integer> counters) {
        Map<String, Double> rates = new HashMap<>();
        
        // LTE RRC Success Rate
        int rrcReq = counters.getOrDefault("lte_rrc_req", 0);
        int rrcSetup = counters.getOrDefault("lte_rrc_setup", 0);
        rates.put("lte_rrc_sr", rrcReq > 0 ? (rrcSetup * 100.0 / rrcReq) : 0.0);
        
        // LTE Attach Success Rate
        int attachReq = counters.getOrDefault("lte_attach_req", 0);
        int attachAcc = counters.getOrDefault("lte_attach_acc", 0);
        rates.put("lte_attach_sr", attachReq > 0 ? (attachAcc * 100.0 / attachReq) : 0.0);
        
        // LTE TAU Success Rate
        int tauReq = counters.getOrDefault("lte_tau_req", 0);
        int tauAcc = counters.getOrDefault("lte_tau_acc", 0);
        rates.put("lte_tau_sr", tauReq > 0 ? (tauAcc * 100.0 / tauReq) : 0.0);
        
        // LTE PDN Success Rate
        int pdnReq = counters.getOrDefault("lte_pdn_req", 0);
        int pdnAcc = counters.getOrDefault("lte_pdn_acc", 0);
        rates.put("lte_pdn_sr", pdnReq > 0 ? (pdnAcc * 100.0 / pdnReq) : 0.0);
        
        // LTE Service Request Success Rate
        int serviceReq = counters.getOrDefault("lte_service_req", 0);
        int serviceAcc = counters.getOrDefault("lte_service_acc", 0);
        rates.put("lte_service_sr", serviceReq > 0 ? (serviceAcc * 100.0 / serviceReq) : 0.0);
        
        // LTE Handover Success Rate
        int hoCmd = counters.getOrDefault("lte_ho_cmd", 0);
        int hoComplete = counters.getOrDefault("lte_ho_complete", 0);
        rates.put("lte_ho_sr", hoCmd > 0 ? (hoComplete * 100.0 / hoCmd) : 0.0);
        
        // LTE Security Mode Success Rate
        int secCmd = counters.getOrDefault("lte_sec_cmd", 0);
        int secComplete = counters.getOrDefault("lte_sec_complete", 0);
        rates.put("lte_sec_sr", secCmd > 0 ? (secComplete * 100.0 / secCmd) : 0.0);
        
        // WCDMA RRC Success Rate
        int wcdmaRrcReq = counters.getOrDefault("wcdma_rrc_req", 0);
        int wcdmaRrcSetup = counters.getOrDefault("wcdma_rrc_setup", 0);
        rates.put("wcdma_rrc_sr", wcdmaRrcReq > 0 ? (wcdmaRrcSetup * 100.0 / wcdmaRrcReq) : 0.0);
        
        // WCDMA RAB Success Rate
        int rabAssign = counters.getOrDefault("wcdma_rab_assign", 0);
        int rabComplete = counters.getOrDefault("wcdma_rab_complete", 0);
        rates.put("wcdma_rab_sr", rabAssign > 0 ? (rabComplete * 100.0 / rabAssign) : 0.0);
        
        // WCDMA Handover Success Rate
        int wcdmaHoCmd = counters.getOrDefault("wcdma_ho_cmd", 0);
        int wcdmaHoComplete = counters.getOrDefault("wcdma_ho_complete", 0);
        rates.put("wcdma_ho_sr", wcdmaHoCmd > 0 ? (wcdmaHoComplete * 100.0 / wcdmaHoCmd) : 0.0);
        
        // 3G PDP Context Success Rate
        int pdpReq3g = counters.getOrDefault("pdp_req", 0);
        int pdpAcc3g = counters.getOrDefault("pdp_acc", 0);
        rates.put("pdp_sr", pdpReq3g > 0 ? (pdpAcc3g * 100.0 / pdpReq3g) : 0.0);
        
        // 3G RAU Success Rate
        int rauReq = counters.getOrDefault("wcdma_rau_req", 0);
        int rauAcc = counters.getOrDefault("wcdma_rau_acc", 0);
        rates.put("wcdma_rau_sr", rauReq > 0 ? (rauAcc * 100.0 / rauReq) : 0.0);
        
        // Call Setup Success Rate
        int callSetup = counters.getOrDefault("call_setup", 0);
        int callConnect = counters.getOrDefault("call_connect", 0);
        rates.put("call_setup_sr", callSetup > 0 ? (callConnect * 100.0 / callSetup) : 0.0);
        
        return rates;
    }
}
