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
public class SmsAnalyzerService {
    
    public Mono<Map<String, Object>> analyzeSms(String pcapPath) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            
            int moSms = countEvents(pcapPath, "gsm_sms && gsm_sms.tp_mti == 0x01");
            int mtSms = countEvents(pcapPath, "gsm_sms && gsm_sms.tp_mti == 0x00");
            int smsAck = countEvents(pcapPath, "gsm_sms && gsm_sms.tp_mti == 0x02");
            int smsDeliveryReport = countEvents(pcapPath, "gsm_sms && gsm_sms.tp_mti == 0x03");
            
            result.put("moSms", moSms);
            result.put("mtSms", mtSms);
            result.put("smsAck", smsAck);
            result.put("deliveryReports", smsDeliveryReport);
            result.put("totalSms", moSms + mtSms);
            result.put("successRate", (moSms + mtSms) > 0 ? (smsAck * 100.0 / (moSms + mtSms)) : 0);
            
            return result;
        });
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
