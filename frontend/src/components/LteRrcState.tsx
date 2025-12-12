import { useEffect, useState } from 'react'
import { api } from '@/utils/api'

export default function LteRrcState({ sessionId }: { sessionId: string | null }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return
    api.getLteRrcState(sessionId).then(setData).catch(console.error)
  }, [sessionId])

  if (!sessionId) return <div className="p-4 text-gray-400">No session selected</div>
  if (!data) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-auto">
      <h2 className="text-xl font-bold mb-4">LTE RRC State</h2>
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Current State</div>
          <div className="text-2xl font-bold text-green-400">{data.state}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Total Messages</div>
          <div className="text-xl">{data.totalMessages}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400 mb-2">RRC Transitions</div>
          <div className="space-y-1 text-xs">
            {data.transitions?.slice(0, 10).map((t: any, i: number) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500">{t.frame}</span>
                <span className="text-blue-400">{t.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
