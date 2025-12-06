package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GpsLocation {
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Float accuracy;
    private LocalDateTime timestamp;
}
