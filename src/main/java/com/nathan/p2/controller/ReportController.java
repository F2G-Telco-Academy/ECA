package com.nathan.p2.controller;

import com.nathan.p2.repository.SessionRepository;
import com.nathan.p2.service.ReportGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    
    private final ReportGenerationService reportService;
    private final SessionRepository sessionRepository;
    
    @PostMapping("/session/{sessionId}/html")
    public Mono<ResponseEntity<Resource>> generateHtmlReport(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(reportService::generateHtmlReport)
            .map(path -> {
                Resource resource = new FileSystemResource(path);
                return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report.html")
                    .contentType(MediaType.TEXT_HTML)
                    .body(resource);
            });
    }
}
