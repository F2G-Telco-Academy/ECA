package com.nathan.p2.controller;

import com.nathan.p2.service.OfflineLogConversionService;
import com.nathan.p2.service.QmdlConversionService;
import com.nathan.p2.service.EnhancedKpiExtractionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.io.File;

@Slf4j
@RestController
@RequestMapping("/api/offline")
@RequiredArgsConstructor
public class OfflineLogController {
    private final OfflineLogConversionService conversionService;
    private final QmdlConversionService qmdlConversionService;
    private final EnhancedKpiExtractionService kpiExtractionService;

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
}
