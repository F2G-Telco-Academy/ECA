#!/usr/bin/env python3
"""
GPS Trajectory Tracker for Samsung Device
Stores GPS history for movement visualization
"""

import json
import time
from datetime import datetime
from typing import List, Dict

class GPSTracker:
    """Track GPS coordinates and movement history"""
    
    def __init__(self, max_history=100):
        self.max_history = max_history
        self.gps_history = []
        self.current_position = None
        
    def add_position(self, lat: float, lon: float) -> Dict:
        """Add new GPS position and detect movement"""
        timestamp = datetime.utcnow().isoformat()
        
        # Calculate movement if we have previous position
        movement_detected = False
        distance_moved = 0.0
        speed_mps = 0.0
        
        if self.current_position:
            # Calculate distance using Haversine formula (simplified)
            lat_diff = lat - self.current_position['lat']
            lon_diff = lon - self.current_position['lon']
            distance_moved = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111000  # Rough meters
            
            # Calculate time difference
            time_diff = time.time() - self.current_position['timestamp']
            if time_diff > 0:
                speed_mps = distance_moved / time_diff
            
            # Movement threshold: 5 meters
            movement_detected = distance_moved > 5.0
        
        # Create position record
        position = {
            'timestamp': time.time(),
            'datetime': timestamp,
            'lat': lat,
            'lon': lon,
            'movement_detected': movement_detected,
            'distance_moved': distance_moved,
            'speed_mps': speed_mps
        }
        
        # Add to history
        self.gps_history.append(position)
        
        # Keep only recent history
        if len(self.gps_history) > self.max_history:
            self.gps_history = self.gps_history[-self.max_history:]
        
        # Update current position
        self.current_position = position
        
        return position
    
    def get_trajectory(self) -> List[Dict]:
        """Get GPS trajectory for mapping"""
        return self.gps_history
    
    def get_current_metrics(self) -> Dict:
        """Get current GPS metrics for Prometheus"""
        if not self.current_position:
            return {}
        
        return {
            'gps_latitude': self.current_position['lat'],
            'gps_longitude': self.current_position['lon'],
            'movement_detected': 1 if self.current_position['movement_detected'] else 0,
            'distance_moved_meters': self.current_position['distance_moved'],
            'speed_mps': self.current_position['speed_mps'],
            'trajectory_points': len(self.gps_history)
        }
    
    def export_trajectory_geojson(self) -> str:
        """Export trajectory as GeoJSON for advanced mapping"""
        if len(self.gps_history) < 2:
            return json.dumps({"type": "FeatureCollection", "features": []})
        
        # Create line string from trajectory
        coordinates = [[pos['lon'], pos['lat']] for pos in self.gps_history]
        
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates
                    },
                    "properties": {
                        "name": "Samsung Device Trajectory",
                        "total_points": len(self.gps_history),
                        "start_time": self.gps_history[0]['datetime'],
                        "end_time": self.gps_history[-1]['datetime']
                    }
                }
            ]
        }
        
        return json.dumps(geojson, indent=2)

# Example usage
if __name__ == "__main__":
    tracker = GPSTracker()
    
    # Simulate movement
    positions = [
        (3.927719, 11.521987),  # Starting position
        (3.927720, 11.521988),  # Small movement
        (3.927725, 11.521995),  # Larger movement
    ]
    
    for lat, lon in positions:
        result = tracker.add_position(lat, lon)
        print(f"Position: {lat}, {lon}")
        print(f"Movement: {result['movement_detected']}")
        print(f"Distance: {result['distance_moved']:.2f}m")
        print("---")
    
    print("Trajectory GeoJSON:")
    print(tracker.export_trajectory_geojson())
