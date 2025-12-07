package com.nathan.p2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * Data Transfer Object for signaling message records.
 * Represents a captured protocol message with metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordDto {
    private Long id;
    private Long sessionId;
    private Instant timestamp;
    private String protocol;      // RRC, NAS, MAC, RLC, PDCP, IP
    private String direction;     // UL, DL
    private String messageType;   // e.g., "RRC Connection Setup", "Attach Request"
    private String layer;         // L1, L2, L3
    private Integer frameNumber;
    private String hexData;       // Raw hex dump
    private String decodedData;   // Human-readable decoded message
    private Integer length;
}
