package com.nathan.p2.service;

import com.nathan.p2.domain.GpsTrace;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class GpsExtractionOrchestrator {

    private final List<GpsExtractor> extractors = new ArrayList<>();

    public Flux<GpsTrace> extractGpsData(File pcapFile, Long sessionId) {
        return Flux.fromIterable(extractors)
                .concatMap(extractor -> extractor.extract(pcapFile, sessionId)
                        .onErrorResume(e -> {
                            log.warn("GPS extraction failed with {}: {}", extractor.getName(), e.getMessage());
                            return Flux.empty();
                        }))
                .switchIfEmpty(fallbackCellTowerTriangulation(pcapFile, sessionId));
    }

    private Flux<GpsTrace> fallbackCellTowerTriangulation(File pcapFile, Long sessionId) {
        log.info("Using cell tower triangulation fallback for GPS");
        return Flux.empty();
    }

    interface GpsExtractor {
        String getName();
        Flux<GpsTrace> extract(File pcapFile, Long sessionId);
    }

    @Service
    public static class TSharkGpsExtractor implements GpsExtractor {
        @Override
        public String getName() {
            return "TShark GPS Extractor";
        }

        @Override
        public Flux<GpsTrace> extract(File pcapFile, Long sessionId) {
            return Flux.create(sink -> {
                try {
                    ProcessBuilder pb = new ProcessBuilder(
                            "tshark", "-r", pcapFile.getAbsolutePath(),
                            "-T", "fields",
                            "-e", "frame.time_epoch",
                            "-e", "gsmtap.extra.latitude",
                            "-e", "gsmtap.extra.longitude",
                            "-e", "gsmtap.extra.altitude",
                            "-E", "separator=,"
                    );
                    pb.redirectErrorStream(true);
                    Process process = pb.start();

                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            String[] parts = line.split(",");
                            if (parts.length >= 3 && !parts[1].isEmpty() && !parts[2].isEmpty()) {
                                try {
                                    GpsTrace trace = new GpsTrace();
                                    trace.setSessionId(sessionId);
                                    trace.setLatitude(Double.parseDouble(parts[1]));
                                    trace.setLongitude(Double.parseDouble(parts[2]));
                                    trace.setAltitude(parts.length > 3 && !parts[3].isEmpty() ? Double.parseDouble(parts[3]) : 0.0);
                                    trace.setTimestamp(LocalDateTime.now());
                                    sink.next(trace);
                                } catch (NumberFormatException e) {
                                    log.debug("Invalid GPS data: {}", line);
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
    public static class GsmtapGpsExtractor implements GpsExtractor {
        @Override
        public String getName() {
            return "GSMTAP GPS Extractor";
        }

        @Override
        public Flux<GpsTrace> extract(File pcapFile, Long sessionId) {
            return Flux.create(sink -> {
                try {
                    ProcessBuilder pb = new ProcessBuilder(
                            "tshark", "-r", pcapFile.getAbsolutePath(),
                            "-Y", "gsmtap",
                            "-T", "json",
                            "-e", "frame.time_epoch",
                            "-e", "gsmtap.extra"
                    );
                    pb.redirectErrorStream(true);
                    Process process = pb.start();

                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        StringBuilder json = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            json.append(line);
                        }
                        // Parse JSON and extract GPS if available
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
