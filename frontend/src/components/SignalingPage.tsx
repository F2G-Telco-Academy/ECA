
"use client"

import { useEffect, useRef, useState } from "react"
import type { Device } from '@/types'

interface Message {
  id: number
  timestamp: string
  ueNet: "UL" | "DL"
  channel: string
  message: string
  direction: "→" | "←"
  details: string
}

interface Props {
  devices: Device[]
  selectedDevice: string | null
  onSelectDevice: (id: string) => void
  onPacketCount: (count: number) => void
  categoryFilter?: string | null
}

export default function SignalingPage({ devices, selectedDevice, onSelectDevice, onPacketCount, categoryFilter }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [capturing, setCapturing] = useState(false)
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [search, setSearch] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedDevice && capturing) {
      const interval = setInterval(() => {
        const channels = ["UL DCCH", "DL DCCH", "UL CCCH", "DL CCCH", "PCCH", "BCCH BCH", "DL 5GNR"]
        const samples = [
          // RRC-oriented
          "5GNR RRC Reconfiguration Complete",
          "5GNR RRC Security Mode Complete",
          "5GNR RRC Measurement Report",
          // Broadcast info
          "MIB Information",
          "SIB1 Information",
          // NAS samples across RATs
          "NAS 5G Registration Accept",
          "NAS 4G Attach Request",
          "NAS 3G Service Request",
          "NAS 2G Location Update",
          // misc/mac
          "5GNR MAC RACH Trigger",
          "5GNR MAC RACH Trigger - CONNECTION_REQUEST",
          "Paging Indication",
        ]
        const newMsg: Message = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString() + "." + Math.floor(Math.random() * 1000),
          ueNet: Math.random() > 0.5 ? "UL" : "DL",
          channel: channels[Math.floor(Math.random() * channels.length)],
          message: samples[Math.floor(Math.random() * samples.length)],
          direction: Math.random() > 0.5 ? "→" : "←",
          details: JSON.stringify({ version: 13, rrcTransactionId: 0 }, null, 2),
        }
        setMessages(prev => {
          const next = [...prev, newMsg]
          onPacketCount(next.length)
          return next
        })
        if (tableRef.current && autoScroll) tableRef.current.scrollTop = tableRef.current.scrollHeight
      }, 500)
      return () => clearInterval(interval)
    }
  }, [selectedDevice, capturing, autoScroll, onPacketCount])

  const getChannelColor = (channel: string) => {
    if (channel.includes("UL DCCH")) return "text-cyan-600"
    if (channel.includes("DL DCCH")) return "text-green-600"
    if (channel.includes("BCCH")) return "text-yellow-600"
    if (channel.includes("PCCH")) return "text-purple-600"
    if (channel.includes("5GNR")) return "text-pink-600"
    return "text-blue-600"
  }

  const getMessageColor = (message: string) => {
    if (message.includes("Complete")) return "text-green-600"
    if (message.includes("Request")) return "text-cyan-600"
    if (message.includes("paging")) return "text-purple-600"
    if (message.includes("RACH")) return "text-yellow-600"
    return "text-gray-800"
  }

  const matchesCategory = (msg: Message): boolean => {
    const cat = (categoryFilter || '').toLowerCase()
    if (!cat) return true
    const m = msg.message.toLowerCase()
    const ch = msg.channel.toLowerCase()
    switch (cat) {
      case 'rrc':
        return m.includes('rrc') || ch.includes('dcch')
      case 'mib':
        return m.includes('mib') || ch.includes('bcch')
      case 'sib':
        return m.includes('sib') || ch.includes('bcch')
      case 'nas5g':
        return m.includes('nas 5g') || m.includes('5gnr nas')
      case 'nas4g':
        return m.includes('nas 4g') || m.includes('lte nas')
      case 'nas3g':
        return m.includes('nas 3g') || m.includes('wcdma nas')
      case 'nas2g':
        return m.includes('nas 2g') || m.includes('gsm nas')
      default:
        return true
    }
  }
  const filteredMessages = messages
    .filter(matchesCategory)
    .filter(m => {
      const s = search.trim().toLowerCase()
      if (!s) return true
      return (
        m.timestamp.toLowerCase().includes(s) ||
        m.ueNet.toLowerCase().includes(s) ||
        m.channel.toLowerCase().includes(s) ||
        m.message.toLowerCase().includes(s) ||
        m.details.toLowerCase().includes(s)
      )
    })

  const exportCapture = () => {
    const csv =
      "Time,UE-NET,Channel,Message\n" + messages.map(m => `${m.timestamp},${m.ueNet},${m.channel},${m.message}`).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `signaling_${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="flex h-full bg-white text-gray-800">
      <div className="flex-1 flex flex-col">
        {/* Title */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold">Live Signaling Messages - Select a Device</h1>
        </div>

        {/* Status + device chips + controls */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span>{devices?.length || 0} Devices Connected</span>
          </div>
          <div className="flex items-center gap-2">
            {(devices || []).map((d, idx) => (
              <button key={d.deviceId} onClick={() => onSelectDevice(d.deviceId)}
                className={`px-3 py-1.5 rounded border text-xs ${selectedDevice===d.deviceId?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
                {`Mobile ${idx+1}`}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <input
            type="text"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Filter by IP, protocol, or info..."
            className="w-[600px] max-w-[50vw] bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className={`ml-3 px-4 py-2 rounded text-white text-sm ${autoScroll?'bg-black':'bg-gray-700'}`} onClick={()=>setAutoScroll(!autoScroll)}>↓ Auto Scroll</button>
          <button className={`px-4 py-2 rounded border text-sm ${selectedDevice?'bg-white border-gray-300 hover:border-gray-400':'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`} disabled={!selectedDevice} onClick={()=>setCapturing(true)}>⏺ Start Capture</button>
          <button className="px-4 py-2 rounded border text-sm bg-white border-gray-300 hover:border-gray-400" onClick={exportCapture}>💾 Save Capture</button>
        </div>

        {/* Filter toolbar */}
        <div className="border-b border-gray-200 px-4 py-2 bg-gray-50 flex items-center gap-2 text-xs text-gray-700">
          <span className="text-gray-500">Message Filter:</span>
          <select className="bg-white border border-gray-300 rounded px-2 py-1 text-xs"><option>None</option></select>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">Filtering</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">Filtering 2</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded" onClick={()=>setCapturing(!capturing)}>{capturing?'Pause':'Resume'}</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded" onClick={exportCapture}>Export</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">Hex</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">Vertically</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded" onClick={()=>setMessages([])}>Clear</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">Find</button>
          <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">String Color Setting</button>
          <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3" /><span>Detail</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3" /><span>Show Elapsed Time</span></label>
        </div>

        {/* Body */}
        {!selectedDevice ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 mb-4 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200"><div className="w-8 h-8 border-2 border-gray-300 rounded" /></div>
            <div className="text-sm text-gray-500">Select a device to start</div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Messages Table */}
            <div className="flex-1 flex flex-col border-r border-gray-200">
              <div ref={tableRef} className="flex-1 overflow-auto bg-white">
                {filteredMessages.length===0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-gray-500">{capturing?'Waiting for messages...':'Click Resume to start capture'}</div>
                ) : (
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 w-32">Time</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 w-20">UE-NET</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 w-32">Channel</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMessages.map(msg => (
                        <tr key={msg.id} onClick={()=>setSelectedMsg(msg)} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedMsg?.id===msg.id?'bg-gray-50':''}`}>
                          <td className="px-3 py-1.5 text-gray-600">{msg.timestamp}</td>
                          <td className="px-3 py-1.5"><span className={msg.ueNet==='UL'?'text-cyan-600':'text-pink-600'}>{msg.direction} {msg.ueNet}</span></td>
                          <td className={`px-3 py-1.5 ${getChannelColor(msg.channel)}`}>{msg.channel}</td>
                          <td className={`px-3 py-1.5 ${getMessageColor(msg.message)}`}>{msg.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Message Details Panel */}
            <div className="w-96 bg-gray-50 flex flex-col">
              <div className="border-b border-gray-200 px-4 py-2 bg-white"><div className="text-xs font-semibold text-gray-600">MESSAGE DETAILS</div></div>
              <div className="flex-1 overflow-auto p-4">
                {selectedMsg ? (
                  <div className="space-y-3 text-xs font-mono">
                    <div className="bg-white rounded p-3 border border-gray-200"><div className="text-gray-500 mb-1">Timestamp</div><div className="text-gray-700">{selectedMsg.timestamp}</div></div>
                    <div className="bg-white rounded p-3 border border-gray-200"><div className="text-gray-500 mb-1">Direction</div><div className={selectedMsg.ueNet==='UL'?'text-cyan-600':'text-pink-600'}>{selectedMsg.ueNet} {selectedMsg.direction}</div></div>
                    <div className="bg-white rounded p-3 border border-gray-200"><div className="text-gray-500 mb-1">Channel</div><div className={getChannelColor(selectedMsg.channel)}>{selectedMsg.channel}</div></div>
                    <div className="bg-white rounded p-3 border border-gray-200"><div className="text-gray-500 mb-1">Message</div><div className={getMessageColor(selectedMsg.message)}>{selectedMsg.message}</div></div>
                    <div className="bg-white rounded p-3 border border-gray-200"><div className="text-gray-500 mb-2">Details</div><pre className="text-gray-700 text-xs whitespace-pre-wrap">{selectedMsg.details}</pre></div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center"><div className="w-12 h-12 mb-3 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200"><div className="w-6 h-6 border-2 border-gray-300 rounded" /></div><div className="text-xs text-gray-500">Select a message to view details</div></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
