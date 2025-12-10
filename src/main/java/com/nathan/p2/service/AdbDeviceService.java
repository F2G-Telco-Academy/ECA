package com.nathan.p2.service;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ADB Device Service - Extracts real-time cellular data from connected Android devices
 * Uses DRY principle with reusable regex extraction patterns
 * ADB Path configured in application.properties: C:\Program Files (x86)\platform-tools\adb.exe
 */
@Slf4j
@Service
public class AdbDeviceService {

    @Value("${adb.path:adb}")
    private String adbPath;

    private static final int TIMEOUT_SECONDS = 10;

    @Data
    public static class CellularData {
        private Double rsrp;
        private Double rsrq;
        private Double sinr;
        private Double rssi;
        private Integer cqi;
        private String cellId;
        private Integer pci;
        private Integer tac;
        private String mcc;
        private String mnc;
        private String operator;
        private String networkType;
        private Long timestamp;
    }

    @Data
    public static class GpsData {
        private Double latitude;
        private Double longitude;
        private Double altitude;
        private Float accuracy;
        private Long timestamp;
    }

    @Data
    public static class DeviceSample {
        private CellularData cellular;
        private GpsData gps;
        private Long timestamp;
    }

    /**
     * Get list of connected devices
     */
    public List<String> getConnectedDevices() {
        try {
            String output = executeAdbCommand("devices");
            List<String> devices = new ArrayList<>();

            for (String line : output.split("\n")) {
                if (line.contains("\tdevice")) {
                    devices.add(line.split("\t")[0]);
                }
            }

            log.info("Found {} connected devices", devices.size());
            return devices;
        } catch (Exception e) {
            log.error("Failed to get devices: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Extract current cellular signal data from device
     */
    public CellularData getCellularData(String deviceId) {
        try {
            String output = executeAdbCommand("-s", deviceId, "shell", "dumpsys", "telephony.registry");
            return parseCellularData(output);
        } catch (Exception e) {
            log.error("Failed to get cellular data from {}: {}", deviceId, e.getMessage());
            return null;
        }
    }

    /**
     * Extract GPS location from device
     */
    public GpsData getGpsData(String deviceId) {
        try {
            String output = executeAdbCommand("-s", deviceId, "shell", "dumpsys", "location");
            return parseGpsData(output);
        } catch (Exception e) {
            log.error("Failed to get GPS data from {}: {}", deviceId, e.getMessage());
            return null;
        }
    }

    /**
     * Get complete device sample (cellular + GPS)
     */
    public DeviceSample getDeviceSample(String deviceId) {
        DeviceSample sample = new DeviceSample();
        sample.setCellular(getCellularData(deviceId));
        sample.setGps(getGpsData(deviceId));
        sample.setTimestamp(System.currentTimeMillis());
        return sample;
    }

    /**
     * Parse cellular data from dumpsys output - DRY pattern
     */
    private CellularData parseCellularData(String output) {
        CellularData data = new CellularData();
        data.setTimestamp(System.currentTimeMillis());

        // Extract values using reusable pattern
        data.setRsrp(extractDouble(output, "rsrp=(-?\\d+)", -120.0));
        data.setRsrq(extractDouble(output, "rsrq=(-?\\d+)", -20.0));
        data.setSinr(extractDouble(output, "rssnr=(-?\\d+)", -10.0));

        // Calculate RSSI from RSRP (LTE formula)
        if (data.getRsrp() != null) {
            data.setRssi(data.getRsrp() + 10.8);
        }

        // Estimate CQI from SINR
        if (data.getSinr() != null) {
            data.setCqi(estimateCqi(data.getSinr()));
        }

        data.setCellId(extractString(output, "mCi=(\\d+)", "Unknown"));
        data.setPci(extractInteger(output, "mPci=(\\d+)", 0));
        data.setTac(extractInteger(output, "mTac=(\\d+)", 0));
        data.setMcc(extractString(output, "mMcc=(\\d+)", "Unknown"));
        data.setMnc(extractString(output, "mMnc=(\\d+)", "Unknown"));
        data.setOperator(extractString(output, "mAlphaLong=([^\\s]+(?:\\s+[^\\s]+)*)", "Unknown"));

        // Determine network type
        if (output.contains("LTE") || data.getRsrp() != null) {
            data.setNetworkType("LTE");
        } else if (output.contains("5G") || output.contains("NR")) {
            data.setNetworkType("5G");
        } else {
            data.setNetworkType("Unknown");
        }

        return data;
    }

    /**
     * Parse GPS data from dumpsys output - DRY pattern
     */
    private GpsData parseGpsData(String output) {
        GpsData data = new GpsData();
        data.setTimestamp(System.currentTimeMillis());

        // Try GPS provider first (most accurate)
        Pattern gpsPattern = Pattern.compile("Location\\[gps\\s+([-\\d.]+),([-\\d.]+).*?alt=([-\\d.]+).*?acc=([-\\d.]+)");
        Matcher gpsMatcher = gpsPattern.matcher(output);

        if (gpsMatcher.find()) {
            data.setLatitude(Double.parseDouble(gpsMatcher.group(1)));
            data.setLongitude(Double.parseDouble(gpsMatcher.group(2)));
            data.setAltitude(Double.parseDouble(gpsMatcher.group(3)));
            data.setAccuracy(Float.parseFloat(gpsMatcher.group(4)));
            return data;
        }

        // Fallback to fused provider
        Pattern fusedPattern = Pattern.compile("Location\\[fused\\s+([-\\d.]+),([-\\d.]+).*?alt=([-\\d.]+)");
        Matcher fusedMatcher = fusedPattern.matcher(output);

        if (fusedMatcher.find()) {
            data.setLatitude(Double.parseDouble(fusedMatcher.group(1)));
            data.setLongitude(Double.parseDouble(fusedMatcher.group(2)));
            data.setAltitude(Double.parseDouble(fusedMatcher.group(3)));
            data.setAccuracy(10.0f); // Estimate
        }

        return data;
    }

    /**
     * DRY: Extract double value with regex pattern
     */
    private Double extractDouble(String text, String pattern, Double defaultValue) {
        try {
            Matcher matcher = Pattern.compile(pattern).matcher(text);
            if (matcher.find()) {
                return Double.parseDouble(matcher.group(1));
            }
        } catch (Exception e) {
            log.trace("Failed to extract double with pattern {}", pattern);
        }
        return defaultValue;
    }

    /**
     * DRY: Extract integer value with regex pattern
     */
    private Integer extractInteger(String text, String pattern, Integer defaultValue) {
        try {
            Matcher matcher = Pattern.compile(pattern).matcher(text);
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }
        } catch (Exception e) {
            log.trace("Failed to extract integer with pattern {}", pattern);
        }
        return defaultValue;
    }

    /**
     * DRY: Extract string value with regex pattern
     */
    private String extractString(String text, String pattern, String defaultValue) {
        try {
            Matcher matcher = Pattern.compile(pattern).matcher(text);
            if (matcher.find()) {
                return matcher.group(1);
            }
        } catch (Exception e) {
            log.trace("Failed to extract string with pattern {}", pattern);
        }
        return defaultValue;
    }

    /**
     * Estimate CQI from SINR value
     */
    private Integer estimateCqi(Double sinr) {
        if (sinr >= 20) return 15;
        if (sinr >= 15) return 12;
        if (sinr >= 10) return 10;
        if (sinr >= 5) return 7;
        if (sinr >= 0) return 5;
        if (sinr >= -5) return 3;
        return 1;
    }

    /**
     * Execute ADB command - DRY utility
     */
    private String executeAdbCommand(String... args) throws IOException, InterruptedException {
        List<String> command = new ArrayList<>();
        command.add(adbPath);
        for (String arg : args) {
            command.add(arg);
        }

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        boolean finished = process.waitFor(TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IOException("ADB command timed out");
        }

        return output.toString();
    }
}

