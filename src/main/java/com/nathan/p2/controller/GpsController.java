package com.nathan.p2.controller;

import com.nathan.p2.domain.GpsTrace;
import com.nathan.p2.repository.GpsTraceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/gps")
@RequiredArgsConstructor
public class GpsController {
    private final GpsTraceRepository gpsRepo;

    @GetMapping("/sessions/{id}/traces")
    public Flux<GpsTrace> getTraces(@PathVariable Long id) {
        return gpsRepo.findBySessionIdOrderByTimestampAsc(id);
    }

    @GetMapping("/sessions/{id}/geojson")
    public Mono<String> getGeoJson(@PathVariable Long id) {
        return gpsRepo.findBySessionIdOrderByTimestampAsc(id)
            .collectList()
            .map(this::toGeoJson);
    }

    private String toGeoJson(List<GpsTrace> traces) {
        if (traces.isEmpty()) return "{\"type\":\"FeatureCollection\",\"features\":[]}";
        
        String coords = traces.stream()
            .map(t -> String.format("[%.6f,%.6f]", t.getLongitude(), t.getLatitude()))
            .collect(Collectors.joining(","));
        
        return String.format(
            "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\"," +
            "\"geometry\":{\"type\":\"LineString\",\"coordinates\":[%s]}," +
            "\"properties\":{\"name\":\"GPS Trace\"}}]}",
            coords
        );
    }
}
