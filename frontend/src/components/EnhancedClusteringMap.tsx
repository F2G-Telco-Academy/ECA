'use client';

import { useEffect, useState } from 'react';

interface Props {
  sessionId: number;
}

export default function EnhancedClusteringMap({ sessionId }: Props) {
  const [mapData, setMapData] = useState<any>(null);

  useEffect(() => {
    fetchMapData();
  }, [sessionId]);

  const fetchMapData = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/sessions/${sessionId}/map`);
      const data = await res.json();
      setMapData(data);
    } catch (error) {
      console.error('Map data fetch failed');
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg border border-gray-800 flex items-center justify-center relative overflow-hidden">
      {!mapData ? (
        <div className="text-xs text-gray-600">Loading map data...</div>
      ) : (
        <>
          {/* Map placeholder - integrate with actual map library */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          
          {/* Legend */}
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur rounded-lg p-3 border border-gray-700">
            <div className="text-xs font-semibold text-gray-400 mb-2">Signal Quality</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400">Excellent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-lime-500" />
                <span className="text-xs text-gray-400">Good</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs text-gray-400">Fair</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-400">Poor</span>
              </div>
            </div>
          </div>

          {/* Center message */}
          <div className="relative z-10 text-center">
            <div className="text-sm text-gray-500 mb-2">Map Visualization</div>
            <div className="text-xs text-gray-700">Integrate with Leaflet or Google Maps</div>
          </div>
        </>
      )}
    </div>
  );
}
