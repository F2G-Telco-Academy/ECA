package com.nathan.p2.service;

import com.nathan.p2.domain.CellInfo;
import com.nathan.p2.domain.GpsLocation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class GpsTrackingService {

    private final AdbCommandExecutor adbExecutor;

    public Mono<GpsLocation> getGpsLocation(String deviceId) {
        String[] command = deviceId != null 
            ? new String[]{"adb", "-s", deviceId, "shell", "dumpsys", "location"}
            : new String[]{"adb", "shell", "dumpsys", "location"};
            
        return adbExecutor.execute(command)
            .map(this::parseGpsLocation)
            .doOnNext(loc -> log.debug("GPS Location: {}", loc))
            .onErrorResume(e -> {
                log.error("Failed to get GPS location: {}", e.getMessage());
                return Mono.empty();
            });
    }

    public Mono<CellInfo> getCellInfo(String deviceId) {
        String[] command = deviceId != null
            ? new String[]{"adb", "-s", deviceId, "shell", "dumpsys", "telephony.registry"}
            : new String[]{"adb", "shell", "dumpsys", "telephony.registry"};
            
        return adbExecutor.execute(command)
            .map(this::parseCellInfo)
            .doOnNext(info -> log.debug("Cell Info: {}", info))
            .onErrorResume(e -> {
                log.error("Failed to get cell info: {}", e.getMessage());
                return Mono.empty();
            });
    }

    private GpsLocation parseGpsLocation(String output) {
        // Pattern: Location[gps 3.827569,11.521969 acc=20.0 et=+18h0m0s0ms alt=750.0]
        Pattern pattern = Pattern.compile("Location\\[gps ([\\d.-]+),([\\d.-]+)(?:\\s+acc=([\\d.]+))?(?:.*alt=([\\d.]+))?");
        Matcher matcher = pattern.matcher(output);
        
        if (matcher.find()) {
            return GpsLocation.builder()
                .latitude(Double.parseDouble(matcher.group(1)))
                .longitude(Double.parseDouble(matcher.group(2)))
                .accuracy(matcher.group(3) != null ? Float.parseFloat(matcher.group(3)) : null)
                .altitude(matcher.group(4) != null ? Double.parseDouble(matcher.group(4)) : null)
                .timestamp(LocalDateTime.now())
                .build();
        }
        
        log.warn("No GPS location found in output");
        return null;
    }

    private CellInfo parseCellInfo(String output) {
        CellInfo info = CellInfo.builder().build();
        
        // MCC/MNC
        Matcher mccMnc = Pattern.compile("mMcc=(\\d+)\\s+mMnc=(\\d+)").matcher(output);
        if (mccMnc.find()) {
            info.setMcc(mccMnc.group(1));
            info.setMnc(mccMnc.group(2));
        } else {
            // Try alternative pattern
            Matcher numeric = Pattern.compile("mOperatorNumeric=(\\d{5,6})").matcher(output);
            if (numeric.find()) {
                String num = numeric.group(1);
                if (num.length() >= 5) {
                    info.setMcc(num.substring(0, 3));
                    info.setMnc(num.substring(3));
                }
            }
        }
        
        // LAC
        Matcher lac = Pattern.compile("mLac=(\\*?\\d+)").matcher(output);
        if (lac.find()) {
            info.setLac(lac.group(1));
        }
        
        // CID
        Matcher cid = Pattern.compile("mCid=(\\d+\\**)").matcher(output);
        if (cid.find()) {
            info.setCid(cid.group(1));
        }
        
        // PSC/PCI
        Matcher psc = Pattern.compile("mPsc=(\\d+)").matcher(output);
        if (psc.find()) {
            info.setPci(Integer.parseInt(psc.group(1)));
        }
        
        // UARFCN
        Matcher uarfcn = Pattern.compile("mUarfcn=(\\d+)").matcher(output);
        if (uarfcn.find()) {
            info.setUarfcn(uarfcn.group(1));
        }
        
        // RAT
        if (output.contains("UMTS") || output.contains("WCDMA")) {
            info.setRat("UMTS/WCDMA");
        } else if (output.contains("HSPA+")) {
            info.setRat("HSPA+");
        } else if (output.contains("HSPA")) {
            info.setRat("HSPA");
        } else if (output.contains("LTE")) {
            info.setRat("LTE");
        } else if (output.contains("NR")) {
            info.setRat("5G NR");
        }
        
        // RSRP - try WCDMA first
        Matcher wcdmaRsrp = Pattern.compile("rscp=(-?\\d+)").matcher(output);
        if (wcdmaRsrp.find()) {
            info.setRsrp(Integer.parseInt(wcdmaRsrp.group(1)));
        } else {
            // Try LTE RSRP
            Matcher lteRsrp = Pattern.compile("lteRsrp(?:=|:)\\s*(-?\\d+)").matcher(output);
            if (lteRsrp.find()) {
                info.setRsrp(Integer.parseInt(lteRsrp.group(1)));
            }
        }
        
        // RSRQ
        Matcher rsrq = Pattern.compile("lteRsrq(?:=|:)\\s*(-?\\d+)").matcher(output);
        if (rsrq.find()) {
            info.setRsrq(Integer.parseInt(rsrq.group(1)));
        }
        
        // RSSI
        Matcher rssi = Pattern.compile("mRssi=(-?\\d+)").matcher(output);
        if (rssi.find()) {
            info.setRssi(Integer.parseInt(rssi.group(1)));
        }
        
        info.setOperatorName("Unknown");
        if ("624".equals(info.getMcc()) && "01".equals(info.getMnc())) {
            info.setOperatorName("MTN Cameroon");
        } else if ("624".equals(info.getMcc()) && "02".equals(info.getMnc())) {
            info.setOperatorName("Orange Cameroon");
        }
        
        return info;
    }
}
