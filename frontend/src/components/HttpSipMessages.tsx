import { useEffect, useState } from 'react'
import { api } from '@/utils/api'

export default function HttpSipMessages({ sessionId }: { sessionId: string | null }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return
    api.getHttpSipMessages(sessionId).then(setData).catch(console.error)
  }, [sessionId])

  if (!sessionId) return <div className="p-4 text-gray-400">No session selected</div>
  if (!data) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-auto">
      <h2 className="text-xl font-bold mb-4">HTTP / SIP Messages</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">HTTP Messages</div>
          <div className="text-2xl font-bold text-blue-400">{data.totalHttp}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">SIP Messages</div>
          <div className="text-2xl font-bold text-green-400">{data.totalSip}</div>
        </div>
      </div>

      {data.httpMessages?.length > 0 && (
        <div className="bg-gray-800 p-4 rounded mb-4">
          <div className="text-sm text-gray-400 mb-2">HTTP Messages</div>
          <div className="space-y-1 text-xs">
            {data.httpMessages.slice(0, 10).map((msg: any, i: number) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500">{msg.frame}</span>
                <span className="text-blue-400">{msg.type}</span>
                <span className="text-yellow-400">{msg.method || msg.code}</span>
                <span className="text-gray-300 truncate">{msg.uri}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.sipMessages?.length > 0 && (
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400 mb-2">SIP Messages</div>
          <div className="space-y-1 text-xs">
            {data.sipMessages.slice(0, 10).map((msg: any, i: number) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500">{msg.frame}</span>
                <span className="text-green-400">{msg.type}</span>
                <span className="text-yellow-400">{msg.method || msg.statusCode}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.totalHttp === 0 && data.totalSip === 0 && (
        <div className="text-center text-gray-500 py-8">
          No HTTP/SIP messages found in this session
        </div>
      )}
    </div>
  )
}
