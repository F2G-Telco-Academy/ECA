package com.nathan.p2.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.domain.GpsTrace;
import com.nathan.p2.repository.GpsTraceRepository;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class GpsTrackingService {
    private final ExternalToolService toolService;
    private final GpsTraceRepository gpsRepo;
    private final ToolsConfig config;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<Long, ProcessHandle> trackers = new ConcurrentHashMap<>();

    public Mono<Void> start(Long sessionId, String deviceId) {
        ProcessSpec spec = ProcessSpec.builder()
            .id("gps-" + sessionId)
            .command("python3")
            .args(List.of(
                Paths.get(config.getTools().getScat().getPath())
                    .getParent().resolve("scripts/adb_gps_tracker.py").toString(),
                deviceId
            ))
            .workingDirectory(Paths.get(config.getTools().getScat().getPath()).getParent())
            .environment(Map.of())
            .build();

        return toolService.start(spec)
            .flatMap(handle -> {
                trackers.put(sessionId, handle);
                return parseGps(sessionId, handle);
            })
            .then();
    }

    public Mono<Void> stop(Long sessionId) {
        ProcessHandle h = trackers.remove(sessionId);
        return h != null ? toolService.stop(h).then() : Mono.empty();
    }

    private Mono<Void> parseGps(Long sessionId, ProcessHandle handle) {
        return toolService.logs(handle)
            .filter(line -> line.startsWith("{"))
            .flatMap(json -> Mono.fromCallable(() -> {
                JsonNode n = mapper.readTree(json);
                return GpsTrace.builder()
                    .sessionId(sessionId)
                    .timestamp(LocalDateTime.now())
                    .latitude(n.path("latitude").asDouble())
                    .longitude(n.path("longitude").asDouble())
                    .altitude(n.path("altitude").asDouble())
                    .speed(n.path("speed").asDouble())
                    .build();
            }))
            .flatMap(gpsRepo::save)
            .then();
    }
}
