package com.nathan.p2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Consolidated KPI data structure matching frontend expectations.
 * Provides real-time network performance metrics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiDataDto {
    
    // Signal Quality Metrics
    private Double rsrp;           // Reference Signal Received Power (dBm)
    private Double rsrq;           // Reference Signal Received Quality (dB)
    private Double sinr;           // Signal-to-Interference-plus-Noise Ratio (dB)
    private Double rscp;           // Received Signal Code Power (dBm) - WCDMA
    private Double ecio;           // Ec/Io (dB) - WCDMA
    private Double rxlev;          // RX Level (dBm) - GSM
    private Double rxqual;         // RX Quality - GSM
    
    // Throughput Metrics
    private ThroughputDto throughput;
    
    // Cell Information
    private CellInfoDto servingCell;
    private CellInfoDto[] secondaryCells;
    
    // Connection State
    private String ueState;        // IDLE, CONNECTED, INACTIVE
    private String rat;            // LTE, NR, WCDMA, GSM
    
    // Success Rates (%)
    private Double rrcSuccessRate;
    private Double rachSuccessRate;
    private Double handoverSuccessRate;
    private Double erabSuccessRate;
    private Double attachSuccessRate;
    private Double tauSuccessRate;
    
    // Performance Metrics
    private Double latency;        // ms
    private Double packetLoss;     // %
    private Double jitter;         // ms
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThroughputDto {
        private Double dl;         // Downlink throughput (Mbps)
        private Double ul;         // Uplink throughput (Mbps)
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CellInfoDto {
        private Integer pci;       // Physical Cell ID
        private Integer earfcn;    // E-UTRA Absolute Radio Frequency Channel Number
        private Integer band;      // Frequency band
        private Integer bandwidth; // Channel bandwidth (MHz)
        private String duplexMode; // FDD, TDD
        private Integer scs;       // Subcarrier spacing (kHz) - NR only
        private Integer txBeamId;  // Transmit beam ID - NR only
    }
}
