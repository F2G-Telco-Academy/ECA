import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
import { api } from '@/utils/api'

export default function VisualizePage(){
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
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <DeviceSelectionBar 
        selected={deviceId} 
        onSelect={(id) => { setDeviceId(id); setSessionId(id) }} 
      />
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">GPS Map</div>
          <div className="h-96 bg-black border border-gray-800 flex items-center justify-center">
            {loading ? (
              <div className="text-gray-500">Loading map...</div>
            ) : mapData && mapData.traces && mapData.traces.length > 0 ? (
              <div className="text-green-400">{mapData.traces.length} GPS points</div>
            ) : (
              <div className="text-gray-500">{sessionId ? 'No GPS data' : 'Select a session'}</div>
            )}
          </div>
        </div>
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">KPI Summary</div>
          <div className="h-96 bg-black border border-gray-800 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">Loading KPIs...</div>
            ) : kpis.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-black">
                  <tr className="text-gray-400">
                    <th className="px-2 py-1 text-left">Metric</th>
                    <th className="px-2 py-1 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi, i) => (
                    <tr key={i} className="border-t border-gray-900">
                      <td className="px-2 py-1 text-gray-300">{kpi.metric}</td>
                      <td className="px-2 py-1 text-right text-white">{kpi.avgValue?.toFixed(2)}</td>
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
      </div>
      <Footer />
    </div>
  )
}
