import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface SignalingMessage {
  id: string
  timestamp: string
  ueNet: string
  channel: string
  message: string
  direction?: string
  hexData?: string
  jsonData?: any
}

export default function XCALSignalingViewer({ sessionId }: { sessionId: string | null }) {
  const [messages, setMessages] = useState<SignalingMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<SignalingMessage | null>(null)
  const [filter, setFilter] = useState('')
  const [showHex, setShowHex] = useState(false)
  const [showJson, setShowJson] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (!sessionId) return

    const fetchMessages = async () => {
      try {
        const data = await api.getRecords(sessionId, { page: 0, size: 100 })
        const formattedMessages: SignalingMessage[] = (data.content || []).map((record: any) => ({
          id: record.id,
          timestamp: record.timestamp || new Date().toLocaleTimeString(),
          ueNet: record.ueNet || 'UL DCCH',
          channel: record.channel || 'PCCH',
          message: record.message || record.messageType || 'Unknown',
          direction: record.direction || '→',
          hexData: record.hexData || generateMockHex(),
          jsonData: record.payload || record.data
        }))
        setMessages(formattedMessages)
      } catch (err) {
        console.error('Failed to fetch signaling messages:', err)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const generateMockHex = () => {
    const lines = []
    for (let i = 0; i < 10; i++) {
      const hex = Array.from({ length: 16 }, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(' ')
      lines.push(`${(i * 16).toString(16).padStart(4, '0')}: ${hex}`)
    }
    return lines.join('\n')
  }

  const filteredMessages = messages.filter(msg =>
    msg.message.toLowerCase().includes(filter.toLowerCase()) ||
    msg.channel.toLowerCase().includes(filter.toLowerCase())
  )

  const formatJson = (data: any) => {
    if (!data) return 'No data available'
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Left Message List */}
      <div className="w-2/5 border-r border-gray-700 flex flex-col">
        {/* Filter Bar */}
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-2 mb-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Filtering
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Filtering 2
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Pause
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Export
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Hex
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Vertically
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Clear
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Find
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showHex}
                onChange={(e) => setShowHex(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Show SIP</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" className="w-4 h-4" />
              <span>Free Size</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" className="w-4 h-4" />
              <span>Step1</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" className="w-4 h-4" />
              <span>Step2</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" className="w-4 h-4" />
              <span>Step3</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" className="w-4 h-4" />
              <span>SACCH Report</span>
            </label>
          </div>
        </div>

        {/* Message Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-700 sticky top-0">
              <tr>
                <th className="text-left p-2 border-r border-gray-600">Time</th>
                <th className="text-left p-2 border-r border-gray-600">UE NET</th>
                <th className="text-left p-2 border-r border-gray-600">Channel</th>
                <th className="text-left p-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg, idx) => (
                <tr
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`cursor-pointer border-b border-gray-800 hover:bg-gray-750 ${
                    selectedMessage?.id === msg.id ? 'bg-blue-900' : idx % 2 === 0 ? 'bg-gray-850' : 'bg-gray-900'
                  }`}
                >
                  <td className="p-2 border-r border-gray-800 font-mono">
                    <span className={msg.direction === '→' ? 'text-cyan-400' : 'text-pink-400'}>
                      {msg.timestamp}
                    </span>
                    <span className="ml-1">{msg.direction}</span>
                  </td>
                  <td className="p-2 border-r border-gray-800">
                    <span className={msg.ueNet.includes('UL') ? 'text-cyan-400' : 'text-pink-400'}>
                      {msg.ueNet}
                    </span>
                  </td>
                  <td className="p-2 border-r border-gray-800">
                    <span className="text-yellow-400">{msg.channel}</span>
                  </td>
                  <td className="p-2">
                    <span className={msg.message.includes('5GNR') ? 'text-green-400' : 'text-white'}>
                      {msg.message}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => setShowJson(true)}
            className={`px-4 py-2 text-sm ${showJson ? 'bg-gray-700 border-b-2 border-blue-500' : 'hover:bg-gray-750'}`}
          >
            Message Details
          </button>
          <button
            onClick={() => setShowJson(false)}
            className={`px-4 py-2 text-sm ${!showJson ? 'bg-gray-700 border-b-2 border-blue-500' : 'hover:bg-gray-750'}`}
          >
            Hex Dump
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-black">
          {!selectedMessage ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a message to view details
            </div>
          ) : showJson ? (
            <div className="font-mono text-xs">
              <div className="mb-4">
                <div className="text-blue-400 mb-2">Message: {selectedMessage.message}</div>
                <div className="text-gray-400 mb-2">Time: {selectedMessage.timestamp}</div>
                <div className="text-gray-400 mb-2">Channel: {selectedMessage.channel}</div>
              </div>
              <pre className="text-green-400 whitespace-pre-wrap">
                {formatJson(selectedMessage.jsonData)}
              </pre>
            </div>
          ) : (
            <div className="font-mono text-xs">
              <div className="text-gray-400 mb-4">Hex Dump - {selectedMessage.message}</div>
              <pre className="text-green-400 whitespace-pre">
                {selectedMessage.hexData}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
