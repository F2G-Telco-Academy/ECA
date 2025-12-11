import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface SignalingMessage {
  id: string
  timestamp: string
  ueNet: string
  channel: string
  message: string
  hexData?: string
  jsonData?: any
}

export default function SignalingViewer({ sessionId }: { sessionId: string | null }) {
  const [messages, setMessages] = useState<SignalingMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<SignalingMessage | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showHex, setShowHex] = useState(false)
  const [filter, setFilter] = useState('')
  const [showSIP, setShowSIP] = useState(false)
  const [freeSize, setFreeSize] = useState(false)

  useEffect(() => {
    if (!sessionId || isPaused) return

    const fetchMessages = async () => {
      try {
        const data = await api.getRecords(sessionId, { page: 0, size: 200 })
        const formattedMessages: SignalingMessage[] = (data.content || []).map((record: any, idx: number) => ({
          id: record.id || idx.toString(),
          timestamp: record.timestamp || `09:${String(idx).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}.${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          ueNet: record.ueNet || (idx % 3 === 0 ? 'UL DCCH' : idx % 3 === 1 ? 'DL 5GNR' : 'PCCH'),
          channel: record.channel || (idx % 4 === 0 ? 'PCCH' : idx % 4 === 1 ? 'BCCH BCH' : 'UL DCCH'),
          message: record.message || record.messageType || generateMockMessage(idx),
          hexData: record.hexData || generateHexDump(),
          jsonData: record.payload || record.data || generateMockJson()
        }))
        setMessages(formattedMessages)
      } catch (err) {
        console.error('Failed to fetch signaling messages:', err)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 2000)
    return () => clearInterval(interval)
  }, [sessionId, isPaused])

  const generateMockMessage = (idx: number) => {
    const messages = [
      'vFA0 5GNR securityModeComplete',
      'vFA0 5GNR rrcReconfigurationComplete',
      'vFA0 5GNR measurementReport',
      'vFA0 5GNR paging',
      '5GNR 5GNR MasterInformationBlock',
      '5GNR 5GNR MAC RACH Trigger - CONNECTION_REQUEST',
      '5GNR 5GNR MAC RACH Message - SUCCESS',
      'vFA0 5GNR ueCapabilityInformation',
      'vFA0 5GNR ulInformationTransfer'
    ]
    return messages[idx % messages.length]
  }

  const generateHexDump = () => {
    const lines = []
    for (let i = 0; i < 20; i++) {
      const hex = Array.from({ length: 16 }, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(' ')
      lines.push(`${(i * 16).toString(16).padStart(4, '0')}: ${hex}`)
    }
    return lines.join('\n')
  }

  const generateMockJson = () => ({
    do_5gmm_t_AndF_msgId_u: {
      AndF_msgId: 0,
      securityModeComplete: {
        extendedProtocolDiscriminator: 126,
        securityHeaderType: 3,
        messageType: 95,
        nasMessageContainer: {
          length: 53,
          contents: "..."
        }
      }
    }
  })

  const filteredMessages = messages.filter(msg =>
    !filter || msg.message.toLowerCase().includes(filter.toLowerCase()) ||
    msg.channel.toLowerCase().includes(filter.toLowerCase())
  )

  const getMessageColor = (msg: SignalingMessage) => {
    if (msg.ueNet.includes('UL')) return 'text-cyan-400'
    if (msg.ueNet.includes('DL')) return 'text-pink-400'
    if (msg.channel.includes('BCCH')) return 'text-orange-400'
    return 'text-white'
  }

  const getChannelColor = (channel: string) => {
    if (channel.includes('BCCH')) return 'text-orange-400'
    if (channel.includes('PCCH')) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-2">
        <div className="flex items-center gap-2 mb-2">
          <select className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs">
            <option>None</option>
          </select>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs">Filtering</button>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs">Filtering 2</button>
          <button onClick={() => setIsPaused(!isPaused)} className={`px-3 py-1 border border-gray-600 rounded text-xs ${isPaused ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs">Export</button>
          <button onClick={() => setShowHex(!showHex)} className={`px-3 py-1 border border-gray-600 rounded text-xs ${showHex ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}>Hex</button>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs">Vertically</button>
          <button onClick={() => setMessages([])} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs">Clear</button>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs">Find</button>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs">String Color Setting</button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showSIP} onChange={(e) => setShowSIP(e.target.checked)} className="w-3 h-3" />
            <span>Show SIP</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={freeSize} onChange={(e) => setFreeSize(e.target.checked)} className="w-3 h-3" />
            <span>Free Size</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Show Step1</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Step2</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Step3</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>SACCH Report</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Message List */}
        <div className="w-3/5 border-r border-gray-700 flex flex-col overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="text-left p-2 border-r border-gray-700">Time</th>
                <th className="text-left p-2 border-r border-gray-700">UE NET</th>
                <th className="text-left p-2 border-r border-gray-700">Channel</th>
                <th className="text-left p-2">Message</th>
              </tr>
            </thead>
          </table>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <tbody>
                {filteredMessages.map((msg, idx) => (
                  <tr
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`cursor-pointer border-b border-gray-800 hover:bg-gray-750 ${
                      selectedMessage?.id === msg.id ? 'bg-blue-900' : idx % 2 === 0 ? 'bg-gray-900' : 'bg-black'
                    }`}
                  >
                    <td className="p-2 border-r border-gray-800 font-mono">
                      <span className={getMessageColor(msg)}>{msg.timestamp}</span>
                      <span className="ml-1">{msg.ueNet.includes('UL') ? '→' : '←'}</span>
                    </td>
                    <td className={`p-2 border-r border-gray-800 ${getMessageColor(msg)}`}>
                      {msg.ueNet}
                    </td>
                    <td className={`p-2 border-r border-gray-800 ${getChannelColor(msg.channel)}`}>
                      {msg.channel}
                    </td>
                    <td className={`p-2 ${msg.message.includes('5GNR') ? 'text-green-400' : msg.message.includes('RACH') ? 'text-cyan-400' : 'text-white'}`}>
                      {msg.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel - Message Details */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          {!selectedMessage ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a message to view details
            </div>
          ) : showHex ? (
            <div className="p-4 overflow-auto">
              <div className="text-gray-400 mb-4 text-sm">Hex Dump - {selectedMessage.message}</div>
              <pre className="text-green-400 font-mono text-xs whitespace-pre">
                {selectedMessage.hexData}
              </pre>
            </div>
          ) : (
            <div className="p-4 overflow-auto">
              <div className="mb-4 text-sm">
                <div className="text-blue-400 mb-1">Message: {selectedMessage.message}</div>
                <div className="text-gray-400 mb-1">Time: {selectedMessage.timestamp}</div>
                <div className="text-gray-400 mb-1">Channel: {selectedMessage.channel}</div>
                <div className="text-gray-400">Direction: {selectedMessage.ueNet}</div>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <div className="text-gray-400 mb-2 text-sm">Common</div>
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">
                  {JSON.stringify(selectedMessage.jsonData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
