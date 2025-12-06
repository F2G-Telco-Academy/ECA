package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoJsonFeature {
    private String type = "Feature";
    private GeoJsonGeometry geometry;
    private Map<String, Object> properties;
}
