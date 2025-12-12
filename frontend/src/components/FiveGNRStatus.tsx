import { useEffect, useState } from 'react'
import { api } from '@/utils/api'

export default function FiveGNRStatus({ sessionId, type }: { sessionId: string | null; type: 'nsa' | 'sa' | 'rrc' | 'handover' }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return
    const fetchData = async () => {
      try {
        const result = type === 'nsa' ? await api.get5gnrNsaStatus(sessionId)
          : type === 'sa' ? await api.get5gnrSaStatus(sessionId)
          : type === 'handover' ? await api.get5gnrHandoverStats(sessionId)
          : await api.get5gnrRrcState(sessionId)
        setData(result)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [sessionId, type])

  if (!sessionId) return <div className="p-4 text-gray-400">No session selected</div>
  if (!data) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-auto">
      <h2 className="text-xl font-bold mb-4">
        {type === 'nsa' ? '5GNR NSA Status' 
          : type === 'sa' ? '5GNR SA Status'
          : type === 'handover' ? '5GNR Handover Statistics'
          : '5GNR RRC State'}
      </h2>
      <div className="bg-gray-800 p-4 rounded">
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}
