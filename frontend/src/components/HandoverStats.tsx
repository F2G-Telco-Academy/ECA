import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface Props {
  sessionId: string | null
}

export default function HandoverStats({ sessionId }: Props) {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return
    
    const fetch = async () => {
      try {
        const kpis = await api.getKpis(sessionId)
        setStats(kpis)
      } catch (err) {
        console.error('Failed to fetch handover stats:', err)
      }
    }

    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [sessionId])

  if (!sessionId) {
    return <div className="h-full flex items-center justify-center text-slate-500">Start a session</div>
  }

  const hoTypes = [
    { name: 'Intra NR-HO(Total)', attempt: 0, success: 0, failure: 0 },
    { name: 'Intra Frequency HO', attempt: 0, success: 0, failure: 0 },
    { name: 'Inter Frequency HO', attempt: 0, success: 0, failure: 0 },
    { name: 'Unknown Frequency HO', attempt: 0, success: 0, failure: 0 },
    { name: 'Intra / Inter gNB HO', attempt: 0, success: 0, failure: 0 },
    { name: 'Intra Frequency - Intra gNB HO', attempt: 0, success: 0, failure: 0 },
    { name: 'Intra Frequency - Inter gNB HO', attempt: 0, success: 0, failure: 0 }
  ]

  return (
    <div className="p-4 text-sm">
      <div className="text-lg font-bold mb-4">5GNR Handover Statistics (Intra NR-HO)</div>
      <table className="w-full">
        <thead className="bg-slate-800">
          <tr>
            <th className="py-2 px-2 text-left">Time</th>
            <th className="py-2 px-2 text-center" colSpan={3}>Attempt / Success / Failure</th>
          </tr>
        </thead>
        <tbody>
          {hoTypes.map((ho, idx) => (
            <tr key={idx} className="border-b border-slate-700">
              <td className="py-2 px-2 bg-slate-800">{ho.name}</td>
              <td className="py-2 px-2 text-center">{ho.attempt}</td>
              <td className="py-2 px-2 text-center">{ho.success}</td>
              <td className="py-2 px-2 text-center">{ho.failure}</td>
            </tr>
          ))}
          {hoTypes.map((ho, idx) => (
            <tr key={`rate-${idx}`} className="border-b border-slate-700">
              <td className="py-2 px-2 bg-slate-800">Rate(%)</td>
              <td className="py-2 px-2 text-center" colSpan={3}>-</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
