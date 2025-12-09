package com.nathan.p2.service;

import com.nathan.p2.domain.GpsTrace;
import com.nathan.p2.domain.KpiAggregate;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeAdbMetricsService {

    private final AdbAutoInstallerService adbInstaller;

    public Flux<GpsTrace> streamGpsData(String deviceId, Long sessionId) {
        return Flux.interval(Duration.ofSeconds(1))
                .flatMap(tick -> getGpsFromDevice(deviceId, sessionId))
                .filter(gps -> gps.getLatitude() != 0 && gps.getLongitude() != 0);
    }

    public Flux<KpiAggregate> streamKpiData(String deviceId, Long sessionId) {
        return Flux.interval(Duration.ofSeconds(1))
                .flatMap(tick -> getKpisFromDevice(deviceId, sessionId));
    }

    public Flux<DeviceMetrics> streamAllMetrics(String deviceId, Long sessionId) {
        return Flux.interval(Duration.ofSeconds(1))
                .flatMap(tick -> getAllMetrics(deviceId, sessionId));
    }

    private Mono<GpsTrace> getGpsFromDevice(String deviceId, Long sessionId) {
        return Mono.fromCallable(() -> {
            String adbPath = adbInstaller.getAdbExecutablePath();
            
            // Get GPS location from device
            String[] commands = {
                adbPath, "-s", deviceId, "shell",
                "dumpsys", "location"
            };

            Process process = new ProcessBuilder(commands)
                    .redirectErrorStream(true)
                    .start();

            GpsTrace gps = new GpsTrace();
            gps.setSessionId(sessionId);
            gps.setTimestamp(LocalDateTime.now());

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Parse GPS coordinates
                    if (line.contains("latitude=")) {
                        Pattern latPattern = Pattern.compile("latitude=([\\-0-9.]+)");
                        Matcher matcher = latPattern.matcher(line);
                        if (matcher.find()) {
                            gps.setLatitude(Double.parseDouble(matcher.group(1)));
                        }
                    }
                    if (line.contains("longitude=")) {
                        Pattern lonPattern = Pattern.compile("longitude=([\\-0-9.]+)");
                        Matcher matcher = lonPattern.matcher(line);
                        if (matcher.find()) {
                            gps.setLongitude(Double.parseDouble(matcher.group(1)));
                        }
                    }
                    if (line.contains("altitude=")) {
                        Pattern altPattern = Pattern.compile("altitude=([\\-0-9.]+)");
                        Matcher matcher = altPattern.matcher(line);
                        if (matcher.find()) {
                            gps.setAltitude(Double.parseDouble(matcher.group(1)));
                        }
                    }
                }
            }

            process.waitFor();
            return gps;
        }).onErrorResume(e -> {
            log.warn("Failed to get GPS from device: {}", e.getMessage());
            return Mono.empty();
        });
    }

    private Mono<KpiAggregate> getKpisFromDevice(String deviceId, Long sessionId) {
        return Mono.fromCallable(() -> {
            String adbPath = adbInstaller.getAdbExecutablePath();
            
            // Get signal strength from device
            String[] commands = {
                adbPath, "-s", deviceId, "shell",
                "dumpsys", "telephony.registry"
            };

            Process process = new ProcessBuilder(commands)
                    .redirectErrorStream(true)
                    .start();

            KpiAggregate kpi = new KpiAggregate();
            kpi.setSessionId(sessionId);
            kpi.setTimestamp(LocalDateTime.now());

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Parse signal strength
                    if (line.contains("mSignalStrength=")) {
                        parseSignalStrength(line, kpi);
                    }
                    
                    // Parse cell info
                    if (line.contains("mCellIdentity=")) {
                        parseCellInfo(line, kpi);
                    }
                }
            }

            process.waitFor();
            return kpi;
        }).onErrorResume(e -> {
            log.warn("Failed to get KPIs from device: {}", e.getMessage());
            return Mono.empty();
        });
    }

    private Mono<DeviceMetrics> getAllMetrics(String deviceId, Long sessionId) {
        return Mono.zip(
                getGpsFromDevice(deviceId, sessionId).defaultIfEmpty(new GpsTrace()),
                getKpisFromDevice(deviceId, sessionId).defaultIfEmpty(new KpiAggregate()),
                getBatteryInfo(deviceId),
                getThermalInfo(deviceId)
        ).map(tuple -> {
            DeviceMetrics metrics = new DeviceMetrics();
            metrics.setGps(tuple.getT1());
            metrics.setKpi(tuple.getT2());
            metrics.setBatteryTemp(tuple.getT3());
            metrics.setThermalStatus(tuple.getT4());
            metrics.setTimestamp(LocalDateTime.now());
            return metrics;
        });
    }

    private Mono<Double> getBatteryInfo(String deviceId) {
        return Mono.fromCallable(() -> {
            String adbPath = adbInstaller.getAdbExecutablePath();
            
            String[] commands = {
                adbPath, "-s", deviceId, "shell",
                "dumpsys", "battery"
            };

            Process process = new ProcessBuilder(commands)
                    .redirectErrorStream(true)
                    .start();

            double temperature = 0.0;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("temperature:")) {
                        Pattern pattern = Pattern.compile("temperature:\\s*([0-9]+)");
                        Matcher matcher = pattern.matcher(line);
                        if (matcher.find()) {
                            // Temperature is in tenths of degree Celsius
                            temperature = Double.parseDouble(matcher.group(1)) / 10.0;
                        }
                    }
                }
            }

            process.waitFor();
            return temperature;
        }).onErrorReturn(0.0);
    }

    private Mono<String> getThermalInfo(String deviceId) {
        return Mono.fromCallable(() -> {
            String adbPath = adbInstaller.getAdbExecutablePath();
            
            String[] commands = {
                adbPath, "-s", deviceId, "shell",
                "dumpsys", "thermalservice"
            };

            Process process = new ProcessBuilder(commands)
                    .redirectErrorStream(true)
                    .start();

            String status = "NONE";

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("Thermal Status:")) {
                        String[] parts = line.split(":");
                        if (parts.length > 1) {
                            status = parts[1].trim();
                        }
                    }
                }
            }

            process.waitFor();
            return status;
        }).onErrorReturn("NONE");
    }

    private void parseSignalStrength(String line, KpiAggregate kpi) {
        // Parse LTE signal strength
        Pattern rsrpPattern = Pattern.compile("rsrp=([\\-0-9]+)");
        Matcher rsrpMatcher = rsrpPattern.matcher(line);
        if (rsrpMatcher.find()) {
            kpi.setRsrp(Double.parseDouble(rsrpMatcher.group(1)));
        }

        Pattern rsrqPattern = Pattern.compile("rsrq=([\\-0-9]+)");
        Matcher rsrqMatcher = rsrqPattern.matcher(line);
        if (rsrqMatcher.find()) {
            kpi.setRsrq(Double.parseDouble(rsrqMatcher.group(1)));
        }

        Pattern rssnrPattern = Pattern.compile("rssnr=([\\-0-9]+)");
        Matcher rssnrMatcher = rssnrPattern.matcher(line);
        if (rssnrMatcher.find()) {
            kpi.setSinr(Double.parseDouble(rssnrMatcher.group(1)));
        }

        Pattern cqiPattern = Pattern.compile("cqi=([0-9]+)");
        Matcher cqiMatcher = cqiPattern.matcher(line);
        if (cqiMatcher.find()) {
            kpi.setCqi(Integer.parseInt(cqiMatcher.group(1)));
        }
    }

    private void parseCellInfo(String line, KpiAggregate kpi) {
        // Parse cell ID and PCI
        Pattern pciPattern = Pattern.compile("pci=([0-9]+)");
        Matcher pciMatcher = pciPattern.matcher(line);
        if (pciMatcher.find()) {
            kpi.setPci(Integer.parseInt(pciMatcher.group(1)));
        }

        Pattern earfcnPattern = Pattern.compile("earfcn=([0-9]+)");
        Matcher earfcnMatcher = earfcnPattern.matcher(line);
        if (earfcnMatcher.find()) {
            kpi.setEarfcn(Integer.parseInt(earfcnMatcher.group(1)));
        }
    }

    @Data
    public static class DeviceMetrics {
        private GpsTrace gps;
        private KpiAggregate kpi;
        private Double batteryTemp;
        private String thermalStatus;
        private LocalDateTime timestamp;
    }
}
