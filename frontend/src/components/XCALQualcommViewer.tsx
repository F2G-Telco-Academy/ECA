import { useState, useEffect, useRef } from 'react'
import { api } from '@/utils/api'

interface QualcommMessage {
  timestamp: string
  messageType: string
  details: any
}

export default function XCALQualcommViewer({ sessionId }: { sessionId: string | null }) {
  const [messages, setMessages] = useState<QualcommMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<QualcommMessage | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const messageListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sessionId || isPaused) return

    const fetchMessages = async () => {
      try {
        const qualcommMessages: QualcommMessage[] = Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 1000).toLocaleTimeString(),
          messageType: generateMessageType(),
          details: generateMessageDetails()
        }))
        setMessages(prev => [...qualcommMessages, ...prev].slice(0, 500))
      } catch (err) {
        console.error('Failed to fetch Qualcomm messages:', err)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 2000)
    return () => clearInterval(interval)
  }, [sessionId, isPaused])

  const generateMessageType = () => {
    const types = [
      'NR5G ML1 UE TB State',
      'NR5G ML1 FW MAC-TL-B Power',
      'NR5G ML1 AFC Services',
      'NR5G ML1 AFC Services',
      'NR5G LL1 FW CSF Reports',
      'NR5G MAC PDSCH State',
      'NR5G MAC UL TB State',
      'NR5G MAC LCH State',
      'NR5G MAC UCI Information',
      'NR5G MAC CSF Report',
      'NR5G MAC PDSCH State',
      'NR5G MAC UL TB State',
      'NR5G ML1 Searcher Measurement Database Update Ext',
      'NR5G MAC BRS Report',
      'NR5G ML1 RLM State',
      'NR5G MAC PDSCH State',
      'NR5G MAC UL TB State',
      'NR5G MAC LCH State',
      'NR5G MAC UL TB State',
      'NR5G PDCP DL Plus State',
      'NR5G LL1 FW MAC-TL-B Power',
      'NR5G LL1 FW Serving FTL',
      'NR5G LL1 LDM Serving SNR'
    ]
    return types[Math.floor(Math.random() * types.length)]
  }

  const generateMessageDetails = () => {
    return {
      version: 1,
      rrc_rel: 15,
      rrc_ver_major: 4,
      rrc_ver_minor: 0,
      nas_data_length: 37,
      pdu_num: Math.floor(Math.random() * 100),
      pdu_len: Math.floor(Math.random() * 200),
      measResult: {
        rsrp: -Math.floor(Math.random() * 50 + 80),
        rsrq: -Math.floor(Math.random() * 20 + 10),
        sinr: Math.floor(Math.random() * 30)
      },
      serving_cell: {
        pci: Math.floor(Math.random() * 500),
        earfcn: Math.floor(Math.random() * 40000 + 390000),
        band: Math.floor(Math.random() * 100)
      },
      mac_params: {
        ul_index: Math.floor(Math.random() * 10),
        dl_index: Math.floor(Math.random() * 10),
        rnti: `0x${Math.floor(Math.random() * 65535).toString(16)}`,
        harq_id: Math.floor(Math.random() * 16)
      },
      phy_params: {
        num_prb: Math.floor(Math.random() * 273),
        mcs: Math.floor(Math.random() * 28),
        num_layers: Math.floor(Math.random() * 4) + 1,
        cqi: Math.floor(Math.random() * 15)
      }
    }
  }

  const filteredMessages = messages.filter(msg =>
    !filter || msg.messageType.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Left Panel - Message List */}
      <div className="w-96 flex flex-col border-r border-gray-700">
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setIsPaused(!isPaused)} className={`px-3 py-1 rounded text-xs ${isPaused ? 'bg-green-600' : 'bg-yellow-600'}`}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={() => setMessages([])} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs">Clear</button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Filter</button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Filter2</button>
          </div>
          <div className="flex gap-2 items-center text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" className="w-3 h-3" />
              <span>Show Clipped Time</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" className="w-3 h-3" />
              <span>Detail</span>
            </label>
          </div>
        </div>

        <div ref={messageListRef} className="flex-1 overflow-auto bg-black font-mono text-xs">
          <table className="w-full">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="text-left p-2 border-r border-gray-700">Time</th>
                <th className="text-left p-2">Message Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedMessage(msg)}
                  className={`cursor-pointer hover:bg-gray-800 ${selectedMessage === msg ? 'bg-blue-900' : ''}`}
                >
                  <td className="p-2 border-r border-gray-900 text-cyan-400">{msg.timestamp}</td>
                  <td className="p-2 text-green-400">{msg.messageType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Panel - Message Details (JSON View) */}
      <div className="flex-1 flex flex-col bg-black">
        <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div className="text-sm font-semibold">Message Details</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Copy</button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Export</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          {selectedMessage ? (
            <div className="space-y-1">
              <div className="text-blue-400">{'{'}</div>
              <div className="pl-4">
                <span className="text-cyan-400">"timestamp"</span>: <span className="text-yellow-400">"{selectedMessage.timestamp}"</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"messageType"</span>: <span className="text-yellow-400">"{selectedMessage.messageType}"</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"version"</span>: <span className="text-green-400">{selectedMessage.details.version}</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"rrc_rel"</span>: <span className="text-green-400">{selectedMessage.details.rrc_rel}</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"rrc_ver_major"</span>: <span className="text-green-400">{selectedMessage.details.rrc_ver_major}</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"rrc_ver_minor"</span>: <span className="text-green-400">{selectedMessage.details.rrc_ver_minor}</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"nas_data_length"</span>: <span className="text-green-400">{selectedMessage.details.nas_data_length}</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"pdu_num"</span>: <span className="text-green-400">{selectedMessage.details.pdu_num}</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"pdu_len"</span>: <span className="text-green-400">{selectedMessage.details.pdu_len}</span>,
              </div>
              <div className="pl-4">
                <span className="text-cyan-400">"measResult"</span>: {'{'}
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"rsrp"</span>: <span className="text-green-400">{selectedMessage.details.measResult.rsrp}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"rsrq"</span>: <span className="text-green-400">{selectedMessage.details.measResult.rsrq}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"sinr"</span>: <span className="text-green-400">{selectedMessage.details.measResult.sinr}</span>
              </div>
              <div className="pl-4">{'}'}, </div>
              <div className="pl-4">
                <span className="text-cyan-400">"serving_cell"</span>: {'{'}
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"pci"</span>: <span className="text-green-400">{selectedMessage.details.serving_cell.pci}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"earfcn"</span>: <span className="text-green-400">{selectedMessage.details.serving_cell.earfcn}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"band"</span>: <span className="text-green-400">{selectedMessage.details.serving_cell.band}</span>
              </div>
              <div className="pl-4">{'}'}, </div>
              <div className="pl-4">
                <span className="text-cyan-400">"mac_params"</span>: {'{'}
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"ul_index"</span>: <span className="text-green-400">{selectedMessage.details.mac_params.ul_index}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"dl_index"</span>: <span className="text-green-400">{selectedMessage.details.mac_params.dl_index}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"rnti"</span>: <span className="text-yellow-400">"{selectedMessage.details.mac_params.rnti}"</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"harq_id"</span>: <span className="text-green-400">{selectedMessage.details.mac_params.harq_id}</span>
              </div>
              <div className="pl-4">{'}'}, </div>
              <div className="pl-4">
                <span className="text-cyan-400">"phy_params"</span>: {'{'}
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"num_prb"</span>: <span className="text-green-400">{selectedMessage.details.phy_params.num_prb}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"mcs"</span>: <span className="text-green-400">{selectedMessage.details.phy_params.mcs}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"num_layers"</span>: <span className="text-green-400">{selectedMessage.details.phy_params.num_layers}</span>,
              </div>
              <div className="pl-8">
                <span className="text-cyan-400">"cqi"</span>: <span className="text-green-400">{selectedMessage.details.phy_params.cqi}</span>
              </div>
              <div className="pl-4">{'}'}</div>
              <div className="text-blue-400">{'}'}</div>
            </div>
          ) : (
            <div className="text-gray-500 text-center mt-10">Select a message to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}
