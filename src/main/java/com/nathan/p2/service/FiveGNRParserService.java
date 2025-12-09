package com.nathan.p2.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FiveGNRParserService {

    public Mono<Map<String, Object>> parseMIB(Path pcapFile) {
        return Mono.fromCallable(() -> {
            Map<String, Object> mib = new HashMap<>();
            
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapFile.toString(),
                "-Y", "nr-rrc.bcch.bch",
                "-T", "fields",
                "-e", "nr-rrc.systemFrameNumber",
                "-e", "nr-rrc.subCarrierSpacingCommon",
                "-e", "nr-rrc.ssb-SubcarrierOffset",
                "-e", "nr-rrc.dmrs-TypeA-Position",
                "-e", "nr-rrc.pdcch-ConfigSIB1",
                "-e", "nr-rrc.cellBarred",
                "-e", "nr-rrc.intraFreqReselection"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line = reader.readLine();
            if (line != null) {
                String[] fields = line.split("\t");
                if (fields.length >= 7) {
                    mib.put("systemFrameNumber", fields[0]);
                    mib.put("subCarrierSpacingCommon", fields[1]);
                    mib.put("ssbSubcarrierOffset", fields[2]);
                    mib.put("dmrsTypeAPosition", fields[3]);
                    mib.put("pdcchConfigSIB1", fields[4]);
                    mib.put("cellBarred", fields[5]);
                    mib.put("intraFreqReselection", fields[6]);
                }
            }
            
            process.waitFor();
            return mib;
        });
    }

    public Mono<Map<String, Object>> parseSIB1(Path pcapFile) {
        return Mono.fromCallable(() -> {
            Map<String, Object> sib1 = new HashMap<>();
            
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapFile.toString(),
                "-Y", "nr-rrc.bcch.dl.sch && nr-rrc.sib1",
                "-T", "fields",
                "-e", "nr-rrc.frequencyBandList",
                "-e", "nr-rrc.scs-SpecificCarrierList",
                "-e", "nr-rrc.carrierBandwidth",
                "-e", "nr-rrc.p-Max",
                "-e", "nr-rrc.physCellId",
                "-e", "nr-rrc.absoluteFrequencySSB",
                "-e", "nr-rrc.trackingAreaCode",
                "-e", "nr-rrc.cellIdentity",
                "-e", "nr-rrc.mcc",
                "-e", "nr-rrc.mnc"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            String line = reader.readLine();
            if (line != null) {
                String[] fields = line.split("\t");
                if (fields.length >= 10) {
                    sib1.put("frequencyBand", fields[0]);
                    sib1.put("scs", fields[1]);
                    sib1.put("bandwidth", fields[2]);
                    sib1.put("pMax", fields[3]);
                    sib1.put("physCellId", fields[4]);
                    sib1.put("absoluteFrequencySSB", fields[5]);
                    sib1.put("trackingAreaCode", fields[6]);
                    sib1.put("cellIdentity", fields[7]);
                    sib1.put("mcc", fields[8]);
                    sib1.put("mnc", fields[9]);
                }
            }
            
            process.waitFor();
            return sib1;
        });
    }

    public Mono<Map<String, Object>> parseUECapability(Path pcapFile) {
        return Mono.fromCallable(() -> {
            Map<String, Object> capability = new HashMap<>();
            
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapFile.toString(),
                "-Y", "nr-rrc.ue-CapabilityRAT-ContainerList",
                "-T", "json"
            );
            
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            
            StringBuilder json = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                json.append(line);
            }
            
            capability.put("raw", json.toString());
            process.waitFor();
            return capability;
        });
    }
}
