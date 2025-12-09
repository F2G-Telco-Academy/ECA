import { useEffect, useState, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface RealtimeClusteringMapProps {
  sessionId: string | null
  numClusters?: number
}

interface ClusterZone {
  clusterId: number
  centroidLat: number
  centroidLon: number
  pointCount: number
  quality: string
  color: string
  avgRsrp?: number
  avgRsrq?: number
  avgSinr?: number
}

interface ClusterUpdate {
  updateId: string
  sessionId: string
  timestamp: number
  zones: ClusterZone[]
  totalPoints: number
}

export default function RealtimeClusteringMap({ sessionId, numClusters = 4 }: RealtimeClusteringMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [zones, setZones] = useState<ClusterZone[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }]
      },
      center: [0, 0],
      zoom: 2
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    return () => {
      map.current?.remove()
    }
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const eventSource = new EventSource(
      `http://localhost:8080/api/clustering/session/${sessionId}/stream?numClusters=${numClusters}`
    )

    eventSource.addEventListener('cluster-update', (event) => {
      try {
        const update: ClusterUpdate = JSON.parse(event.data)
        setZones(update.zones)
        setTotalPoints(update.totalPoints)
        setLastUpdate(update.timestamp)
        updateMapMarkers(update.zones)
      } catch (error) {
        console.error('Failed to parse cluster update:', error)
      }
    })

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      eventSource.close()
    }

    eventSourceRef.current = eventSource

    return () => {
      eventSource.close()
    }
  }, [sessionId, numClusters])

  const updateMapMarkers = (newZones: ClusterZone[]) => {
    if (!map.current) return

    markers.current.forEach(marker => marker.remove())
    markers.current = []

    if (newZones.length === 0) return

    const bounds = new maplibregl.LngLatBounds()

    newZones.forEach(zone => {
      const el = document.createElement('div')
      el.className = 'cluster-marker'
      el.style.backgroundColor = zone.color
      el.style.width = `${Math.max(20, Math.min(60, zone.pointCount * 2))}px`
      el.style.height = `${Math.max(20, Math.min(60, zone.pointCount * 2))}px`
      el.style.borderRadius = '50%'
      el.style.border = '3px solid white'
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.color = 'white'
      el.style.fontWeight = 'bold'
      el.style.fontSize = '12px'
      el.textContent = zone.pointCount.toString()

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: bold; margin-bottom: 8px; color: ${zone.color};">
            Cluster ${zone.clusterId} - ${zone.quality}
          </div>
          <div style="font-size: 12px; line-height: 1.6;">
            <div><strong>Points:</strong> ${zone.pointCount}</div>
            ${zone.avgRsrp ? `<div><strong>Avg RSRP:</strong> ${zone.avgRsrp.toFixed(1)} dBm</div>` : ''}
            ${zone.avgRsrq ? `<div><strong>Avg RSRQ:</strong> ${zone.avgRsrq.toFixed(1)} dB</div>` : ''}
            ${zone.avgSinr ? `<div><strong>Avg SINR:</strong> ${zone.avgSinr.toFixed(1)} dB</div>` : ''}
          </div>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([zone.centroidLon, zone.centroidLat])
        .setPopup(popup)
        .addTo(map.current!)

      markers.current.push(marker)
      bounds.extend([zone.centroidLon, zone.centroidLat])
    })

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="font-bold text-sm mb-2">Network Quality Zones</h3>
        <div className="text-xs space-y-1 mb-3">
          <div>Total Points: {totalPoints}</div>
          <div>Clusters: {zones.length}</div>
          <div>Last Update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'N/A'}</div>
        </div>
        
        <div className="space-y-2">
          {zones.map(zone => (
            <div key={zone.clusterId} className="flex items-center text-xs">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: zone.color }}
              />
              <div className="flex-1">
                <div className="font-medium">{zone.quality}</div>
                <div className="text-gray-500">{zone.pointCount} points</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
