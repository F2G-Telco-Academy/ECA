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
@Table("ANOMALIES")
public class Anomaly {
    @Id
    private Long id;
    private Long sessionId;
    private AnomalyCategory category;
    private String severity;
    private LocalDateTime timestamp;
    private Double latitude;
    private Double longitude;
    private String detailsJson;
}
