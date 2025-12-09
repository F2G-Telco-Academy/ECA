import { useEffect, useState, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface GPSMapWithClusteringProps {
  sessionId: string | null
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

interface GPSPoint {
  latitude: number
  longitude: number
  rsrp: number
  rsrq: number
  sinr: number
  timestamp: string
}

export default function GPSMapWithClustering({ sessionId }: GPSMapWithClusteringProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [zones, setZones] = useState<ClusterZone[]>([])
  const [points, setPoints] = useState<GPSPoint[]>([])
  const [showClusters, setShowClusters] = useState(true)
  const [numClusters, setNumClusters] = useState(4)
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

    const fetchMapData = async () => {
      try {
        const mapResponse = await fetch(`http://localhost:8080/api/sessions/${sessionId}/map`)
        
        if (mapResponse.ok) {
          const mapData = await mapResponse.json()
          setPoints(mapData.points || [])
          
          if (mapData.points && mapData.points.length > 0) {
            const bounds = new maplibregl.LngLatBounds()
            mapData.points.forEach((p: GPSPoint) => {
              bounds.extend([p.longitude, p.latitude])
            })
            map.current?.fitBounds(bounds, { padding: 50 })
          }
        }
      } catch (err) {
        console.error('Failed to fetch map data:', err)
      }
    }

    fetchMapData()

    if (showClusters) {
      const eventSource = new EventSource(
        `http://localhost:8080/api/clustering/session/${sessionId}/stream?numClusters=${numClusters}`
      )

      eventSource.addEventListener('cluster-update', (event) => {
        try {
          const update: ClusterUpdate = JSON.parse(event.data)
          setZones(update.zones)
          updateMapMarkers(update.zones)
        } catch (error) {
          console.error('Failed to parse cluster update:', error)
        }
      })

      eventSource.onerror = () => {
        eventSource.close()
      }

      eventSourceRef.current = eventSource

      return () => {
        eventSource.close()
      }
    }
  }, [sessionId, showClusters, numClusters])

  const updateMapMarkers = (newZones: ClusterZone[]) => {
    if (!map.current) return

    markers.current.forEach(marker => marker.remove())
    markers.current = []

    if (newZones.length === 0) return

    newZones.forEach(zone => {
      const el = document.createElement('div')
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
        <div style="padding: 8px;">
          <div style="font-weight: bold; color: ${zone.color};">
            Cluster ${zone.clusterId} - ${zone.quality}
          </div>
          <div style="font-size: 12px;">
            <div>Points: ${zone.pointCount}</div>
            ${zone.avgRsrp ? `<div>Avg RSRP: ${zone.avgRsrp.toFixed(1)} dBm</div>` : ''}
            ${zone.avgRsrq ? `<div>Avg RSRQ: ${zone.avgRsrq.toFixed(1)} dB</div>` : ''}
            ${zone.avgSinr ? `<div>Avg SINR: ${zone.avgSinr.toFixed(1)} dB</div>` : ''}
          </div>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([zone.centroidLon, zone.centroidLat])
        .setPopup(popup)
        .addTo(map.current!)

      markers.current.push(marker)
    })
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">GPS Network Quality Map</h3>
          <div className="text-xs text-slate-400">
            Points: {points.length} | Zones: {zones.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
              className="rounded"
            />
            Show Clusters
          </label>

          <select
            value={numClusters}
            onChange={(e) => setNumClusters(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white"
          >
            <option value={2}>2 Clusters</option>
            <option value={3}>3 Clusters</option>
            <option value={4}>4 Clusters</option>
            <option value={5}>5 Clusters</option>
            <option value={6}>6 Clusters</option>
          </select>
        </div>
      </div>

      <div ref={mapContainer} className="flex-1" />

      <div className="flex items-center justify-between p-2 bg-slate-800 border-t border-slate-700 text-xs">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-400">Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-400">Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-400">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-400">Poor</span>
          </div>
        </div>
        <span className="text-slate-500">Real-time K-means Clustering</span>
      </div>
    </div>
  )
}
