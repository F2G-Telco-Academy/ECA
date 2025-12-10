"use client"
import { useEffect, useState } from 'react'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
import { api } from '@/utils/api'

export default function VisualizeView(){
  const [deviceId, setDeviceId] = useState<string|null>(null)
  const [sessionId, setSessionId] = useState<string|number|null>(null)
  const [mapData, setMapData] = useState<any>(null)
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!sessionId) return
      setLoading(true)
      try {
        const [map, kpiData] = await Promise.all([
          api.getMapData(sessionId).catch(() => null),
          api.getKpiAggregates(sessionId).catch(() => [])
        ])
        setMapData(map)
        setKpis(kpiData)
      } catch (err) {
        console.error('Failed to load visualization data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [sessionId])

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Visualize</h1>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${deviceId ? 'bg-green-500':'bg-gray-300'}`} />
            <span>{deviceId ? 'Device Selected' : 'No Device'}</span>
          </div>
        </div>
      </div>

      {/* Device chips row */}
      <DeviceSelectionBar 
        selected={deviceId} 
        onSelect={(id) => { setDeviceId(id); setSessionId(id) }} 
      />

      {/* Toolbar */}
      <div className="px-6 py-2 border-b border-gray-200 bg-gray-50 text-xs flex items-center gap-2">
        <span className="text-gray-600">View:</span>
        <button className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">KPIs</button>
        <button className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">Map</button>
        <button className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">Charts</button>
        <span className="mx-2 w-px h-5 bg-gray-200" />
        <input placeholder="Filter metric..." className="px-2 py-1 border border-gray-300 rounded bg-white" />
        <div className="ml-auto text-gray-500">{loading ? 'Loading…' : 'Ready'}</div>
      </div>

      {/* Body grid */}
      <div className="p-6 grid grid-cols-2 gap-4 overflow-auto">
        {/* Map Panel */}
        <div className="border border-gray-200 rounded bg-white">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
            <span>GPS Map</span>
            <div className="flex items-center gap-2 text-gray-500">
              <button className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:border-gray-400">🔍</button>
              <button className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:border-gray-400">🧭</button>
            </div>
          </div>
          <div className="h-96 flex items-center justify-center">
            {loading ? (
              <div className="text-gray-500">Loading map...</div>
            ) : mapData && mapData.traces && mapData.traces.length > 0 ? (
              <div className="text-green-600 text-sm">{mapData.traces.length} GPS points</div>
            ) : (
              <div className="text-gray-500">{sessionId ? 'No GPS data' : 'Select a session'}</div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500">Legend: Good • Fair • Poor</div>
        </div>

        {/* KPI Summary Table */}
        <div className="border border-gray-200 rounded bg-white">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">KPI Summary</div>
          <div className="h-96 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">Loading KPIs...</div>
            ) : kpis.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr className="text-gray-600">
                    <th className="px-2 py-1 text-left">Metric</th>
                    <th className="px-2 py-1 text-right">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1 text-gray-800">{kpi.metric}</td>
                      <td className="px-2 py-1 text-right text-gray-700">{kpi.avgValue?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {sessionId ? 'No KPI data' : 'Select a session'}
              </div>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="col-span-2 grid grid-cols-3 gap-4">
          {["RSRP","RSRQ","SINR"].map((name)=> (
            <div key={name} className="border border-gray-200 rounded bg-white">
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">{name}</div>
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Chart Placeholder</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
