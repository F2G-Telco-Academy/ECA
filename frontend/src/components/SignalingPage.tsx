"use client"

import { useEffect, useRef, useState } from "react"
import type { Device, SignalingRecord } from "@/types"
import { api } from "@/utils/api"

interface Message {
  id: number
  timestamp: string
  ueNet: "UL" | "DL"
  channel: string
  message: string
  direction: "↑ UL" | "↓ DL"
  details: string
}

interface Props {
  devices: Device[]
  selectedDevice: string | null
  onSelectDevice: (id: string) => void
  onPacketCount: (count: number) => void
  categoryFilter?: string | null
  theme?: "light" | "dark"
}

export default function SignalingPage({
  devices,
  selectedDevice,
  onSelectDevice,
  onPacketCount,
  categoryFilter,
  theme = "light",
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [capturing, setCapturing] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [search, setSearch] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<EventSource | null>(null)

  const deviceConnected = selectedDevice
    ? devices.some((d) => d.deviceId === selectedDevice && d.connected !== false)
    : false

  // Stop capture if the selected device is no longer connected
  useEffect(() => {
    if (selectedDevice && !deviceConnected && capturing) {
      setCapturing(false)
      streamRef.current?.close()
    }
  }, [selectedDevice, deviceConnected, capturing])

  // Open SSE stream when sessionId/capture is active
  useEffect(() => {
    if (sessionId && capturing && deviceConnected) {
      streamRef.current?.close()
      const es = api.createSignalingStream(sessionId)
      streamRef.current = es
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as Partial<SignalingRecord>
          const msg: Message = {
            id: Date.now(),
            timestamp: data.timestamp || new Date().toISOString(),
            ueNet: (data.direction as "UL" | "DL") || "DL",
            channel: data.layer || data.protocol || "N/A",
            message: data.messageType || data.protocol || "Unknown",
            direction: data.direction === "UL" ? "↑ UL" : "↓ DL",
            details: data.decodedData || data.hexData || JSON.stringify(data.payloadJson || {}, null, 2),
          }
          setMessages((prev) => {
            const next = [...prev, msg].slice(-1000)
            onPacketCount(next.length)
            return next
          })
          if (tableRef.current && autoScroll) tableRef.current.scrollTop = tableRef.current.scrollHeight
        } catch (err) {
          console.error("Failed to parse signaling message", err, e.data)
        }
      }
      es.onerror = (err) => {
        console.warn("Signaling stream error", err)
        es.close()
      }
      return () => es.close()
    }
    return () => {
      streamRef.current?.close()
    }
  }, [sessionId, capturing, deviceConnected, autoScroll, onPacketCount])

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
    if (message.includes("Paging")) return "text-purple-600"
    if (message.includes("RACH")) return "text-yellow-600"
    return "text-gray-800"
  }

  const matchesCategory = (msg: Message): boolean => {
    const cat = (categoryFilter || "").toLowerCase()
    if (!cat) return true
    const m = msg.message.toLowerCase()
    const ch = msg.channel.toLowerCase()
    switch (cat) {
      case "rrc":
        return m.includes("rrc") || ch.includes("dcch")
      case "mib":
        return m.includes("mib") || ch.includes("bcch")
      case "sib":
        return m.includes("sib") || ch.includes("bcch")
      case "nas5g":
        return m.includes("nas 5g") || m.includes("5gnr nas")
      case "nas4g":
        return m.includes("nas 4g") || m.includes("lte nas")
      case "nas3g":
        return m.includes("nas 3g") || m.includes("wcdma nas")
      case "nas2g":
        return m.includes("nas 2g") || m.includes("gsm nas")
      default:
        return true
    }
  }

  const filteredMessages = messages
    .filter(matchesCategory)
    .filter((m) => {
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
      "Time,UE-NET,Channel,Message\n" + messages.map((m) => `${m.timestamp},${m.ueNet},${m.channel},${m.message}`).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `signaling_${Date.now()}.csv`
    a.click()
  }

  const handleStartCapture = async () => {
    if (!selectedDevice || !deviceConnected) return
    setCapturing(true)
    try {
      const session = await api.startSession(selectedDevice)
      setSessionId(session.id as number)
      setMessages([])
      setSelectedMsg(null)
    } catch (err: any) {
      setCapturing(false)
      alert(err?.message || "Failed to start capture")
    }
  }

  const handleStopCapture = async () => {
    if (sessionId) {
      try {
        await api.stopSession(sessionId)
      } catch {}
    }
    setCapturing(false)
    streamRef.current?.close()
  }

  const bgMain = theme === "dark" ? "bg-slate-900 text-gray-100" : "bg-white text-gray-800"
  const headerBg = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
  const toolbarBg = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-gray-50 border-gray-200"
  const rowOdd = theme === "dark" ? "odd:bg-slate-900" : "odd:bg-gray-50"

  const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 mb-4 rounded-xl border border-dashed border-gray-400 flex items-center justify-center text-3xl text-gray-400">
        📡
      </div>
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      <div className="text-xs text-gray-400">{subtitle}</div>
    </div>
  )

  return (
    <div className={`flex h-full ${bgMain}`}>
      <div className="flex-1 flex flex-col">
        <div className={`px-4 sm:px-6 py-4 border-b ${headerBg}`}>
          <h1 className="text-lg font-semibold">Live Signaling Messages</h1>
          <p className="text-sm text-gray-500">Select a device to view its signaling messages in real time.</p>
        </div>

        <div className={`px-4 sm:px-6 py-3 border-b flex flex-wrap items-center gap-3 ${headerBg}`}>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span>{devices?.length || 0} Devices Connected</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(devices || []).map((d, idx) => (
              <button
                key={d.deviceId}
                onClick={() => onSelectDevice(d.deviceId)}
                className={`px-3 py-1.5 rounded border text-xs whitespace-nowrap flex items-center gap-2 ${
                  selectedDevice === d.deviceId
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-left leading-tight">
                  <div>{`Mobile ${idx + 1}`}</div>
                  <div className="text-[11px] text-gray-500">{d.model || d.manufacturer || d.deviceId}</div>
                </span>
                <span className="text-[11px] text-gray-400">{d.status?.toLowerCase?.()}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter messages..."
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            className={`px-4 py-2 rounded text-white text-sm ${autoScroll ? "bg-black" : "bg-gray-600"}`}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            Auto Scroll
          </button>
          <button
            className={`px-4 py-2 rounded border text-sm ${
              selectedDevice && deviceConnected
                ? "bg-white border-gray-300 hover:border-gray-400"
                : "bg-gray-100 border-gray-200 text-gray-400"
            }`}
            disabled={!selectedDevice || !deviceConnected}
            onClick={handleStartCapture}
          >
            Start Capture
          </button>
          <button
            className={`px-4 py-2 rounded border text-sm ${
              capturing ? "bg-white border-gray-300 hover:border-gray-400" : "bg-gray-100 border-gray-200 text-gray-400"
            }`}
            disabled={!capturing}
            onClick={handleStopCapture}
          >
            Stop Capture
          </button>
          <button className="px-4 py-2 rounded border text-sm bg-white border-gray-300 hover:border-gray-400" onClick={exportCapture}>
            Save Capture
          </button>
        </div>

        {!selectedDevice ? (
          <EmptyState title="Select a device to start" subtitle="Choose one of the connected mobiles above" />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-gray-200">
              <div className={`flex flex-wrap items-center gap-2 px-4 py-2 text-xs text-gray-700 border-b ${toolbarBg}`}>
                <span>Message Filter:</span>
                <select className="bg-white border border-gray-300 rounded px-2 py-1 text-xs">
                  <option>None</option>
                </select>
                <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">Filtering</button>
                <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded">Filtering 2</button>
                <button
                  className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded"
                  onClick={() => setCapturing((v) => !v)}
                >
                  {capturing ? "Pause" : "Resume"}
                </button>
                <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded" onClick={exportCapture}>
                  Export
                </button>
                <button className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded" onClick={() => setMessages([])}>
                  Clear
                </button>
              </div>

              <div ref={tableRef} className="flex-1 overflow-auto bg-white max-h-[720px]">
                {filteredMessages.length === 0 ? (
                  capturing ? (
                    <div className="grid grid-cols-1 gap-2 p-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse h-8 bg-gray-100 rounded" />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No messages yet" subtitle="Click Resume to start capture" />
                  )
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-xs font-mono">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600 w-32">Time</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600 w-20">UE-NET</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600 w-32">Channel</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMessages.map((msg) => (
                          <tr
                            key={msg.id}
                            onClick={() => setSelectedMsg(msg)}
                            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${rowOdd} ${
                              selectedMsg?.id === msg.id ? "bg-blue-50" : ""
                            }`}
                          >
                            <td className="px-3 py-1.5 text-gray-600">{msg.timestamp}</td>
                            <td className="px-3 py-1.5">
                              <span className={msg.ueNet === "UL" ? "text-cyan-600" : "text-pink-600"}>{msg.direction}</span>
                            </td>
                            <td className={`px-3 py-1.5 ${getChannelColor(msg.channel)}`}>{msg.channel}</td>
                            <td className={`px-3 py-1.5 ${getMessageColor(msg.message)}`}>{msg.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-96 bg-gray-50 flex flex-col">
              <div className="border-b border-gray-200 px-4 py-2 bg-white">
                <div className="text-xs font-semibold text-gray-600">Message Details</div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {selectedMsg ? (
                  <div className="space-y-3 text-xs font-mono">
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <div className="text-gray-500 mb-1">Timestamp</div>
                      <div className="text-gray-700">{selectedMsg.timestamp}</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <div className="text-gray-500 mb-1">Direction</div>
                      <div className={selectedMsg.ueNet === "UL" ? "text-cyan-600" : "text-pink-600"}>{selectedMsg.direction}</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <div className="text-gray-500 mb-1">Channel</div>
                      <div className={getChannelColor(selectedMsg.channel)}>{selectedMsg.channel}</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <div className="text-gray-500 mb-1">Message</div>
                      <div className={getMessageColor(selectedMsg.message)}>{selectedMsg.message}</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <div className="text-gray-500 mb-2">Details</div>
                      <pre className="text-gray-700 text-xs whitespace-pre-wrap">{selectedMsg.details}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-12 h-12 mb-3 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <div className="w-6 h-6 border-2 border-gray-300 rounded" />
                    </div>
                    <div className="text-xs text-gray-500">Select a message to view details</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
