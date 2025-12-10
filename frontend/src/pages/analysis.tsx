import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
import { api } from '@/utils/api'

export default function AnalysisPage(){
  const [deviceId, setDeviceId] = useState<string|null>(null)
  const [sessionId, setSessionId] = useState<string|number|null>(null)
  const [kpis, setKpis] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadKpis = async () => {
      if (!sessionId) return
      setLoading(true)
      try {
        const data = await api.getKpis(sessionId)
        setKpis(data)
      } catch (err) {
        console.error('Failed to load KPIs:', err)
      } finally {
        setLoading(false)
      }
    }
    loadKpis()
    const interval = setInterval(loadKpis, 3000)
    return () => clearInterval(interval)
  }, [sessionId])

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <DeviceSelectionBar 
        selected={deviceId} 
        onSelect={(id) => { setDeviceId(id); setSessionId(id) }} 
      />
      <div className="p-6 space-y-4">
        <div className="text-2xl font-bold">Call Statistics & Analysis</div>
        
        {loading ? (
          <div className="text-gray-500">Loading analysis...</div>
        ) : sessionId ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-800 rounded p-4 bg-gray-950">
              <div className="text-sm text-gray-400 mb-2">Call Setup Success Rate</div>
              <div className="text-3xl text-white">{kpis.callSetupSr?.toFixed(1) || '0.0'}%</div>
            </div>
            <div className="border border-gray-800 rounded p-4 bg-gray-950">
              <div className="text-sm text-gray-400 mb-2">Call Drop Rate</div>
              <div className="text-3xl text-white">{kpis.callDropRate?.toFixed(1) || '0.0'}%</div>
            </div>
            <div className="border border-gray-800 rounded p-4 bg-gray-950">
              <div className="text-sm text-gray-400 mb-2">Handover Success Rate</div>
              <div className="text-3xl text-white">{kpis.handoverSr?.toFixed(1) || '0.0'}%</div>
            </div>
            <div className="border border-gray-800 rounded p-4 bg-gray-950">
              <div className="text-sm text-gray-400 mb-2">RRC Success Rate</div>
              <div className="text-3xl text-white">{kpis.rrcSr?.toFixed(1) || '0.0'}%</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Select a device to view analysis</div>
        )}
      </div>
      <Footer />
    </div>
  )
}
