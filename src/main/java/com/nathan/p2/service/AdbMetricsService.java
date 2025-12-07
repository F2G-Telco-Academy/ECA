package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.service.process.ExternalToolService;
import com.nathan.p2.service.process.ProcessSpec;
import com.nathan.p2.util.PlatformUtils;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ADB Metrics Service
 * Retrieves real-time metrics via ADB commands
 * 
 * Based on SCAT adb_exporter.py patterns:
 * - adb shell dumpsys telephony.registry (signal/cell info)
 * - adb shell dumpsys location (GPS)
 * - adb shell cat /proc/net/dev (network stats)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdbMetricsService {
    private final ExternalToolService toolService;
    private final ToolsConfig config;

    @Builder
    public record SignalMetrics(
        int rsrp,
        int rsrq,
        int rssi,
        Integer sinr,
        int mcc,
        int mnc,
        int pci,
        int earfcn,
        String operator,
        String networkMode
    ) {}

    @Builder
    public record CellInfo(
        int tac,
        int ci,
        int lac,
        int cid,
        int band,
        int bandwidth
    ) {}

    @Builder
    public record GpsLocation(
        double latitude,
        double longitude
    ) {}

    /**
     * Get signal strength metrics
     * Based on: adb shell dumpsys telephony.registry
     */
    public Mono<SignalMetrics> getSignalStrength(String deviceId) {
        return executeAdbCommand(deviceId, "dumpsys", "telephony.registry")
            .map(this::parseSignalMetrics);
    }

    /**
     * Get cell information
     */
    public Mono<CellInfo> getCellInfo(String deviceId) {
        return executeAdbCommand(deviceId, "dumpsys", "telephony.registry")
            .map(this::parseCellInfo);
    }

    /**
     * Get GPS location
     * Based on: adb shell dumpsys location
     */
    public Mono<GpsLocation> getGpsLocation(String deviceId) {
        return executeAdbCommand(deviceId, "dumpsys", "location")
            .map(this::parseGpsLocation);
    }

    /**
     * Execute ADB shell command
     */
    private Mono<String> executeAdbCommand(String deviceId, String... shellArgs) {
        List<String> args = new java.util.ArrayList<>();
        if (deviceId != null && !deviceId.isEmpty()) {
            args.add("-s");
            args.add(deviceId);
        }
        args.add("shell");
        args.addAll(List.of(shellArgs));
        
        String adbPath = PlatformUtils.resolveAdbPath(config.getTools().getAdb().getPath());
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("adb-" + System.currentTimeMillis())
            .command(adbPath)
            .args(args)
            .workingDirectory(Path.of(System.getProperty("user.dir")))
            .environment(Map.of())
            .captureStderr(true)
            .build();

        return toolService.start(spec)
            .flatMapMany(toolService::logs)
            .collectList()
            .map(lines -> String.join("\n", lines));
    }

    /**
     * Parse signal metrics from dumpsys output
     */
    private SignalMetrics parseSignalMetrics(String output) {
        SignalMetrics.SignalMetricsBuilder builder = SignalMetrics.builder();
        
        // LTE signal strength
        Pattern rsrpPattern = Pattern.compile("rsrp=(-?\\d+)");
        Pattern rsrqPattern = Pattern.compile("rsrq=(-?\\d+)");
        Pattern rssiPattern = Pattern.compile("rssi=(-?\\d+)");
        Pattern sinrPattern = Pattern.compile("(?:sinr|snr)=(-?\\d+)");
        
        Matcher rsrpMatcher = rsrpPattern.matcher(output);
        if (rsrpMatcher.find()) {
            builder.rsrp(Integer.parseInt(rsrpMatcher.group(1)));
        }
        
        Matcher rsrqMatcher = rsrqPattern.matcher(output);
        if (rsrqMatcher.find()) {
            builder.rsrq(Integer.parseInt(rsrqMatcher.group(1)));
        }
        
        Matcher rssiMatcher = rssiPattern.matcher(output);
        if (rssiMatcher.find()) {
            builder.rssi(Integer.parseInt(rssiMatcher.group(1)));
        }
        
        Matcher sinrMatcher = sinrPattern.matcher(output);
        if (sinrMatcher.find()) {
            builder.sinr(Integer.parseInt(sinrMatcher.group(1)));
        }
        
        // MCC/MNC
        Pattern mccPattern = Pattern.compile("mMcc=(\\d+)");
        Pattern mncPattern = Pattern.compile("mMnc=(\\d+)");
        
        Matcher mccMatcher = mccPattern.matcher(output);
        if (mccMatcher.find()) {
            builder.mcc(Integer.parseInt(mccMatcher.group(1)));
        }
        
        Matcher mncMatcher = mncPattern.matcher(output);
        if (mncMatcher.find()) {
            builder.mnc(Integer.parseInt(mncMatcher.group(1)));
        }
        
        // PCI/EARFCN
        Pattern pciPattern = Pattern.compile("mPci=(\\d+)");
        Pattern earfcnPattern = Pattern.compile("mEarfcn=(\\d+)");
        
        Matcher pciMatcher = pciPattern.matcher(output);
        if (pciMatcher.find()) {
            builder.pci(Integer.parseInt(pciMatcher.group(1)));
        }
        
        Matcher earfcnMatcher = earfcnPattern.matcher(output);
        if (earfcnMatcher.find()) {
            builder.earfcn(Integer.parseInt(earfcnMatcher.group(1)));
        }
        
        // Operator
        Pattern operatorPattern = Pattern.compile("mAlphaLong=([^}]+)");
        Matcher operatorMatcher = operatorPattern.matcher(output);
        if (operatorMatcher.find()) {
            builder.operator(operatorMatcher.group(1).trim());
        }
        
        // Network mode
        String networkMode = "UNKNOWN";
        if (output.contains("CellSignalStrengthLte")) {
            networkMode = "LTE";
        } else if (output.contains("CellSignalStrengthWcdma")) {
            networkMode = "WCDMA";
        } else if (output.contains("CellSignalStrengthGsm")) {
            networkMode = "GSM";
        }
        builder.networkMode(networkMode);
        
        return builder.build();
    }

    /**
     * Parse cell info from dumpsys output
     */
    private CellInfo parseCellInfo(String output) {
        CellInfo.CellInfoBuilder builder = CellInfo.builder();
        
        // TAC/CI (LTE)
        Pattern tacPattern = Pattern.compile("mTac=(\\d+)");
        Pattern ciPattern = Pattern.compile("mCi=(\\d+)");
        
        Matcher tacMatcher = tacPattern.matcher(output);
        if (tacMatcher.find()) {
            int tac = Integer.parseInt(tacMatcher.group(1));
            if (tac != 2147483647) {
                builder.tac(tac);
            }
        }
        
        Matcher ciMatcher = ciPattern.matcher(output);
        if (ciMatcher.find()) {
            int ci = Integer.parseInt(ciMatcher.group(1));
            if (ci != 2147483647) {
                builder.ci(ci);
            }
        }
        
        // LAC/CID (GSM/WCDMA)
        Pattern lacPattern = Pattern.compile("mLac=(\\d+)");
        Pattern cidPattern = Pattern.compile("mCid=(\\d+)");
        
        Matcher lacMatcher = lacPattern.matcher(output);
        if (lacMatcher.find()) {
            builder.lac(Integer.parseInt(lacMatcher.group(1)));
        }
        
        Matcher cidMatcher = cidPattern.matcher(output);
        if (cidMatcher.find()) {
            builder.cid(Integer.parseInt(cidMatcher.group(1)));
        }
        
        // Band
        Pattern bandPattern = Pattern.compile("mBands=\\[(\\d+)\\]");
        Matcher bandMatcher = bandPattern.matcher(output);
        if (bandMatcher.find()) {
            builder.band(Integer.parseInt(bandMatcher.group(1)));
        }
        
        // Bandwidth
        Pattern bwPattern = Pattern.compile("mConnectionStatus=PrimaryServing,mCellBandwidthDownlinkKhz=(\\d+)");
        Matcher bwMatcher = bwPattern.matcher(output);
        if (bwMatcher.find()) {
            builder.bandwidth(Integer.parseInt(bwMatcher.group(1)));
        }
        
        return builder.build();
    }

    /**
     * Parse GPS location from dumpsys output
     */
    private GpsLocation parseGpsLocation(String output) {
        // GPS provider
        Pattern gpsPattern = Pattern.compile("Location\\[gps\\s+([+-]?\\d+\\.\\d+),([+-]?\\d+\\.\\d+)");
        Matcher gpsMatcher = gpsPattern.matcher(output);
        if (gpsMatcher.find()) {
            return GpsLocation.builder()
                .latitude(Double.parseDouble(gpsMatcher.group(1)))
                .longitude(Double.parseDouble(gpsMatcher.group(2)))
                .build();
        }
        
        // Fused provider
        Pattern fusedPattern = Pattern.compile("Location\\[fused\\s+([+-]?\\d+\\.\\d+),([+-]?\\d+\\.\\d+)");
        Matcher fusedMatcher = fusedPattern.matcher(output);
        if (fusedMatcher.find()) {
            return GpsLocation.builder()
                .latitude(Double.parseDouble(fusedMatcher.group(1)))
                .longitude(Double.parseDouble(fusedMatcher.group(2)))
                .build();
        }
        
        // Network provider
        Pattern networkPattern = Pattern.compile("Location\\[network\\s+([+-]?\\d+\\.\\d+),([+-]?\\d+\\.\\d+)");
        Matcher networkMatcher = networkPattern.matcher(output);
        if (networkMatcher.find()) {
            return GpsLocation.builder()
                .latitude(Double.parseDouble(networkMatcher.group(1)))
                .longitude(Double.parseDouble(networkMatcher.group(2)))
                .build();
        }
        
        return GpsLocation.builder().latitude(0.0).longitude(0.0).build();
    }
}
