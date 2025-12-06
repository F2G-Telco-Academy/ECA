import { useState, useEffect, useRef } from 'react'

interface SignalingMessageProps {
  deviceId: string | null
}

interface Message {
  time: string
  channel: string
  type: string
  message: string
  details?: string
}

export default function SignalingMessage({ deviceId }: SignalingMessageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!deviceId || isPaused) return

    const eventSource = new EventSource(`/api/sessions/${deviceId}/logs`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages(prev => [...prev, data].slice(-1000))
    }

    return () => eventSource.close()
  }, [deviceId, isPaused])

  useEffect(() => {
    if (!isPaused) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isPaused])

  const getChannelColor = (channel: string) => {
    if (channel.includes('UL')) return 'text-cyan-400'
    if (channel.includes('DL')) return 'text-pink-400'
    if (channel.includes('PCCH')) return 'text-purple-400'
    if (channel.includes('BCCH')) return 'text-orange-400'
    return 'text-gray-400'
  }

  const filteredMessages = messages.filter(msg =>
    !filter || msg.message.toLowerCase().includes(filter.toLowerCase())
  )

  if (!deviceId) {
    return <div className="p-4 text-center text-gray-400">Select a device to view messages</div>
  }

  return (
    <div className="flex h-full bg-black text-white">
      <div className="flex-1 flex flex-col">
        <div className="p-2 bg-gray-900 flex gap-2 items-center border-b border-gray-700">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setMessages([])}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Clear
          </button>
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 bg-gray-800 border border-gray-600 rounded flex-1"
          />
          <span className="text-sm text-gray-400">{filteredMessages.length} messages</span>
        </div>

        <div className="flex-1 overflow-auto font-mono text-sm">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-800">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">UE NET</th>
                <th className="p-2 text-left">Channel</th>
                <th className="p-2 text-left">Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedMessage(msg)}
                  className={`border-t border-gray-800 hover:bg-gray-900 cursor-pointer ${
                    selectedMessage === msg ? 'bg-blue-900' : ''
                  }`}
                >
                  <td className="p-2 text-gray-400">{msg.time}</td>
                  <td className="p-2 text-gray-400">→</td>
                  <td className={`p-2 ${getChannelColor(msg.channel)}`}>{msg.channel}</td>
                  <td className="p-2 text-green-400">{msg.message}</td>
                </tr>
              ))}
              <div ref={messagesEndRef} />
            </tbody>
          </table>
        </div>
      </div>

      {selectedMessage && (
        <div className="w-96 bg-gray-900 border-l border-gray-700 p-4 overflow-auto">
          <div className="mb-4">
            <div className="text-sm text-gray-400">Message Details</div>
            <div className="text-lg font-bold">{selectedMessage.message}</div>
          </div>
          <div className="text-xs">
            <div className="mb-2">
              <span className="text-gray-400">Time:</span> {selectedMessage.time}
            </div>
            <div className="mb-2">
              <span className="text-gray-400">Channel:</span> {selectedMessage.channel}
            </div>
            <div className="mb-2">
              <span className="text-gray-400">Type:</span> {selectedMessage.type}
            </div>
            {selectedMessage.details && (
              <div className="mt-4 p-2 bg-black rounded">
                <pre className="text-xs whitespace-pre-wrap">{selectedMessage.details}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
