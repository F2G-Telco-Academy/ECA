import { useEffect, useState, useRef } from 'react'
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { api } from '@/utils/api'

interface MapViewProps {
  sessionId: string | null
}

interface MapData {
  trace: Array<{ lat: number; lon: number; timestamp: string; rsrp?: number; rsrq?: number }>
  anomalies: Array<{ lat: number; lon: number; type: string; severity: string; details?: string }>
  kpiOverlay: Array<{ lat: number; lon: number; rsrp: number; rsrq: number; sinr?: number }>
}

export default function MapView({ sessionId }: MapViewProps) {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [showTrace, setShowTrace] = useState(true)
  const [showRsrp, setShowRsrp] = useState(false)
  const [showAnomalies, setShowAnomalies] = useState(true)
  const [viewport, setViewport] = useState({
    latitude: 0,
    longitude: 0,
    zoom: 12
  })

  useEffect(() => {
    if (!sessionId) return

    api.getMapData(sessionId)
      .then(data => {
        setMapData(data)
        if (data.trace.length > 0) {
          setViewport({
            latitude: data.trace[0].lat,
            longitude: data.trace[0].lon,
            zoom: 14
          })
        }
      })
      .catch(console.error)
  }, [sessionId])

  if (!sessionId) {
    return <div className="p-4 text-center text-gray-400">Select a session to view map</div>
  }

  const traceGeoJSON = mapData?.trace ? {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: mapData.trace.map(p => [p.lon, p.lat])
    }
  } : null

  const getRsrpColor = (rsrp: number) => {
    if (rsrp >= -80) return '#00ff00'
    if (rsrp >= -90) return '#ffff00'
    if (rsrp >= -100) return '#ff9900'
    return '#ff0000'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ff0000'
      case 'high': return '#ff6600'
      case 'medium': return '#ffcc00'
      default: return '#ffff00'
    }
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      <div className="p-2 flex gap-2 bg-gray-800 border-b border-gray-700">
        <button 
          onClick={() => setShowTrace(!showTrace)}
          className={`px-3 py-1 rounded text-sm ${showTrace ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          GPS Trace
        </button>
        <button 
          onClick={() => setShowRsrp(!showRsrp)}
          className={`px-3 py-1 rounded text-sm ${showRsrp ? 'bg-green-600' : 'bg-gray-700'}`}
        >
          RSRP Overlay
        </button>
        <button 
          onClick={() => setShowAnomalies(!showAnomalies)}
          className={`px-3 py-1 rounded text-sm ${showAnomalies ? 'bg-red-600' : 'bg-gray-700'}`}
        >
          Anomalies ({mapData?.anomalies.length || 0})
        </button>
        <div className="ml-auto text-sm text-gray-400">
          Points: {mapData?.trace.length || 0}
        </div>
      </div>
      
      <div className="flex-1 relative">
        <Map
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://demotiles.maplibre.org/style.json"
        >
          <NavigationControl position="top-right" />

          {showTrace && traceGeoJSON && (
            <Source id="trace" type="geojson" data={traceGeoJSON as any}>
              <Layer
                id="trace-line"
                type="line"
                paint={{
                  'line-color': '#00aaff',
                  'line-width': 3,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}

          {showRsrp && mapData?.kpiOverlay.map((point, idx) => (
            <Marker
              key={`rsrp-${idx}`}
              latitude={point.lat}
              longitude={point.lon}
            >
              <div 
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: getRsrpColor(point.rsrp) }}
                title={`RSRP: ${point.rsrp} dBm`}
              />
            </Marker>
          ))}

          {showAnomalies && mapData?.anomalies.map((anomaly, idx) => (
            <Marker
              key={`anomaly-${idx}`}
              latitude={anomaly.lat}
              longitude={anomaly.lon}
            >
              <div 
                className="relative"
                title={`${anomaly.type} (${anomaly.severity})`}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse"
                  style={{ backgroundColor: getSeverityColor(anomaly.severity) }}
                >
                  !
                </div>
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  )
}
