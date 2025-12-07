package com.nathan.p2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nathan.p2.domain.GeoJsonFeatureCollection;
import com.nathan.p2.repository.KpiAggregateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Service
@RequiredArgsConstructor
public class MapVisualizationService {

    private final KpiAggregateRepository kpiRepository;
    private final ObjectMapper objectMapper;
    
    @Value("${eca.storage.base-dir:./data/sessions}")
    private String baseDir;

    public Mono<String> generateHtmlMap(Long sessionId, GeoJsonFeatureCollection geojson, String mapType) {
        return Mono.fromCallable(() -> {
            Path sessionDir = Paths.get(baseDir, "session_" + sessionId);
            Files.createDirectories(sessionDir);
            
            // Save GeoJSON
            Path geojsonPath = sessionDir.resolve("map_data.geojson");
            objectMapper.writeValue(geojsonPath.toFile(), geojson);
            
            // Generate HTML map
            Path htmlPath = sessionDir.resolve("map_" + mapType + ".html");
            
            String[] command = {
                "python3",
                "./scat/map_generator.py",
                geojsonPath.toString(),
                htmlPath.toString(),
                mapType
            };
            
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("Map generation failed with exit code: " + exitCode);
            }
            
            log.info("Generated {} map for session {}: {}", mapType, sessionId, htmlPath);
            return htmlPath.toString();
        });
    }

    public Mono<byte[]> getMapHtml(Long sessionId, String mapType) {
        return Mono.fromCallable(() -> {
            Path htmlPath = Paths.get(baseDir, "session_" + sessionId, "map_" + mapType + ".html");
            if (!Files.exists(htmlPath)) {
                throw new RuntimeException("Map not found: " + htmlPath);
            }
            return Files.readAllBytes(htmlPath);
        });
    }
}
