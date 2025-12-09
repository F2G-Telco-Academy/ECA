package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("KPI_AGGREGATES")
public class KpiAggregate {
    @Id
    private Long id;
    private Long sessionId;
    private LocalDateTime timestamp;
    private String metric;
    private LocalDateTime windowStart;
    private LocalDateTime windowEnd;
    private Double minValue;
    private Double avgValue;
    private Double maxValue;
    private String rat;
    private Double latitude;
    private Double longitude;
    private String cellId;
    private Integer pci;
    
    // LTE/5G NR KPIs
    private Double rsrp;
    private Double rsrq;
    private Double sinr;
    private Double rssi;
    private Integer cqi;
    private Double dlThroughput;
    private Double ulThroughput;
    
    // WCDMA KPIs
    private Double rscp;
    private Double ecno;
    
    // GSM KPIs
    private Double rxlev;
    private Double rxqual;
    
    // Additional fields
    private Integer earfcn;
    private Integer band;
    private String duplexMode;
    private Integer servingTxBeamId;
    private Integer scs;
}
