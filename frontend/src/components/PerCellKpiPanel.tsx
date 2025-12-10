/**
 * Per-Cell KPI Panel - Shows KPI statistics grouped by cell
 * Essential for drive testing to identify problematic cells
 */

import { useEffect, useState } from 'react'

interface CellKpiStats {
  cellId: string
  sampleCount: number
  avgRsrp: number
  minRsrp: number
  maxRsrp: number
  avgRsrq: number
  minRsrq: number
  maxRsrq: number
  avgSinr: number
  minSinr: number
  maxSinr: number
  avgRssi: number
  avgCqi: number
  pci: number | null
  earfcn: number | null
  quality: string
}

interface Props {
  sessionId: number | null
}

export default function PerCellKpiPanel({ sessionId }: Props) {
  const [cellStats, setCellStats] = useState<Record<string, CellKpiStats>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const fetchCellStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `http://localhost:8080/api/kpis/session/${sessionId}/by-cell`
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setCellStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cell stats')
      } finally {
        setLoading(false)
      }
    }

    fetchCellStats()
  }, [sessionId])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Excellent': return 'text-green-500 bg-green-50'
      case 'Good': return 'text-lime-600 bg-lime-50'
      case 'Fair': return 'text-yellow-600 bg-yellow-50'
      case 'Poor': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (!sessionId) {
    return (
      <div className="bg-white p-4 rounded shadow h-full flex items-center justify-center">
        <div className="text-gray-500 text-sm">Select a session to view per-cell KPIs</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Loading cell statistics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded shadow h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-sm">Failed to load cell statistics</div>
          <div className="text-xs text-gray-500 mt-1">{error}</div>
        </div>
      </div>
    )
  }

  const cells = Object.values(cellStats)

  if (cells.length === 0) {
    return (
      <div className="bg-white p-4 rounded shadow h-full flex items-center justify-center">
        <div className="text-gray-500 text-sm">No cell data available</div>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded shadow h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Per-Cell KPI Analysis</h3>
        <span className="text-xs text-gray-500">{cells.length} cells</span>
      </div>

      <div className="space-y-3">
        {cells.map((cell) => (
          <div
            key={cell.cellId}
            className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            {/* Cell Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-900">Cell {cell.cellId}</div>
                <div className="text-xs text-gray-500">
                  {cell.pci !== null && `PCI ${cell.pci}`}
                  {cell.earfcn !== null && ` • EARFCN ${cell.earfcn}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getQualityColor(cell.quality)}`}>
                  {cell.quality}
                </span>
                <span className="text-xs text-gray-500">{cell.sampleCount} samples</span>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-2">
              <KpiMetric
                label="RSRP"
                avg={cell.avgRsrp}
                min={cell.minRsrp}
                max={cell.maxRsrp}
                unit="dBm"
              />
              <KpiMetric
                label="RSRQ"
                avg={cell.avgRsrq}
                min={cell.minRsrq}
                max={cell.maxRsrq}
                unit="dB"
              />
              <KpiMetric
                label="SINR"
                avg={cell.avgSinr}
                min={cell.minSinr}
                max={cell.maxSinr}
                unit="dB"
              />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-500">RSSI (Avg)</div>
                <div className="text-sm font-semibold">{cell.avgRssi.toFixed(1)} dBm</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-500">CQI (Avg)</div>
                <div className="text-sm font-semibold">{cell.avgCqi.toFixed(1)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface KpiMetricProps {
  label: string
  avg: number
  min: number
  max: number
  unit: string
}

function KpiMetric({ label, avg, min, max, unit }: KpiMetricProps) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-900">
        {avg.toFixed(1)} <span className="text-xs font-normal">{unit}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  )
}
