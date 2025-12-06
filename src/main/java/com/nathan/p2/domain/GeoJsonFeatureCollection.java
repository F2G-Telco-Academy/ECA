package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoJsonFeatureCollection {
    private String type = "FeatureCollection";
    private List<GeoJsonFeature> features;
    
    public GeoJsonFeatureCollection(List<GeoJsonFeature> features) {
        this.type = "FeatureCollection";
        this.features = features;
    }
}
