import { useEffect, useState } from 'react'
import { api } from '@/utils/api'

export default function LteNas({ sessionId }: { sessionId: string | null }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return
    api.getLteNas(sessionId).then(setData).catch(console.error)
  }, [sessionId])

  if (!sessionId) return <div className="p-4 text-gray-400">No session selected</div>
  if (!data) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-auto">
      <h2 className="text-xl font-bold mb-4">LTE NAS Messages</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Attach Success Rate</div>
          <div className="text-2xl font-bold text-green-400">{data.attachSuccess?.toFixed(1)}%</div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">TAU Success Rate</div>
          <div className="text-2xl font-bold text-blue-400">{data.tauSuccess?.toFixed(1)}%</div>
        </div>
      </div>
      <div className="bg-gray-800 p-4 rounded">
        <div className="text-sm text-gray-400 mb-2">NAS Messages</div>
        <div className="space-y-1 text-xs">
          {data.messages?.slice(0, 15).map((m: any, i: number) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500">{m.frame}</span>
              <span className="text-yellow-400">{m.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
