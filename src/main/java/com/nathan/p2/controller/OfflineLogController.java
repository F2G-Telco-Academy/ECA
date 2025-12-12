package com.nathan.p2.controller;

import com.nathan.p2.domain.KpiAggregate;
import com.nathan.p2.repository.KpiAggregateRepository;
import com.nathan.p2.service.OfflineLogConversionService;
import com.nathan.p2.service.QmdlConversionService;
import com.nathan.p2.service.EnhancedKpiExtractionService;
import com.nathan.p2.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;

@Slf4j
@RestController
@RequestMapping("/api/offline")
@RequiredArgsConstructor
public class OfflineLogController {
    private final OfflineLogConversionService conversionService;
    private final QmdlConversionService qmdlConversionService;
    private final EnhancedKpiExtractionService kpiExtractionService;
    private final SessionService sessionService;
    private final KpiAggregateRepository kpiRepository;

    @PostMapping(value = "/convert", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ConversionResponse> convertLog(@RequestPart("file") Mono<FilePart> filePart) {
        return filePart.flatMap(file -> {
            String filename = file.filename();
            Path uploadDir = Paths.get("./data/uploads");
            
            // Create upload directory if not exists
            try {
                Files.createDirectories(uploadDir);
            } catch (Exception e) {
                log.error("Failed to create upload directory", e);
            }
            
            Path inputPath = uploadDir.resolve(filename);
            
            return file.transferTo(inputPath.toFile())
                .then(Mono.defer(() -> {
                    log.info("📁 File uploaded: {} ({} bytes)", filename, inputPath.toFile().length());
                    
                    // Auto-detect and convert QMDL files
                    if (qmdlConversionService.isQmdlFile(inputPath)) {
                        log.info("🔄 QMDL file detected, converting to PCAP...");
                        return qmdlConversionService.convertQmdlToPcap(inputPath)
                            .flatMap(pcapPath -> processAndExtractKpis(pcapPath, filename));
                    } 
                    // Handle other formats
                    else if (filename.toLowerCase().endsWith(".sdm") || 
                             filename.toLowerCase().endsWith(".lpd")) {
                        Path outputPath = uploadDir.resolve(
                            filename.replaceAll("\\.(sdm|lpd)$", ".pcap"));
                        OfflineLogConversionService.LogFormat format = 
                            conversionService.detectFormat(inputPath);
                        return conversionService.convertToPcap(inputPath, outputPath, format)
                            .flatMap(pcapPath -> processAndExtractKpis(pcapPath, filename));
                    }
                    // Already PCAP format
                    else {
                        return processAndExtractKpis(inputPath, filename);
                    }
                }))
                .onErrorResume(e -> {
                    log.error("❌ Conversion/Processing failed for {}", filename, e);
                    return Mono.just(new ConversionResponse(
                        false,
                        "Processing failed: " + e.getMessage(),
                        null,
                        null
                    ));
                });
        });
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<AnalysisResponse> analyzePcap(@RequestPart("file") Mono<FilePart> filePart) {
        return filePart.flatMap(file -> {
            String filename = file.filename();
            Path uploadDir = Paths.get("./data/uploads");
            
            try {
                Files.createDirectories(uploadDir);
            } catch (Exception e) {
                log.error("Failed to create upload directory", e);
            }
            
            Path inputPath = uploadDir.resolve(filename);
            
            return file.transferTo(inputPath.toFile())
                .then(Mono.defer(() -> {
                    log.info("📁 PCAP uploaded for analysis: {}", filename);
                    
                    // Create offline session
                    return sessionService.createOfflineSession("offline", inputPath.toString())
                        .flatMap(session -> {
                            Long sessionId = session.getId();
                            
                            // Extract KPIs from PCAP
                            return kpiExtractionService.extractAllKpis(inputPath)
                                .flatMap(kpiResult -> {
                                    // Store KPIs in database
                                    return storeKpis(sessionId, kpiResult)
                                        .then(Mono.defer(() -> {
                                            // Build list of available KPIs
                                            java.util.List<String> kpisAvailable = new java.util.ArrayList<>();
                                            kpisAvailable.addAll(kpiResult.successRates().keySet());
                                            kpisAvailable.addAll(kpiResult.measurements().keySet());
                                            
                                            log.info("✅ Analysis complete: {} KPIs stored for session {}", 
                                                kpisAvailable.size(), sessionId);
                                            
                                            return Mono.just(new AnalysisResponse(
                                                true,
                                                sessionId.toString(),
                                                kpisAvailable,
                                                "Analysis complete - " + kpisAvailable.size() + " KPIs extracted"
                                            ));
                                        }));
                                });
                        });
                }))
                .onErrorResume(e -> {
                    log.error("❌ Analysis failed for {}", filename, e);
                    return Mono.just(new AnalysisResponse(
                        false,
                        "error",
                        java.util.List.of(),
                        "Analysis failed: " + e.getMessage()
                    ));
                });
        });
    }
    
    private Mono<Void> storeKpis(Long sessionId, EnhancedKpiExtractionService.KpiResult kpiResult) {
        LocalDateTime now = LocalDateTime.now();
        
        // Store success rates
        Flux<KpiAggregate> successRates = Flux.fromIterable(kpiResult.successRates().entrySet())
            .map(entry -> KpiAggregate.builder()
                .sessionId(sessionId)
                .metric(entry.getKey())
                .avgValue(entry.getValue())
                .minValue(entry.getValue())
                .maxValue(entry.getValue())
                .rat("LTE")
                .timestamp(now)
                .build());
        
        // Store measurements
        Flux<KpiAggregate> measurements = Flux.fromIterable(kpiResult.measurements().entrySet())
            .map(entry -> KpiAggregate.builder()
                .sessionId(sessionId)
                .metric(entry.getKey())
                .avgValue(entry.getValue())
                .minValue(entry.getValue())
                .maxValue(entry.getValue())
                .rat("LTE")
                .timestamp(now)
                .build());
        
        return Flux.concat(successRates, measurements)
            .flatMap(kpiRepository::save)
            .then();
    }

    @GetMapping("/download")
    public Mono<ResponseEntity<Resource>> downloadConvertedFile(@RequestParam("path") String pcapPath) {
        return Mono.fromCallable(() -> {
            Path path = Paths.get(pcapPath);
            if (!Files.exists(path)) {
                return ResponseEntity.notFound().build();
            }

            byte[] data = Files.readAllBytes(path);
            ByteArrayResource resource = new ByteArrayResource(data);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + path.getFileName().toString())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(data.length)
                    .body(resource);
        });
    }
    
    /**
     * Process PCAP and extract KPIs
     */
    private Mono<ConversionResponse> processAndExtractKpis(Path pcapPath, String originalFilename) {
        return kpiExtractionService.extractAllKpis(pcapPath)
            .map(kpiResult -> {
                log.info("✅ Processing complete for {}", originalFilename);
                log.info("📊 Extracted {} KPIs, {} events", 
                    kpiResult.successRates().size(), 
                    kpiResult.events().size());
                
                return new ConversionResponse(
                    true,
                    "Processing successful - Extracted " + kpiResult.successRates().size() + " KPIs",
                    pcapPath.toString(),
                    kpiResult
                );
            })
            .onErrorResume(e -> {
                log.error("KPI extraction failed", e);
                return Mono.just(new ConversionResponse(
                    true,  // Conversion succeeded
                    "Conversion successful but KPI extraction failed: " + e.getMessage(),
                    pcapPath.toString(),
                    null
                ));
            });
    }

    public record ConversionResponse(
        boolean success,
        String message,
        String pcapPath,
        EnhancedKpiExtractionService.KpiResult kpiData
    ) {}
    
    public record AnalysisResponse(
        boolean success,
        String sessionId,
        java.util.List<String> kpisAvailable,
        String message
    ) {}
}
