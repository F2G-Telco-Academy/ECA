package com.nathan.p2.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class QualcommDMParserService {

    public Flux<Map<String, Object>> parseDMMessages(Path qmdlFile) {
        return Flux.create(sink -> {
            try {
                ProcessBuilder pb = new ProcessBuilder(
                    "python3", "scat/scat.py",
                    "-t", "qc",
                    "-d", qmdlFile.toString(),
                    "--stdout"
                );
                
                Process process = pb.start();
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("NR5G") || line.contains("MAC") || line.contains("RLC") || line.contains("PDCP")) {
                        Map<String, Object> message = new HashMap<>();
                        message.put("timestamp", System.currentTimeMillis());
                        message.put("type", extractType(line));
                        message.put("message", line);
                        message.put("hex", extractHex(line));
                        sink.next(message);
                    }
                }
                
                process.waitFor();
                sink.complete();
            } catch (Exception e) {
                log.error("Failed to parse Qualcomm DM messages", e);
                sink.error(e);
            }
        });
    }

    private String extractType(String line) {
        if (line.contains("NR5G MAC")) return "NR5G_MAC";
        if (line.contains("NR5G RLC")) return "NR5G_RLC";
        if (line.contains("NR5G PDCP")) return "NR5G_PDCP";
        if (line.contains("LTE MAC")) return "LTE_MAC";
        if (line.contains("LTE RLC")) return "LTE_RLC";
        return "UNKNOWN";
    }

    private String extractHex(String line) {
        // Extract hex dump if present
        int hexStart = line.indexOf("0x");
        if (hexStart != -1) {
            return line.substring(hexStart);
        }
        return "";
    }
}
