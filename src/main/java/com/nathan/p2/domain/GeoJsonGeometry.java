package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoJsonGeometry {
    private String type = "Point";
    private double[] coordinates; // [longitude, latitude]
}
