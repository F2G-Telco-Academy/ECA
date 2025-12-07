#!/usr/bin/env python3
"""
GPS Map Visualization Generator
Generates interactive Folium HTML maps from clustered KPI data
"""

import json
import sys
import folium
from folium.plugins import MarkerCluster, HeatMap

def generate_map(geojson_path, output_path, map_type='cluster'):
    """Generate interactive map from GeoJSON data"""
    
    with open(geojson_path, 'r') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    if not features:
        print("No features found in GeoJSON")
        return
    
    # Calculate center
    lats = [f['geometry']['coordinates'][1] for f in features]
    lons = [f['geometry']['coordinates'][0] for f in features]
    center_lat = sum(lats) / len(lats)
    center_lon = sum(lons) / len(lons)
    
    # Create map
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=13,
        tiles='OpenStreetMap'
    )
    
    if map_type == 'cluster':
        _add_cluster_markers(m, features)
    elif map_type == 'heatmap':
        _add_heatmap(m, features)
    else:
        _add_simple_markers(m, features)
    
    # Add legend
    _add_legend(m)
    
    # Save
    m.save(output_path)
    print(f"Map saved to {output_path}")

def _add_cluster_markers(m, features):
    """Add clustered markers with tooltips"""
    marker_cluster = MarkerCluster().add_to(m)
    
    for feature in features:
        coords = feature['geometry']['coordinates']
        props = feature['properties']
        
        lat, lon = coords[1], coords[0]
        cluster = props.get('cluster', 0)
        color = props.get('color', '#808080')
        
        # Build tooltip
        tooltip = f"""
        <b>Cluster {cluster}</b><br>
        RSRP: {props.get('rsrp', 'N/A')} dBm<br>
        RSRQ: {props.get('rsrq', 'N/A')} dB<br>
        SINR: {props.get('sinr', 'N/A')} dB<br>
        CQI: {props.get('cqi', 'N/A')}<br>
        RSSI: {props.get('rssi', 'N/A')} dBm<br>
        RAT: {props.get('rat', 'N/A')}<br>
        Cell ID: {props.get('cellId', 'N/A')}<br>
        Time: {props.get('timestamp', 'N/A')}
        """
        
        folium.CircleMarker(
            location=[lat, lon],
            radius=6,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.7,
            tooltip=tooltip
        ).add_to(marker_cluster)

def _add_heatmap(m, features):
    """Add heatmap layer based on RSRP values"""
    heat_data = []
    for feature in features:
        coords = feature['geometry']['coordinates']
        props = feature['properties']
        rsrp = props.get('rsrp', -120)
        
        # Normalize RSRP to intensity (0-1)
        intensity = (rsrp + 120) / 40  # -120 to -80 dBm range
        intensity = max(0, min(1, intensity))
        
        heat_data.append([coords[1], coords[0], intensity])
    
    HeatMap(heat_data, radius=15, blur=25).add_to(m)

def _add_simple_markers(m, features):
    """Add simple markers without clustering"""
    for feature in features:
        coords = feature['geometry']['coordinates']
        props = feature['properties']
        
        lat, lon = coords[1], coords[0]
        color = props.get('color', '#808080')
        
        folium.CircleMarker(
            location=[lat, lon],
            radius=5,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.6
        ).add_to(m)

def _add_legend(m):
    """Add legend to map"""
    legend_html = """
    <div style="position: fixed; 
                bottom: 50px; left: 50px; width: 220px; height: 160px; 
                background-color: white; z-index:9999; font-size:14px;
                border:2px solid grey; border-radius:6px; padding: 10px;">
        <h4 style="margin-top:0">Coverage Clusters</h4>
        <i style="background:#FF0000;width:12px;height:12px;display:inline-block;border-radius:50%"></i> Cluster 0 (Poor)<br>
        <i style="background:#FF5733;width:12px;height:12px;display:inline-block;border-radius:50%"></i> Cluster 1 (Moderate)<br>
        <i style="background:#3186cc;width:12px;height:12px;display:inline-block;border-radius:50%"></i> Cluster 2 (Good)<br>
        <i style="background:#33FF57;width:12px;height:12px;display:inline-block;border-radius:50%"></i> Cluster 3 (Excellent)<br>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python map_generator.py <geojson_path> <output_path> [map_type]")
        sys.exit(1)
    
    geojson_path = sys.argv[1]
    output_path = sys.argv[2]
    map_type = sys.argv[3] if len(sys.argv) > 3 else 'cluster'
    
    generate_map(geojson_path, output_path, map_type)
