package com.nathan.p2.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class PortStatusService {

    public Flux<Map<String, Object>> getPortStatus() {
        return Flux.interval(Duration.ofSeconds(1))
            .map(tick -> {
                Map<String, Object> status = new HashMap<>();
                status.put("scanner1", checkScanner(1));
                status.put("scanner2", checkScanner(2));
                status.put("timestamp", System.currentTimeMillis());
                return status;
            });
    }

    private Map<String, Object> checkScanner(int scannerId) {
        Map<String, Object> scanner = new HashMap<>();
        scanner.put("id", scannerId);
        scanner.put("status", "IDLE"); // IDLE, SCANNING, ERROR
        scanner.put("port", "/dev/ttyUSB" + (scannerId - 1));
        scanner.put("connected", false);
        return scanner;
    }
}
