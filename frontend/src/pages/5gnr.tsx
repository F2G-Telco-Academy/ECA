import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import { api } from '@/utils/api'

export default function FiveGNRPage(){
  const router = useRouter()
  const { session, tab } = router.query
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState(tab || 'mib')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!session) return
      setLoading(true)
      try {
        const kpis = await api.getKpiAggregates(session as string)
        setData(kpis.filter((k: any) => k.rat === '5GNR'))
      } catch (err) {
        console.error('Failed to load 5G NR data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [session])

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setActiveTab('mib')}
            className={`px-4 py-2 rounded text-sm ${activeTab === 'mib' ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            MIB
          </button>
          <button 
            onClick={() => setActiveTab('sib')}
            className={`px-4 py-2 rounded text-sm ${activeTab === 'sib' ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            SIB1
          </button>
          <button 
            onClick={() => setActiveTab('capability')}
            className={`px-4 py-2 rounded text-sm ${activeTab === 'capability' ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            UE Capability
          </button>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading 5G NR data...</div>
        ) : data && data.length > 0 ? (
          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <table className="w-full text-xs">
              <thead className="text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Metric</th>
                  <th className="px-3 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((kpi: any, i: number) => (
                  <tr key={i} className="border-t border-gray-900">
                    <td className="px-3 py-2 text-gray-300">{kpi.metric}</td>
                    <td className="px-3 py-2 text-right text-white">{kpi.avgValue?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">{session ? 'No 5G NR data available' : 'No session selected'}</div>
        )}
      </div>
      <Footer />
    </div>
  )
}
