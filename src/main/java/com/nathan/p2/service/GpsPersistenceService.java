package com.nathan.p2.service;

import com.nathan.p2.domain.GpsTrace;
import com.nathan.p2.repository.GpsTraceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

/**
 * GPS Persistence Service
 * Saves GPS traces extracted from PCAP files to database
 * Links GPS data with KPI aggregates by timestamp proximity
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GpsPersistenceService {

    private final GpsTraceRepository gpsRepository;

    /**
     * Save GPS traces from extracted dataset to database
     * Filters dataset for entries with GPS coordinates
     */
    public Flux<GpsTrace> saveGpsTracesFromDataset(Long sessionId, List<Map<String, Object>> dataset) {
        log.info("Saving GPS traces for session {}: {} data points", sessionId, dataset.size());

        return Flux.fromIterable(dataset)
            .filter(this::hasGpsCoordinates)
            .map(point -> mapToGpsTrace(sessionId, point))
            .flatMap(gpsRepository::save)
            .doOnComplete(() -> log.info("GPS traces saved for session {}", sessionId))
            .doOnError(error -> log.error("Failed to save GPS traces for session {}", sessionId, error));
    }

    /**
     * Check if data point has valid GPS coordinates
     */
    private boolean hasGpsCoordinates(Map<String, Object> point) {
        return point.containsKey("latitude") &&
               point.containsKey("longitude") &&
               point.get("latitude") != null &&
               point.get("longitude") != null;
    }

    /**
     * Map data point to GpsTrace entity
     */
    private GpsTrace mapToGpsTrace(Long sessionId, Map<String, Object> point) {
        LocalDateTime timestamp = extractTimestamp(point);

        return GpsTrace.builder()
            .sessionId(sessionId)
            .timestamp(timestamp)
            .latitude(getDoubleValue(point, "latitude"))
            .longitude(getDoubleValue(point, "longitude"))
            .altitude(getDoubleValue(point, "altitude"))
            .speed(getDoubleValue(point, "speed"))
            .build();
    }

    /**
     * Extract timestamp from data point
     * Supports epoch seconds (double), milliseconds, and LocalDateTime
     * Handles both PCAP (epoch seconds) and GSMTAP (various formats)
     */
    private LocalDateTime extractTimestamp(Map<String, Object> point) {
        Object timestampObj = point.get("timestamp");

        if (timestampObj instanceof Number) {
            double timestampValue = ((Number) timestampObj).doubleValue();

            // Distinguish between seconds and milliseconds
            if (timestampValue > 1_000_000_000_000.0) {
                // Milliseconds since epoch
                long epochMillis = ((Number) timestampObj).longValue();
                return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
            } else {
                // Seconds since epoch (PCAP format with fractional seconds)
                long epochSeconds = (long) timestampValue;
                int nanos = (int) ((timestampValue - epochSeconds) * 1_000_000_000);
                return LocalDateTime.ofInstant(
                    Instant.ofEpochSecond(epochSeconds, nanos),
                    ZoneOffset.UTC
                );
            }
        } else if (timestampObj instanceof LocalDateTime) {
            return (LocalDateTime) timestampObj;
        } else if (timestampObj instanceof String) {
            // Try parsing ISO format
            try {
                return LocalDateTime.parse((String) timestampObj);
            } catch (Exception e) {
                log.warn("Failed to parse timestamp string: {}", timestampObj);
            }
        }

        // Fallback to current time
        log.warn("No valid timestamp found in data point, using current time");
        return LocalDateTime.now();
    }

    /**
     * Safely get double value from map
     */
    private Double getDoubleValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return null;
    }
}

