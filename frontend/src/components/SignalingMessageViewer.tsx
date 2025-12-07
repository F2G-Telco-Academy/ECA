import { useState, useEffect, useRef } from 'react'

interface SignalingMessage {
  timestamp: string
  channel: string
  direction: 'UL' | 'DL'
  protocol: string
  messageType: string
  details: any
}

interface SignalingMessageViewerProps {
  sessionId: string | null
}

export default function SignalingMessageViewer({ sessionId }: SignalingMessageViewerProps) {
  const [messages, setMessages] = useState<SignalingMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<SignalingMessage | null>(null)
  const [filter, setFilter] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [showStep1, setShowStep1] = useState(true)
  const [showStep2, setShowStep2] = useState(true)
  const [showStep3, setShowStep3] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sessionId || isPaused) return

    const eventSource = new EventSource(`http://localhost:8080/api/sessions/${sessionId}/signaling`)
    
    eventSource.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      setMessages(prev => [...prev, msg].slice(-1000)) // Keep last 1000 messages
    }

    return () => eventSource.close()
  }, [sessionId, isPaused])

  useEffect(() => {
    if (!isPaused) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isPaused])

  const getChannelColor = (channel: string) => {
    if (channel.includes('UL_DCCH')) return 'text-cyan-400'
    if (channel.includes('DL_DCCH')) return 'text-magenta-400'
    if (channel.includes('UL_CCCH')) return 'text-cyan-300'
    if (channel.includes('DL_CCCH')) return 'text-magenta-300'
    if (channel.includes('BCCH')) return 'text-yellow-400'
    if (channel.includes('PCCH')) return 'text-orange-400'
    if (channel.includes('5GNR')) return 'text-green-400'
    return 'text-gray-400'
  }

  const filteredMessages = messages.filter(msg => {
    if (filter && !msg.messageType.toLowerCase().includes(filter.toLowerCase())) return false
    if (!showStep1 && msg.protocol === 'RRC') return false
    if (!showStep2 && msg.protocol === 'NAS') return false
    if (!showStep3 && msg.protocol === 'PDCP') return false
    return true
  })

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-900 border-b border-gray-700">
        <span className="text-xs text-gray-400">Message Filter:</span>
        <select className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs">
          <option>None</option>
          <option>RRC</option>
          <option>NAS</option>
          <option>PDCP</option>
        </select>
        
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Filtering</button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Filtering 2</button>
        
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className={`px-3 py-1 rounded text-xs ${isPaused ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Export</button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Hex</button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Vertically</button>
        <button 
          onClick={() => setMessages([])}
          className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
        >
          Clear
        </button>
        
        <input
          type="text"
          placeholder="Find..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs w-32"
        />
        <button className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs">String Color Setting</button>
        
        <div className="flex gap-2 ml-auto">
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={showStep1} onChange={(e) => setShowStep1(e.target.checked)} />
            Show Step1
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={showStep2} onChange={(e) => setShowStep2(e.target.checked)} />
            Step2
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={showStep3} onChange={(e) => setShowStep3(e.target.checked)} />
            Step3
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" />
            SACH Report
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Message List */}
        <div className="flex-1 overflow-auto font-mono text-xs">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-2 py-1 text-left text-gray-400 font-semibold">Time</th>
                <th className="px-2 py-1 text-left text-gray-400 font-semibold">UE_NET</th>
                <th className="px-2 py-1 text-left text-gray-400 font-semibold">ID</th>
                <th className="px-2 py-1 text-left text-gray-400 font-semibold">Channel</th>
                <th className="px-2 py-1 text-left text-gray-400 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedMessage(msg)}
                  className={`cursor-pointer hover:bg-gray-800 ${
                    selectedMessage === msg ? 'bg-gray-700' : ''
                  }`}
                >
                  <td className="px-2 py-1 text-gray-300">{msg.timestamp}</td>
                  <td className={`px-2 py-1 ${getChannelColor(msg.channel)}`}>
                    {msg.direction === 'UL' ? '→' : '←'} {msg.channel}
                  </td>
                  <td className="px-2 py-1 text-gray-400">{msg.protocol}</td>
                  <td className={`px-2 py-1 ${getChannelColor(msg.channel)}`}>
                    {msg.channel}
                  </td>
                  <td className={`px-2 py-1 ${getChannelColor(msg.channel)}`}>
                    {msg.messageType}
                  </td>
                </tr>
              ))}
              <div ref={messagesEndRef} />
            </tbody>
          </table>
        </div>

        {/* Message Details Panel */}
        <div className="w-96 border-l border-gray-700 bg-gray-900 overflow-auto p-4">
          {selectedMessage ? (
            <div className="font-mono text-xs">
              <div className="mb-4 pb-2 border-b border-gray-700">
                <div className="text-blue-400 font-semibold mb-2">
                  {selectedMessage.messageType}
                </div>
                <div className="text-gray-400">
                  <div>Time: {selectedMessage.timestamp}</div>
                  <div>Channel: {selectedMessage.channel}</div>
                  <div>Protocol: {selectedMessage.protocol}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-green-400">Message Details:</div>
                <pre className="text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(selectedMessage.details, null, 2)}
                </pre>
              </div>

              {/* RRC Information */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-yellow-400 mb-2">RRC Information:</div>
                <div className="text-gray-400 space-y-1">
                  <div>Version: 13</div>
                  <div>Max Minor Version: 0.12</div>
                  <div>RRC-REL: Major: 13</div>
                  <div>RRC-VER Minor: 10</div>
                  <div>RRC-VER Minor: 8</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              Select a message to view details
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-2 py-1 bg-gray-900 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
        <div>Total Messages: {messages.length} | Filtered: {filteredMessages.length}</div>
        <div>Cell Timestamp: {messages[messages.length - 1]?.timestamp || 'N/A'}</div>
      </div>
    </div>
  )
}
