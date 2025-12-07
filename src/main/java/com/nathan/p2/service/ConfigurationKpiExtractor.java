package com.nathan.p2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Extracts configuration KPIs from PCAP files.
 * Tracks QoS parameter changes and RRC reconfiguration events.
 */
@Slf4j
@Component
public class ConfigurationKpiExtractor {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Extract configuration KPIs from PCAP file.
     * 
     * @param pcapPath Path to PCAP file
     * @return JSON object with configuration KPIs
     */
    public ObjectNode extractConfigurationKpis(Path pcapPath) {
        ObjectNode kpis = objectMapper.createObjectNode();
        
        try {
            // QoS Configuration Tracking
            ObjectNode qosConfig = extractQosConfiguration(pcapPath);
            kpis.set("QOS_CONFIG", qosConfig);
            
            // RRC Configuration Tracking
            ObjectNode rrcConfig = extractRrcConfiguration(pcapPath);
            kpis.set("RRC_CONFIG", rrcConfig);
            
            log.info("Configuration KPIs extracted: QOS changes={}, RRC reconfigs={}", 
                    qosConfig.get("change_count").asInt(), 
                    rrcConfig.get("reconfig_count").asInt());
            
        } catch (Exception e) {
            log.error("Failed to extract configuration KPIs: {}", e.getMessage());
        }
        
        return kpis;
    }

    /**
     * Extract QoS configuration changes.
     * Tracks: QCI, ARP, GBR, MBR changes per bearer.
     */
    private ObjectNode extractQosConfiguration(Path pcapPath) {
        ObjectNode qos = objectMapper.createObjectNode();
        List<String> changes = new ArrayList<>();
        
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath.toString(),
                "-Y", "nas-eps.esm.qci or nas-eps.esm.arp or nas-eps.esm.dl_guar_br or nas-eps.esm.ul_guar_br",
                "-T", "fields",
                "-e", "frame.time_epoch",
                "-e", "nas-eps.esm.qci",
                "-e", "nas-eps.esm.arp",
                "-e", "nas-eps.esm.dl_guar_br",
                "-e", "nas-eps.esm.ul_guar_br",
                "-E", "separator=|"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    changes.add(line);
                }
            }
            
            process.waitFor();
            
        } catch (Exception e) {
            log.error("QoS extraction failed: {}", e.getMessage());
        }
        
        qos.put("change_count", changes.size());
        qos.putPOJO("changes", changes);
        return qos;
    }

    /**
     * Extract RRC reconfiguration events.
     * Tracks: RRCConnectionReconfiguration messages with configuration changes.
     */
    private ObjectNode extractRrcConfiguration(Path pcapPath) {
        ObjectNode rrc = objectMapper.createObjectNode();
        List<String> reconfigs = new ArrayList<>();
        
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath.toString(),
                "-Y", "lte-rrc.rrcConnectionReconfiguration_element",
                "-T", "fields",
                "-e", "frame.time_epoch",
                "-e", "lte-rrc.measConfig_element",
                "-e", "lte-rrc.radioResourceConfigDedicated_element",
                "-e", "lte-rrc.drb_ToAddModList",
                "-E", "separator=|"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    reconfigs.add(line);
                }
            }
            
            process.waitFor();
            
        } catch (Exception e) {
            log.error("RRC configuration extraction failed: {}", e.getMessage());
        }
        
        rrc.put("reconfig_count", reconfigs.size());
        rrc.putPOJO("reconfigurations", reconfigs);
        return rrc;
    }
}
