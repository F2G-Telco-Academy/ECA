package com.nathan.p2.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcedureAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeProcedures(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            result.put("attach", analyzeAttachProcedure(pcapPath));
            result.put("tau", analyzeTauProcedure(pcapPath));
            result.put("serviceRequest", analyzeServiceRequest(pcapPath));
            result.put("bearerSetup", analyzeBearerSetup(pcapPath));
            result.put("detach", analyzeDetachProcedure(pcapPath));
            
            return result;
        });
    }
    
    private Map<String, Object> analyzeAttachProcedure(String pcapPath) {
        Map<String, Object> attach = new HashMap<>();
        
        int attachRequests = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x41");
        int attachAccepts = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x42");
        int attachRejects = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x44");
        int attachCompletes = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x43");
        
        attach.put("requests", attachRequests);
        attach.put("accepts", attachAccepts);
        attach.put("rejects", attachRejects);
        attach.put("completes", attachCompletes);
        attach.put("successRate", attachRequests > 0 ? (attachCompletes * 100.0 / attachRequests) : 0);
        
        return attach;
    }
    
    private Map<String, Object> analyzeTauProcedure(String pcapPath) {
        Map<String, Object> tau = new HashMap<>();
        
        int tauRequests = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x4a");
        int tauAccepts = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x4b");
        int tauRejects = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x4c");
        
        tau.put("requests", tauRequests);
        tau.put("accepts", tauAccepts);
        tau.put("rejects", tauRejects);
        tau.put("successRate", tauRequests > 0 ? (tauAccepts * 100.0 / tauRequests) : 0);
        
        return tau;
    }
    
    private Map<String, Object> analyzeServiceRequest(String pcapPath) {
        Map<String, Object> sr = new HashMap<>();
        
        int srRequests = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x4e");
        int srAccepts = countEvents(pcapPath, "lte-rrc.rrcConnectionSetup_element");
        
        sr.put("requests", srRequests);
        sr.put("accepts", srAccepts);
        sr.put("successRate", srRequests > 0 ? (srAccepts * 100.0 / srRequests) : 0);
        
        return sr;
    }
    
    private Map<String, Object> analyzeBearerSetup(String pcapPath) {
        Map<String, Object> bearer = new HashMap<>();
        
        int setupRequests = countEvents(pcapPath, "nas_eps.nas_msg_esm_type == 0xc1");
        int setupAccepts = countEvents(pcapPath, "nas_eps.nas_msg_esm_type == 0xc2");
        int setupRejects = countEvents(pcapPath, "nas_eps.nas_msg_esm_type == 0xc3");
        
        bearer.put("requests", setupRequests);
        bearer.put("accepts", setupAccepts);
        bearer.put("rejects", setupRejects);
        bearer.put("successRate", setupRequests > 0 ? (setupAccepts * 100.0 / setupRequests) : 0);
        
        return bearer;
    }
    
    private Map<String, Object> analyzeDetachProcedure(String pcapPath) {
        Map<String, Object> detach = new HashMap<>();
        
        int detachRequests = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x45");
        int detachAccepts = countEvents(pcapPath, "nas_eps.nas_msg_emm_type == 0x46");
        
        detach.put("requests", detachRequests);
        detach.put("accepts", detachAccepts);
        
        return detach;
    }
    
    private int countEvents(String pcapPath, String filter) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "tshark", "-r", pcapPath,
                "-Y", filter,
                "-T", "fields",
                "-e", "frame.number"
            );
            
            Process process = pb.start();
            int count = 0;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                while (reader.readLine() != null) {
                    count++;
                }
            }
            process.waitFor();
            return count;
        } catch (Exception e) {
            log.error("Failed to count events", e);
            return 0;
        }
    }
}
