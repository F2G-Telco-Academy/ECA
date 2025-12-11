"use client"
import { useEffect, useState } from 'react'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
import { api } from '@/utils/api'

export default function VisualizeView({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | number | null>(null)
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
          api.getKpiAggregates(sessionId).catch(() => []),
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

  const bgMain = theme === 'dark' ? 'bg-slate-900 text-gray-100' : 'bg-white text-gray-800'
  const cardBg = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const headerBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
  const toolbarBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'

  return (
    <div className={`flex flex-col h-full pb-16 md:pb-0 ${bgMain}`}>
      <div className={`px-6 py-4 border-b ${headerBg}`}>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Visualize</h1>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${deviceId ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>{deviceId ? 'Device Selected' : 'No Device'}</span>
          </div>
        </div>
      </div>

      <DeviceSelectionBar selected={deviceId} onSelect={(id) => { setDeviceId(id); setSessionId(id) }} />

      <div className={`px-6 py-2 border-b text-xs flex items-center gap-2 ${toolbarBg}`}>
        <span className="text-gray-600">View:</span>
        <button className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">KPIs</button>
        <button className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">Map</button>
        <button className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">Charts</button>
        <span className="mx-2 w-px h-5 bg-gray-200" />
        <input placeholder="Filter metric..." className="px-2 py-1 border border-gray-300 rounded bg-white" />
        <div className="ml-auto text-gray-500">{loading ? 'Loading…' : 'Ready'}</div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-auto">
        <div className={`border rounded ${cardBg}`}>
          <div className={`px-4 py-2 border-b text-xs flex items-center justify-between ${toolbarBg}`}>
            <span>GPS Map</span>
            <div className="flex items-center gap-2 text-gray-500">
              <button className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:border-gray-400">🔍</button>
              <button className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:border-gray-400">⛶</button>
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
          <div className={`px-4 py-2 border-t text-[11px] text-gray-500 ${toolbarBg}`}>Legend: Good / Fair / Poor</div>
        </div>

        <div className={`border rounded ${cardBg}`}>
          <div className={`px-4 py-2 border-b text-xs ${toolbarBg}`}>KPI Summary</div>
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

        <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {['RSRP', 'RSRQ', 'SINR'].map((name) => (
            <div key={name} className={`border rounded ${cardBg}`}>
              <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${toolbarBg}`}>
                <span>{name}</span>
                <button className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:border-gray-400 text-[11px]">⛶</button>
              </div>
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Chart Placeholder</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
