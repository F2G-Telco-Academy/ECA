import { useEffect, useState, useRef } from 'react'
import { api } from '@/utils/api'
import type { Record } from '@/types'

interface SignalingMessage {
  time: string
  ueNet: string
  channel: string
  message: string
  details?: any
}

export default function XCALSignalingViewer({ sessionId }: { sessionId: string | null }) {
  const [messages, setMessages] = useState<SignalingMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<SignalingMessage | null>(null)
  const [filter, setFilter] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [showDetail, setShowDetail] = useState(true)
  const [showElapsedTime, setShowElapsedTime] = useState(false)
  const [fontSize, setFontSize] = useState(12)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sessionId || isPaused) return

    const interval = setInterval(async () => {
      try {
        const records = await api.getRecords(sessionId, 0, 100)
        const newMessages: SignalingMessage[] = records.content.map(r => ({
          time: new Date(r.timestamp).toLocaleTimeString(),
          ueNet: r.layer,
          channel: r.rat,
          message: r.messageType,
          details: r.payloadJson
        }))
        setMessages(prev => [...prev, ...newMessages].slice(-1000)) // Keep last 1000
      } catch (err) {
        console.error('Failed to fetch messages:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, isPaused])

  useEffect(() => {
    if (!isPaused) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isPaused])

  const filteredMessages = messages.filter(m =>
    !filter || m.message.toLowerCase().includes(filter.toLowerCase()) ||
    m.channel.toLowerCase().includes(filter.toLowerCase())
  )

  const handleExport = () => {
    const csv = [
      ['Time', 'UE-NET', 'Channel', 'Message'].join(','),
      ...filteredMessages.map(m => [m.time, m.ueNet, m.channel, m.message].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signaling_${sessionId}_${Date.now()}.csv`
    a.click()
  }

  const handleClear = () => {
    setMessages([])
    setSelectedMessage(null)
  }

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b border-gray-300">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Message Filter:</label>
          <select className="px-2 py-1 border border-gray-300 rounded text-xs">
            <option>None</option>
            <option>RRC</option>
            <option>NAS</option>
            <option>MAC</option>
          </select>
        </div>

        <button
          onClick={() => setFilter('')}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
        >
          Filtering
        </button>
        <button className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50">
          Filtering2
        </button>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`px-3 py-1 border border-gray-300 rounded text-xs ${
            isPaused ? 'bg-yellow-100' : 'bg-white hover:bg-gray-50'
          }`}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
        >
          Export
        </button>
        <button className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50">
          Hex
        </button>
        <button className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50">
          Vertically
        </button>
        <button
          onClick={handleClear}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
        >
          Clear
        </button>
        <button className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50">
          Find
        </button>
        <button className="px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50">
          String Color Setting
        </button>

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={showDetail}
              onChange={(e) => setShowDetail(e.target.checked)}
            />
            Detail
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={showElapsedTime}
              onChange={(e) => setShowElapsedTime(e.target.checked)}
            />
            Show Elapsed Time
          </label>
        </div>
      </div>

      {/* Secondary Toolbar */}
      <div className="flex items-center gap-2 px-4 py-1 bg-gray-50 border-b border-gray-300">
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" />
          Show SIP
        </label>
        <label className="text-xs text-gray-600">Font Size:</label>
        <input
          type="number"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
          min="8"
          max="20"
        />
        <label className="flex items-center gap-1 text-xs ml-4">
          <input type="checkbox" />
          Show Step1
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" />
          Step2
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" />
          Step3
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" />
          SATCH Report
        </label>
      </div>

      {/* Dual Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Message List */}
        <div className="flex-1 border-r border-gray-300 overflow-auto bg-white">
          <table className="w-full text-xs" style={{ fontSize: `${fontSize}px` }}>
            <thead className="sticky top-0 bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="text-left p-2 font-semibold">Time</th>
                <th className="text-left p-2 font-semibold">UE-NET</th>
                <th className="text-left p-2 font-semibold">Channel</th>
                <th className="text-left p-2 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedMessage(msg)}
                  className={`border-b border-gray-200 cursor-pointer hover:bg-blue-50 ${
                    selectedMessage === msg ? 'bg-blue-100' : ''
                  }`}
                >
                  <td className="p-2 font-mono">{msg.time}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      msg.ueNet === 'RRC' ? 'bg-blue-100 text-blue-800' :
                      msg.ueNet === 'NAS' ? 'bg-purple-100 text-purple-800' :
                      msg.ueNet === 'MAC' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.ueNet}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      msg.channel === 'LTE' ? 'bg-green-100 text-green-800' :
                      msg.channel === 'NR' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.channel}
                    </span>
                  </td>
                  <td className="p-2 font-semibold">{msg.message}</td>
                </tr>
              ))}
              <tr ref={messagesEndRef} />
            </tbody>
          </table>
        </div>

        {/* Right Pane - Message Details */}
        {showDetail && (
          <div className="w-1/2 overflow-auto bg-gray-50 p-4">
            {selectedMessage ? (
              <div>
                <div className="mb-4 pb-4 border-b border-gray-300">
                  <h3 className="text-lg font-bold mb-2">{selectedMessage.message}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <span className="ml-2 font-mono">{selectedMessage.time}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Layer:</span>
                      <span className="ml-2 font-semibold">{selectedMessage.ueNet}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Channel:</span>
                      <span className="ml-2 font-semibold">{selectedMessage.channel}</span>
                    </div>
                  </div>
                </div>

                {selectedMessage.details && (
                  <div>
                    <h4 className="text-sm font-bold mb-2">Message Details:</h4>
                    <pre className="bg-white p-3 rounded border border-gray-300 text-xs overflow-auto">
                      {JSON.stringify(selectedMessage.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a message to view details
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1 bg-gray-100 border-t border-gray-300 text-xs text-gray-600">
        Total Messages: {filteredMessages.length} | 
        {isPaused && <span className="ml-2 text-yellow-600 font-bold">PAUSED</span>}
        {filter && <span className="ml-2">Filter: {filter}</span>}
      </div>
    </div>
  )
}
