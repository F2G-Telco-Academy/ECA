import { useState, useEffect, useRef } from 'react'

interface Props {
  sessionId: string | null
}

interface DMMessage {
  timestamp: number
  type: string
  message: string
  hex: string
}

export default function QualcommDMViewer({ sessionId }: Props) {
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<DMMessage | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!sessionId || isPaused) return

    const eventSource = new EventSource(`http://localhost:8080/api/qualcomm/session/${sessionId}/dm-messages`)
    
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data)
      setMessages(prev => [...prev, message].slice(-1000))
    }

    eventSource.onerror = () => {
      console.error('DM message stream error')
      eventSource.close()
    }

    eventSourceRef.current = eventSource

    return () => eventSource.close()
  }, [sessionId, isPaused])

  if (!sessionId) {
    return <div className="h-full flex items-center justify-center text-slate-500">Start a session</div>
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 p-2 border-b border-slate-700 flex gap-2 text-xs">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded ${isPaused ? 'bg-yellow-600' : 'bg-slate-700'}`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setMessages([])}
            className="px-3 py-1 bg-slate-700 rounded"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-black font-mono text-xs">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="px-2 py-1 text-left">Time</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Message</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedMessage(msg)}
                  className="cursor-pointer hover:bg-slate-800 text-cyan-400"
                >
                  <td className="px-2 py-1">{new Date(msg.timestamp).toLocaleTimeString()}</td>
                  <td className="px-2 py-1">{msg.type}</td>
                  <td className="px-2 py-1">{msg.message.substring(0, 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMessage && (
        <div className="w-96 bg-slate-900 border-l border-slate-700 overflow-auto p-3 text-xs font-mono">
          <div className="font-semibold mb-2">Hex Dump</div>
          <pre className="text-blue-400 whitespace-pre-wrap">
            {selectedMessage.hex || selectedMessage.message}
          </pre>
        </div>
      )}
    </div>
  )
}
