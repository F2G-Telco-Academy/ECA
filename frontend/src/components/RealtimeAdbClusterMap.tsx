/**
 * Real-time ADB Cluster Map - DRY pattern with live device data
 */

import { useEffect, useRef, useState } from 'react'
import { useClusterStream, ClusterUpdate, ClusterZone } from '@/hooks/useAdb'

interface Props {
  deviceId: string | null
  numClusters?: number
  intervalSeconds?: number
}

export default function RealtimeAdbClusterMap({
  deviceId,
  numClusters = 4,
  intervalSeconds = 3
}: Props) {
  const { update, connected } = useClusterStream(deviceId, numClusters, intervalSeconds)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedZone, setSelectedZone] = useState<ClusterZone | null>(null)

  // Draw clusters on canvas
  useEffect(() => {
    if (!update || !update.zones || update.zones.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawClusters(ctx, canvas, update)
  }, [update])

  const drawClusters = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    clusterUpdate: ClusterUpdate
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const zones = clusterUpdate.zones
    if (zones.length === 0) return

    // Get all points
    const allPoints = zones.flatMap(z => z.points)
    if (allPoints.length === 0) return

    // Calculate bounds
    const lats = allPoints.map(p => p.latitude)
    const lons = allPoints.map(p => p.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    const padding = 40
    const scaleX = (lon: number) =>
      ((lon - minLon) / (maxLon - minLon || 1)) * (canvas.width - 2 * padding) + padding
    const scaleY = (lat: number) =>
      canvas.height - (((lat - minLat) / (maxLat - minLat || 1)) * (canvas.height - 2 * padding) + padding)

    // Draw grid
    drawGrid(ctx, canvas, padding)

    // Draw cluster zones with polygons
    zones.forEach(zone => {
      if (zone.points.length === 0) return

      // Draw convex hull or simplified boundary
      ctx.fillStyle = zone.color + '20' // 20 = alpha transparency
      ctx.strokeStyle = zone.color
      ctx.lineWidth = 2
      ctx.beginPath()

      const hullPoints = getConvexHull(zone.points)
      hullPoints.forEach((point, i) => {
        const x = scaleX(point.longitude)
        const y = scaleY(point.latitude)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Draw center marker
      const centerX = scaleX(zone.centerLon)
      const centerY = scaleY(zone.centerLat)
      ctx.fillStyle = zone.color
      ctx.beginPath()
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Zone ${zone.clusterId}`, centerX, centerY - 15)
      ctx.font = '10px sans-serif'
      ctx.fillText(`${zone.quality}`, centerX, centerY + 20)
    })

    // Draw individual points
    allPoints.forEach(point => {
      const zone = zones.find(z => z.clusterId === point.clusterId)
      if (!zone) return

      const x = scaleX(point.longitude)
      const y = scaleY(point.latitude)

      ctx.fillStyle = zone.color
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
      ctx.globalAlpha = 1
    })

    // Draw scale info
    drawScaleInfo(ctx, canvas, clusterUpdate)
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, padding: number) => {
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i * (canvas.width - 2 * padding)) / 10
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, canvas.height - padding)
      ctx.stroke()
    }

    // Horizontal lines
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i * (canvas.height - 2 * padding)) / 10
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvas.width - padding, y)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }

  const drawScaleInfo = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    update: ClusterUpdate
  ) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(10, 10, 200, 80)

    ctx.fillStyle = '#fff'
    ctx.font = '11px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`Points: ${update.totalPoints}`, 20, 30)
    ctx.fillText(`Zones: ${update.zones.length}`, 20, 50)
    ctx.fillText(`Device: ${update.metadata?.deviceId?.substring(0, 8) || 'N/A'}`, 20, 70)
  }

  const getConvexHull = (points: any[]) => {
    if (points.length < 3) return points

    // Simple convex hull algorithm (Graham scan)
    const sorted = [...points].sort((a, b) =>
      a.latitude !== b.latitude ? a.latitude - b.latitude : a.longitude - b.longitude
    )

    const cross = (o: any, a: any, b: any) =>
      (a.longitude - o.longitude) * (b.latitude - o.latitude) -
      (a.latitude - o.latitude) * (b.longitude - o.longitude)

    const lower: any[] = []
    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop()
      }
      lower.push(point)
    }

    const upper: any[] = []
    for (let i = sorted.length - 1; i >= 0; i--) {
      const point = sorted[i]
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop()
      }
      upper.push(point)
    }

    lower.pop()
    upper.pop()
    return lower.concat(upper)
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg border border-gray-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-white">Real-time Cluster Map</div>
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
        </div>
        {update && (
          <div className="text-xs text-gray-400">
            {update.totalPoints} points | {update.zones.length} zones
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {!deviceId ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            Select a device to start live clustering
          </div>
        ) : !update || update.zones.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
              Collecting GPS data... ({update?.totalPoints || 0} points)
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full"
          />
        )}

        {/* Legend */}
        {update && update.zones.length > 0 && (
          <div className="absolute top-4 right-4 bg-black/90 backdrop-blur rounded-lg p-3 border border-gray-700">
            <div className="text-xs font-semibold text-gray-400 mb-2">Signal Quality Zones</div>
            <div className="space-y-1.5">
              {update.zones.map(zone => (
                <div
                  key={zone.clusterId}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 rounded px-2 py-1 transition-colors"
                  onClick={() => setSelectedZone(zone)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-xs text-gray-300">
                    Zone {zone.clusterId}: {zone.quality}
                  </span>
                  <span className="text-xs text-gray-500">({zone.pointCount})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zone Details */}
      {selectedZone && (
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-950">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-white">
              Zone {selectedZone.clusterId} - {selectedZone.quality}
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-400">RSRP</div>
              <div className="text-white font-mono">{selectedZone.avgRsrp.toFixed(1)} dBm</div>
            </div>
            <div>
              <div className="text-gray-400">RSRQ</div>
              <div className="text-white font-mono">{selectedZone.avgRsrq.toFixed(1)} dB</div>
            </div>
            <div>
              <div className="text-gray-400">SINR</div>
              <div className="text-white font-mono">{selectedZone.avgSinr.toFixed(1)} dB</div>
            </div>
            <div>
              <div className="text-gray-400">Points</div>
              <div className="text-white font-mono">{selectedZone.pointCount}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

