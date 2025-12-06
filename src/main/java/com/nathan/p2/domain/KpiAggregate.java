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
}
