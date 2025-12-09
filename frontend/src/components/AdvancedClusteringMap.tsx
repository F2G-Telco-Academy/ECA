import { useEffect, useState, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface AdvancedClusteringMapProps {
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

interface ElbowData {
  sseValues: Record<number, number>
  optimalK: number
}

interface SilhouetteData {
  overallScore: number
  perClusterScores: Record<number, number>
}

interface Boundary {
  boundaries: Record<number, { points: number[][] }>
}

const COLOR_SCHEMES = {
  default: ['#33FF57', '#3186cc', '#FF5733', '#FF0000'],
  viridis: ['#440154', '#31688e', '#35b779', '#fde724'],
  plasma: ['#0d0887', '#7e03a8', '#cc4778', '#f89540'],
  cool: ['#00FFFF', '#0080FF', '#8000FF', '#FF00FF']
}

export default function AdvancedClusteringMap({ sessionId }: AdvancedClusteringMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  
  const [zones, setZones] = useState<ClusterZone[]>([])
  const [numClusters, setNumClusters] = useState(4)
  const [showClusters, setShowClusters] = useState(true)
  const [showBoundaries, setShowBoundaries] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [colorScheme, setColorScheme] = useState<keyof typeof COLOR_SCHEMES>('default')
  const [qualityFilter, setQualityFilter] = useState<string[]>(['Excellent', 'Good', 'Moderate', 'Poor'])
  
  const [elbowData, setElbowData] = useState<ElbowData | null>(null)
  const [silhouetteData, setSilhouetteData] = useState<SilhouetteData | null>(null)
  const [boundaries, setBoundaries] = useState<Boundary | null>(null)
  
  const [showElbowChart, setShowElbowChart] = useState(false)
  const [showSilhouettePanel, setShowSilhouettePanel] = useState(false)
  
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
            attribution: '© OpenStreetMap'
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

    if (showClusters) {
      const eventSource = new EventSource(
        `http://localhost:8080/api/clustering/session/${sessionId}/stream?numClusters=${numClusters}`
      )

      eventSource.addEventListener('cluster-update', (event) => {
        try {
          const update = JSON.parse(event.data)
          const coloredZones = update.zones.map((z: ClusterZone, idx: number) => ({
            ...z,
            color: COLOR_SCHEMES[colorScheme][idx % COLOR_SCHEMES[colorScheme].length]
          }))
          setZones(coloredZones)
          updateMapMarkers(coloredZones)
        } catch (error) {
          console.error('Failed to parse cluster update:', error)
        }
      })

      eventSourceRef.current = eventSource
      return () => eventSource.close()
    }
  }, [sessionId, showClusters, numClusters, colorScheme])

  useEffect(() => {
    if (!sessionId) return
    
    fetch(`http://localhost:8080/api/clustering/session/${sessionId}/elbow-method?maxK=10`)
      .then(res => res.json())
      .then(data => setElbowData(data))
      .catch(err => console.error('Failed to fetch elbow data:', err))
    
    fetch(`http://localhost:8080/api/clustering/session/${sessionId}/silhouette?numClusters=${numClusters}`)
      .then(res => res.json())
      .then(data => setSilhouetteData(data))
      .catch(err => console.error('Failed to fetch silhouette data:', err))
  }, [sessionId, numClusters])

  useEffect(() => {
    if (!sessionId || !showBoundaries) return
    
    fetch(`http://localhost:8080/api/clustering/session/${sessionId}/boundaries?numClusters=${numClusters}`)
      .then(res => res.json())
      .then(data => {
        setBoundaries(data)
        drawBoundaries(data)
      })
      .catch(err => console.error('Failed to fetch boundaries:', err))
  }, [sessionId, showBoundaries, numClusters])

  useEffect(() => {
    if (!sessionId || !showHeatmap || !map.current) return
    
    fetch(`http://localhost:8080/api/clustering/session/${sessionId}/heatmap?gridSize=50`)
      .then(res => res.json())
      .then(data => drawHeatmap(data))
      .catch(err => console.error('Failed to fetch heatmap:', err))
  }, [sessionId, showHeatmap])

  const updateMapMarkers = (newZones: ClusterZone[]) => {
    if (!map.current) return

    markers.current.forEach(marker => marker.remove())
    markers.current = []

    const filteredZones = newZones.filter(z => qualityFilter.includes(z.quality))

    filteredZones.forEach(zone => {
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

  const drawBoundaries = (boundaryData: Boundary) => {
    if (!map.current) return

    Object.entries(boundaryData.boundaries).forEach(([clusterId, boundary]) => {
      const sourceId = `boundary-${clusterId}`
      
      if (map.current!.getSource(sourceId)) {
        map.current!.removeLayer(`${sourceId}-fill`)
        map.current!.removeLayer(`${sourceId}-line`)
        map.current!.removeSource(sourceId)
      }

      const coordinates = boundary.points.map(p => [p[1], p[0]])
      coordinates.push(coordinates[0])

      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          },
          properties: {}
        }
      })

      map.current!.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': COLOR_SCHEMES[colorScheme][parseInt(clusterId) % COLOR_SCHEMES[colorScheme].length],
          'fill-opacity': 0.2
        }
      })

      map.current!.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': COLOR_SCHEMES[colorScheme][parseInt(clusterId) % COLOR_SCHEMES[colorScheme].length],
          'line-width': 2
        }
      })
    })
  }

  const drawHeatmap = (heatmapData: any) => {
    // Heatmap implementation would go here
    console.log('Heatmap data:', heatmapData)
  }

  const exportCsv = async () => {
    if (!sessionId) return
    const response = await fetch(`http://localhost:8080/api/clustering/session/${sessionId}/export/csv?numClusters=${numClusters}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clusters_${sessionId}.csv`
    a.click()
  }

  const exportGeoJson = async () => {
    if (!sessionId) return
    const response = await fetch(`http://localhost:8080/api/clustering/session/${sessionId}/export/geojson?numClusters=${numClusters}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clusters_${sessionId}.geojson`
    a.click()
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Advanced Clustering</h3>
          <div className="text-xs text-slate-400">
            Zones: {zones.length} | Silhouette: {silhouetteData?.overallScore.toFixed(3) || 'N/A'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={numClusters}
            onChange={(e) => setNumClusters(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white"
          >
            {[2,3,4,5,6,7,8].map(k => (
              <option key={k} value={k}>{k} Clusters</option>
            ))}
          </select>

          <select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value as keyof typeof COLOR_SCHEMES)}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white"
          >
            <option value="default">Default</option>
            <option value="viridis">Viridis</option>
            <option value="plasma">Plasma</option>
            <option value="cool">Cool</option>
          </select>

          <button
            onClick={() => setShowElbowChart(!showElbowChart)}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
          >
            Elbow Chart
          </button>

          <button
            onClick={() => setShowSilhouettePanel(!showSilhouettePanel)}
            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
          >
            Silhouette
          </button>

          <button
            onClick={exportCsv}
            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
          >
            Export CSV
          </button>

          <button
            onClick={exportGeoJson}
            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
          >
            Export GeoJSON
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />

        <div className="absolute top-4 left-4 bg-slate-800 rounded-lg shadow-lg p-4 max-w-xs">
          <h4 className="font-bold text-sm mb-2 text-white">Controls</h4>
          
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={showClusters}
                onChange={(e) => setShowClusters(e.target.checked)}
                className="rounded"
              />
              Show Clusters
            </label>

            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={showBoundaries}
                onChange={(e) => setShowBoundaries(e.target.checked)}
                className="rounded"
              />
              Show Boundaries
            </label>

            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="rounded"
              />
              Show Heatmap
            </label>
          </div>

          <div className="mt-4">
            <h5 className="font-semibold text-xs mb-2 text-white">Filter by Quality</h5>
            {['Excellent', 'Good', 'Moderate', 'Poor'].map(quality => (
              <label key={quality} className="flex items-center gap-2 text-xs text-white">
                <input
                  type="checkbox"
                  checked={qualityFilter.includes(quality)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setQualityFilter([...qualityFilter, quality])
                    } else {
                      setQualityFilter(qualityFilter.filter(q => q !== quality))
                    }
                  }}
                  className="rounded"
                />
                {quality}
              </label>
            ))}
          </div>
        </div>

        {showElbowChart && elbowData && (
          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg shadow-lg p-4 w-80">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm text-white">Elbow Method</h4>
              <button
                onClick={() => setShowElbowChart(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-slate-300 mb-2">
              Optimal K: {elbowData.optimalK}
            </div>
            <svg width="280" height="150" className="bg-slate-700 rounded">
              {Object.entries(elbowData.sseValues).map(([k, sse], idx, arr) => {
                if (idx === arr.length - 1) return null
                const x1 = 40 + (idx * 220 / (arr.length - 1))
                const x2 = 40 + ((idx + 1) * 220 / (arr.length - 1))
                const maxSse = Math.max(...Object.values(elbowData.sseValues))
                const y1 = 130 - (sse / maxSse * 100)
                const y2 = 130 - (arr[idx + 1][1] / maxSse * 100)
                return (
                  <line
                    key={k}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>
          </div>
        )}

        {showSilhouettePanel && silhouetteData && (
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg shadow-lg p-4 w-64">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm text-white">Silhouette Scores</h4>
              <button
                onClick={() => setShowSilhouettePanel(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-slate-300 mb-2">
              Overall: {silhouetteData.overallScore.toFixed(3)}
            </div>
            <div className="space-y-1">
              {Object.entries(silhouetteData.perClusterScores).map(([cluster, score]) => (
                <div key={cluster} className="flex justify-between text-xs text-slate-300">
                  <span>Cluster {cluster}:</span>
                  <span>{score.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
