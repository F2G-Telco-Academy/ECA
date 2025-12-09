package com.nathan.p2.service;

import com.nathan.p2.domain.Session;
import com.nathan.p2.dto.KpiDataDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportGenerationService {
    
    private final KpiService kpiService;
    private final AnomalyDetectionService anomalyService;
    
    public Mono<Path> generateHtmlReport(Session session) {
        return kpiService.getConsolidatedKpis(session.getId())
            .flatMap(kpis -> anomalyService.detectAndSaveAnomalies(session.getId())
                .collectList()
                .map(anomalies -> {
                    try {
                        Path reportPath = Path.of(session.getSessionDir(), "report.html");
                        try (BufferedWriter writer = new BufferedWriter(new FileWriter(reportPath.toFile()))) {
                            writer.write(buildHtmlReport(session, kpis, anomalies.size()));
                        }
                        return reportPath;
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to generate HTML report", e);
                    }
                }));
    }
    
    private String buildHtmlReport(Session session, KpiDataDto kpis, int anomalyCount) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>ECA Report - Session %s</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
                    h2 { color: #34495e; margin-top: 30px; }
                    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
                    .info-card { background: #ecf0f1; padding: 15px; border-radius: 5px; }
                    .info-label { font-weight: bold; color: #7f8c8d; font-size: 12px; text-transform: uppercase; }
                    .info-value { font-size: 18px; color: #2c3e50; margin-top: 5px; }
                    .kpi-table { width: 100%%; border-collapse: collapse; margin: 20px 0; }
                    .kpi-table th { background: #3498db; color: white; padding: 12px; text-align: left; }
                    .kpi-table td { padding: 10px; border-bottom: 1px solid #ecf0f1; }
                    .kpi-table tr:hover { background: #f8f9fa; }
                    .status-good { color: #27ae60; font-weight: bold; }
                    .status-warning { color: #f39c12; font-weight: bold; }
                    .status-bad { color: #e74c3c; font-weight: bold; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Extended Cellular Analyzer Report</h1>
                    
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-label">Session ID</div>
                            <div class="info-value">%s</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Device</div>
                            <div class="info-value">%s</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Start Time</div>
                            <div class="info-value">%s</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Status</div>
                            <div class="info-value">%s</div>
                        </div>
                    </div>
                    
                    <h2>Key Performance Indicators</h2>
                    <table class="kpi-table">
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th>Value</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            %s
                        </tbody>
                    </table>
                    
                    <h2>Summary</h2>
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-label">Anomalies Detected</div>
                            <div class="info-value %s">%d</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">Overall Quality</div>
                            <div class="info-value %s">%s</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        Generated by Extended Cellular Analyzer | %s
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                session.getId(),
                session.getId(),
                session.getDeviceId(),
                session.getStartTime().format(formatter),
                session.getStatus(),
                buildKpiRows(kpis),
                anomalyCount > 0 ? "status-warning" : "status-good",
                anomalyCount,
                getOverallQualityClass(kpis),
                getOverallQuality(kpis),
                java.time.LocalDateTime.now().format(formatter)
            );
    }
    
    private String buildKpiRows(KpiDataDto kpis) {
        StringBuilder rows = new StringBuilder();
        Map<String, Object> metrics = Map.of(
            "RSRP (dBm)", kpis.getRsrp(),
            "RSRQ (dB)", kpis.getRsrq(),
            "SINR (dB)", kpis.getSinr(),
            "RRC Success Rate (%)", kpis.getRrcSuccessRate(),
            "Attach Success Rate (%)", kpis.getAttachSuccessRate(),
            "Handover Success Rate (%)", kpis.getHandoverSuccessRate()
        );
        
        metrics.forEach((name, value) -> {
            String status = getMetricStatus(name, value);
            rows.append("<tr><td>").append(name).append("</td><td>")
                .append(formatValue(value)).append("</td><td class=\"")
                .append(status).append("\">").append(getStatusText(status))
                .append("</td></tr>");
        });
        
        return rows.toString();
    }
    
    private String formatValue(Object value) {
        if (value == null) return "N/A";
        if (value instanceof Double) return String.format("%.2f", value);
        return value.toString();
    }
    
    private String getMetricStatus(String name, Object value) {
        if (value == null) return "status-warning";
        if (name.contains("RSRP")) {
            double rsrp = ((Number) value).doubleValue();
            return rsrp > -80 ? "status-good" : rsrp > -100 ? "status-warning" : "status-bad";
        }
        if (name.contains("Rate")) {
            double rate = ((Number) value).doubleValue();
            return rate > 95 ? "status-good" : rate > 85 ? "status-warning" : "status-bad";
        }
        return "status-good";
    }
    
    private String getStatusText(String statusClass) {
        return switch (statusClass) {
            case "status-good" -> "Good";
            case "status-warning" -> "Fair";
            case "status-bad" -> "Poor";
            default -> "Unknown";
        };
    }
    
    private String getOverallQualityClass(KpiDataDto kpis) {
        if (kpis.getRsrp() != null && kpis.getRsrp() > -80 && 
            kpis.getRrcSuccessRate() != null && kpis.getRrcSuccessRate() > 95) {
            return "status-good";
        }
        if (kpis.getRsrp() != null && kpis.getRsrp() < -100) {
            return "status-bad";
        }
        return "status-warning";
    }
    
    private String getOverallQuality(KpiDataDto kpis) {
        String qualityClass = getOverallQualityClass(kpis);
        return switch (qualityClass) {
            case "status-good" -> "Excellent";
            case "status-warning" -> "Fair";
            case "status-bad" -> "Poor";
            default -> "Unknown";
        };
    }
}
