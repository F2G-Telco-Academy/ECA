import { useState, useEffect, useRef } from 'react'
import { api } from '@/utils/api'

interface Props {
  pcapPath: string
}

interface ClusterData {
  clusterId: number
  pointCount: number
  avgRsrp: number
  avgRsrq: number
  quality: string
  color: string
}

interface DataPoint {
  latitude: number
  longitude: number
  RSRP: number
  RSRQ: number
  cluster?: number
}

export default function ProductionGPSClusteringMap({ pcapPath }: Props) {
  const [gpsData, setGpsData] = useState<DataPoint[]>([])
  const [clusteringResult, setClusteringResult] = useState<any>(null)
  const [numClusters, setNumClusters] = useState(4)
  const [loading, setLoading] = useState(false)
  const [optimalK, setOptimalK] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!pcapPath) return
    loadData()
  }, [pcapPath])

  const loadData = async () => {
    setLoading(true)
    try {
      // Extract GPS traces
      const traces = await api.extractGpsTraces(pcapPath)
      setGpsData(traces)

      // Find optimal K
      const elbowResult = await api.findOptimalK(pcapPath, 10)
      setOptimalK(elbowResult.optimalK)
      setNumClusters(elbowResult.optimalK)

      // Perform clustering
      await performClustering(elbowResult.optimalK)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const performClustering = async (k: number = numClusters) => {
    setLoading(true)
    try {
      const result = await api.performClustering(pcapPath, k)
      setClusteringResult(result)
      
      // Update GPS data with cluster labels
      const updatedData = gpsData.map((point, idx) => ({
        ...point,
        cluster: result.clusterLabels[idx]
      }))
      setGpsData(updatedData)
      
      // Draw visualization
      drawClusters(updatedData, result)
    } catch (error) {
      console.error('Clustering failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const drawClusters = (data: DataPoint[], result: any) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Find bounds
    const lats = data.map(d => d.latitude).filter(l => l != null)
    const lons = data.map(d => d.longitude).filter(l => l != null)
    
    if (lats.length === 0 || lons.length === 0) return

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    // Scale to canvas
    const scaleX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * (canvas.width - 40) + 20
    const scaleY = (lat: number) => canvas.height - (((lat - minLat) / (maxLat - minLat)) * (canvas.height - 40) + 20)

    // Cluster colors
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

    // Draw points
    data.forEach(point => {
      if (point.latitude == null || point.longitude == null) return

      const x = scaleX(point.longitude)
      const y = scaleY(point.latitude)
      const cluster = point.cluster ?? 0
      const color = colors[cluster % colors.length]

      ctx.fillStyle = color
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Draw cluster centers if available
    if (result && result.clusterCenters) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      
      result.clusterCenters.forEach((center: number[], idx: number) => {
        // Note: Centers are in PCA space, not GPS coordinates
        // This is a simplified visualization
        const color = colors[idx % colors.length]
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(100 + idx * 100, 100, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
      })
    }
  }

  const getClusterStats = (): ClusterData[] => {
    if (!clusteringResult || !clusteringResult.clusterCharacteristics) return []

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    
    return Object.entries(clusteringResult.clusterCharacteristics).map(([id, char]: [string, any]) => ({
      clusterId: parseInt(id),
      pointCount: char.pointCount,
      avgRsrp: char.avgRsrp,
      avgRsrq: char.avgRsrq,
      quality: char.quality,
      color: colors[parseInt(id) % colors.length]
    }))
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">GPS Clustering Analysis</h3>
            <p className="text-sm text-slate-500 mt-0.5">K-means clustering with PCA dimensionality reduction</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-slate-600">Optimal K:</span>
              <span className="ml-2 font-semibold text-blue-600">{optimalK || 'Calculating...'}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Clusters:</label>
              <input
                type="number"
                value={numClusters}
                onChange={(e) => setNumClusters(parseInt(e.target.value))}
                min="2"
                max="10"
                className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
              />
              <button
                onClick={() => performClustering()}
                disabled={loading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:bg-slate-400"
              >
                {loading ? 'Processing...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Canvas */}
        <div className="flex-1 p-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full border border-slate-200 rounded-lg"
          />
        </div>

        {/* Cluster Statistics */}
        <div className="w-80 border-l border-slate-200 overflow-y-auto">
          <div className="p-4">
            <h4 className="font-semibold text-slate-900 mb-4">Cluster Statistics</h4>
            
            {clusteringResult && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Silhouette Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {clusteringResult.silhouetteScore?.toFixed(3)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {clusteringResult.silhouetteScore > 0.5 ? 'Excellent' :
                   clusteringResult.silhouetteScore > 0.3 ? 'Good' :
                   clusteringResult.silhouetteScore > 0.2 ? 'Fair' : 'Poor'} clustering quality
                </div>
              </div>
            )}

            <div className="space-y-3">
              {getClusterStats().map(cluster => (
                <div key={cluster.clusterId} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cluster.color }}
                      ></div>
                      <span className="font-semibold text-slate-900">Cluster {cluster.clusterId}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      cluster.quality === 'Excellent' ? 'bg-green-100 text-green-700' :
                      cluster.quality === 'Good' ? 'bg-blue-100 text-blue-700' :
                      cluster.quality === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {cluster.quality}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Points</div>
                      <div className="font-semibold">{cluster.pointCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Avg RSRP</div>
                      <div className="font-semibold">{cluster.avgRsrp.toFixed(1)} dBm</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Avg RSRQ</div>
                      <div className="font-semibold">{cluster.avgRsrq.toFixed(1)} dB</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {clusteringResult && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">PCA Variance</div>
                <div className="text-sm text-slate-700">
                  PC1: {(clusteringResult.pcaVarianceRatio[0] * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-slate-700">
                  PC2: {(clusteringResult.pcaVarianceRatio[1] * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Total: {((clusteringResult.pcaVarianceRatio[0] + clusteringResult.pcaVarianceRatio[1]) * 100).toFixed(1)}% variance explained
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-2 flex items-center justify-between text-sm text-slate-600">
        <div>
          Total Points: {gpsData.length} | Clusters: {numClusters}
        </div>
        <div>
          {loading ? 'Processing...' : 'Ready'}
        </div>
      </div>
    </div>
  )
}
