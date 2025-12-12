package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
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
@Table("RECORDS")
public class Record {
    
    @Id
    private Long id;
    
    @Column("SESSION_ID")
    private Long sessionId;

    @Column("TIMESTAMP")
    private Instant timestamp;

    private String protocol;      // RRC, NAS, MAC, RLC, PDCP, IP
    private String direction;     // UL, DL

    @Column("MESSAGE_TYPE")
    private String messageType;

    private String layer;         // L1, L2, L3

    private String rat;           // LTE / NR / WCDMA ...

    @Column("FRAME_NUMBER")
    private Integer frameNumber;

    @Column("HEX_DATA")
    private String hexData;

    @Column("DECODED_DATA")
    private String decodedData;

    @Column("PAYLOAD_JSON")
    private String payloadJson;

    private Integer length;
}
