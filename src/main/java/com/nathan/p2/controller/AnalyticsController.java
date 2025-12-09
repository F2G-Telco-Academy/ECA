package com.nathan.p2.controller;

import com.nathan.p2.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
    
    private final ThroughputAnalyzerService throughputAnalyzer;
    private final LatencyAnalyzerService latencyAnalyzer;
    private final HandoverAnalyzerService handoverAnalyzer;
    private final RachAnalyzerService rachAnalyzer;
    private final ProtocolCorrelationService protocolCorrelation;
    private final ProcedureAnalyzerService procedureAnalyzer;
    private final MeasurementReportAnalyzerService measurementReportAnalyzer;
    private final SmsAnalyzerService smsAnalyzer;
    private final CellReselectionAnalyzerService cellReselectionAnalyzer;
    
    @GetMapping("/throughput")
    public Mono<Map<String, Object>> analyzeThroughput(@RequestParam String pcapPath) {
        return throughputAnalyzer.analyzeThroughput(pcapPath);
    }
    
    @GetMapping("/throughput/detailed")
    public Mono<Map<String, Object>> analyzeDetailedThroughput(@RequestParam String pcapPath) {
        return throughputAnalyzer.analyzeDetailedThroughput(pcapPath);
    }
    
    @GetMapping("/latency")
    public Mono<Map<String, Object>> analyzeLatency(@RequestParam String pcapPath) {
        return latencyAnalyzer.analyzeLatency(pcapPath);
    }
    
    @GetMapping("/handover")
    public Mono<Map<String, Object>> analyzeHandovers(@RequestParam String pcapPath) {
        return handoverAnalyzer.analyzeHandovers(pcapPath);
    }
    
    @GetMapping("/rach")
    public Mono<Map<String, Object>> analyzeRach(@RequestParam String pcapPath) {
        return rachAnalyzer.analyzeRach(pcapPath);
    }
    
    @GetMapping("/correlation")
    public Mono<Map<String, Object>> correlateProtocols(@RequestParam String pcapPath) {
        return protocolCorrelation.correlateProtocols(pcapPath);
    }
    
    @GetMapping("/procedures")
    public Mono<Map<String, Object>> analyzeProcedures(@RequestParam String pcapPath) {
        return procedureAnalyzer.analyzeProcedures(pcapPath);
    }
    
    @GetMapping("/measurement-reports")
    public Mono<Map<String, Object>> analyzeMeasurementReports(@RequestParam String pcapPath) {
        return measurementReportAnalyzer.analyzeMeasurementReports(pcapPath);
    }
    
    @GetMapping("/sms")
    public Mono<Map<String, Object>> analyzeSms(@RequestParam String pcapPath) {
        return smsAnalyzer.analyzeSms(pcapPath);
    }
    
    @GetMapping("/cell-reselection")
    public Mono<Map<String, Object>> analyzeCellReselection(@RequestParam String pcapPath) {
        return cellReselectionAnalyzer.analyzeCellReselection(pcapPath);
    }
}
