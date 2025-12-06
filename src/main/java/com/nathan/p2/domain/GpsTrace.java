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
@Table("gps_traces")
public class GpsTrace {
    @Id
    private Long id;
    private Long sessionId;
    private LocalDateTime timestamp;
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double speed;
}
