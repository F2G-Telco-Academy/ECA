package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import java.time.Instant;

/**
 * Domain entity representing a signaling message record.
 * Stores captured protocol messages from network traces.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("records")
public class Record {
    
    @Id
    private Long id;
    
    private Long sessionId;
    private Instant timestamp;
    private String protocol;      // RRC, NAS, MAC, RLC, PDCP, IP
    private String direction;     // UL, DL
    private String messageType;
    private String layer;         // L1, L2, L3
    private Integer frameNumber;
    private String hexData;
    private String decodedData;
    private Integer length;
}
