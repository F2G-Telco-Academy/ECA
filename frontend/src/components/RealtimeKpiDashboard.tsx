/**
 * Real-time KPI Dashboard - Live cellular metrics from ADB device
 */

import { useCellularStream, CellularData } from '@/hooks/useAdb'
import { useEffect, useState } from 'react'

interface Props {
  deviceId: string | null
  intervalSeconds?: number
}

export default function RealtimeKpiDashboard({ deviceId, intervalSeconds = 1 }: Props) {
  const { data, connected } = useCellularStream(deviceId, intervalSeconds)
  const [history, setHistory] = useState<CellularData[]>([])

  useEffect(() => {
    if (data) {
      setHistory(prev => [...prev, data].slice(-100)) // Keep last 100 samples
    }
  }, [data])

  const getQualityColor = (rsrp: number) => {
    if (rsrp >= -80) return 'text-green-400'
    if (rsrp >= -90) return 'text-lime-400'
    if (rsrp >= -100) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getQualityLabel = (rsrp: number) => {
    if (rsrp >= -80) return 'Excellent'
    if (rsrp >= -90) return 'Good'
    if (rsrp >= -100) return 'Fair'
    return 'Poor'
  }

  const calculateStats = (key: keyof CellularData) => {
    if (history.length === 0) return { avg: 0, min: 0, max: 0 }

    const values = history.map(h => h[key] as number).filter(v => typeof v === 'number')
    if (values.length === 0) return { avg: 0, min: 0, max: 0 }

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    }
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg border border-gray-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-white">Live KPI Metrics</div>
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
        </div>
        {data && (
          <div className="text-xs text-gray-400">
            {data.operator} | {data.networkType}
          </div>
        )}
      </div>

      {/* Main KPIs */}
      {!deviceId ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Select a device to view live KPIs
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
            Connecting to device...
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-auto">
          {/* Signal Quality Badge */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1">Overall Signal Quality</div>
              <div className={`text-3xl font-bold ${getQualityColor(data.rsrp)}`}>
                {getQualityLabel(data.rsrp)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">Cell Info</div>
              <div className="text-sm text-white font-mono">PCI {data.pci}</div>
              <div className="text-xs text-gray-500">Cell {data.cellId}</div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <KpiCard
              label="RSRP"
              value={data.rsrp}
              unit="dBm"
              color={getQualityColor(data.rsrp)}
              stats={calculateStats('rsrp')}
            />
            <KpiCard
              label="RSRQ"
              value={data.rsrq}
              unit="dB"
              color={data.rsrq >= -10 ? 'text-green-400' : data.rsrq >= -15 ? 'text-yellow-400' : 'text-red-400'}
              stats={calculateStats('rsrq')}
            />
            <KpiCard
              label="SINR"
              value={data.sinr}
              unit="dB"
              color={data.sinr >= 10 ? 'text-green-400' : data.sinr >= 0 ? 'text-yellow-400' : 'text-red-400'}
              stats={calculateStats('sinr')}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <KpiCard
              label="RSSI"
              value={data.rssi}
              unit="dBm"
              color="text-blue-400"
              stats={calculateStats('rssi')}
            />
            <KpiCard
              label="CQI"
              value={data.cqi}
              unit=""
              color={data.cqi >= 10 ? 'text-green-400' : data.cqi >= 5 ? 'text-yellow-400' : 'text-red-400'}
              stats={calculateStats('cqi')}
            />
            <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
              <div className="text-xs text-gray-400 mb-2">Network</div>
              <div className="text-lg font-semibold text-white">{data.networkType}</div>
              <div className="text-xs text-gray-500 mt-1">
                {data.mcc}/{data.mnc}
              </div>
            </div>
          </div>

          {/* Mini Charts */}
          <div className="grid grid-cols-3 gap-3">
            <MiniChart label="RSRP" data={history.map(h => h.rsrp)} color="#10b981" />
            <MiniChart label="RSRQ" data={history.map(h => h.rsrq)} color="#f59e0b" />
            <MiniChart label="SINR" data={history.map(h => h.sinr)} color="#3b82f6" />
          </div>

          {/* TAC Info */}
          {data.tac > 0 && (
            <div className="mt-4 p-3 bg-gray-950 rounded-lg border border-gray-800">
              <div className="text-xs text-gray-400">Tracking Area Code (TAC)</div>
              <div className="text-lg font-mono text-white">{data.tac}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: number
  unit: string
  color: string
  stats: { avg: number; min: number; max: number }
}

function KpiCard({ label, value, unit, color, stats }: KpiCardProps) {
  return (
    <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color} mb-2`}>
        {value.toFixed(1)}
        <span className="text-sm ml-1">{unit}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Min: {stats.min.toFixed(1)}</span>
        <span>Avg: {stats.avg.toFixed(1)}</span>
        <span>Max: {stats.max.toFixed(1)}</span>
      </div>
    </div>
  )
}

interface MiniChartProps {
  label: string
  data: number[]
  color: string
}

function MiniChart({ label, data, color }: MiniChartProps) {
  const recentData = data.slice(-30)
  if (recentData.length === 0) return null

  const min = Math.min(...recentData)
  const max = Math.max(...recentData)
  const range = max - min || 1

  const points = recentData
    .map((val, i) => {
      const x = (i / (recentData.length - 1)) * 100
      const y = 100 - ((val - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="bg-gray-950 rounded-lg p-2 border border-gray-800">
      <div className="text-xs text-gray-400 mb-1">{label} Trend</div>
      <svg viewBox="0 0 100 40" className="w-full h-10">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

