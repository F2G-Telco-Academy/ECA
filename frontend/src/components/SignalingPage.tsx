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
  direction: "UL" | "DL"
  details: string
}

interface Toast {
  id: number
  text: string
  tone: "success" | "error"
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
  const [captureStartTs, setCaptureStartTs] = useState<number | null>(null)
  const [lastComPort, setLastComPort] = useState<string>("Auto")
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "UL" | "DL">("ALL")
  const [protocolFilter, setProtocolFilter] = useState<"ALL" | "RRC" | "NAS">("ALL")
  const [fullscreenTable, setFullscreenTable] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const tableRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<EventSource | null>(null)

  const deviceConnected = selectedDevice
    ? devices.some((d) => d.deviceId === selectedDevice && d.connected !== false)
    : false

  useEffect(() => {
    if (selectedDevice && !deviceConnected && capturing) {
      setCapturing(false)
      streamRef.current?.close()
    }
  }, [selectedDevice, deviceConnected, capturing])

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
            direction: data.direction === "UL" ? "UL" : "DL",
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
    .filter((m) => (directionFilter === "ALL" ? true : m.ueNet === directionFilter))
    .filter((m) => {
      if (protocolFilter === "ALL") return true
      const lowerMsg = m.message.toLowerCase()
      if (protocolFilter === "RRC") return lowerMsg.includes("rrc")
      if (protocolFilter === "NAS") return lowerMsg.includes("nas")
      return true
    })
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

  const pushToast = (text: string, tone: "success" | "error") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, text, tone }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  const handleStartCapture = async () => {
    if (!selectedDevice || !deviceConnected) return
    setCapturing(true)
    setMessages([])
    setSelectedMsg(null)
    try {
      const session = await api.startSession(selectedDevice)
      setSessionId(session.id as number)
      setCaptureStartTs(Date.now())
      if (session.sessionDir) {
        const match = session.sessionDir.match(/COM(\d+)/i)
        if (match?.[1]) {
          setLastComPort(`COM${match[1]}`)
        }
      }
      pushToast("Capture started", "success")
    } catch (err: any) {
      setCapturing(false)
      pushToast(err?.message || "Failed to start capture", "error")
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
    setCaptureStartTs(null)
    pushToast("Capture stopped", "success")
  }

  const handleRestartCapture = async () => {
    if (sessionId) {
      try {
        await api.stopSession(sessionId)
      } catch {}
    }
    setMessages([])
    setSelectedMsg(null)
    setCaptureStartTs(null)
    setCapturing(false)
    await handleStartCapture()
  }

  const bgMain = theme === "dark" ? "bg-slate-900 text-gray-100" : "bg-white text-gray-800"
  const headerBg = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
  const toolbarBg = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-gray-50 border-gray-200"
  const rowOdd = theme === "dark" ? "odd:bg-slate-900" : "odd:bg-gray-50"

  const formatDuration = (start: number | null) => {
    if (!start) return "00:00"
    const ms = Date.now() - start
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    const hr = Math.floor(min / 60)
    const mm = String(min % 60).padStart(2, "0")
    const ss = String(sec).padStart(2, "0")
    return hr > 0 ? `${hr}:${mm}:${ss}` : `${mm}:${ss}`
  }

  const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 mb-4 rounded-xl border border-dashed border-gray-400 flex items-center justify-center text-3xl text-gray-400">
        📡
      </div>
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      <div className="text-xs text-gray-400">{subtitle}</div>
      <a
        href="https://reactjs.org/link/react-devtools"
        className="mt-2 text-xs text-blue-600 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        Voir la doc diag (*#0808*)
      </a>
    </div>
  )

  return (
    <div className={`flex h-full ${bgMain}`}>
      <div className="flex-1 flex flex-col">
        <div className={`px-4 sm:px-6 py-4 border-b ${headerBg}`}>
          <h1 className="text-lg font-semibold">Live Signaling Messages</h1>
          <p className="text-sm text-gray-500">Sélectionnez un device et démarrez la capture.</p>
        </div>

        {/* Barre d'état + actions regroupées */}
        <div className={`px-4 sm:px-6 py-3 border-b flex flex-wrap items-center gap-3 ${headerBg}`}>
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white shadow-sm">
            <span className={`w-2 h-2 rounded-full ${capturing ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="font-semibold">{capturing ? "Capturing" : "Idle"}</span>
            <span className="text-gray-500 text-xs">Device: {selectedDevice || "None"}</span>
            <span className="text-gray-500 text-xs">Port: {lastComPort}</span>
            <span className="text-gray-500 text-xs">Durée: {formatDuration(captureStartTs)}</span>
            <span className="text-gray-500 text-xs">Packets: {messages.length}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter messages..."
              className="min-w-[200px] bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              className={`px-4 py-2 rounded text-white text-sm ${autoScroll ? "bg-black" : "bg-gray-600"}`}
              onClick={() => setAutoScroll(!autoScroll)}
            >
              Auto Scroll
            </button>
            <button
              className={`px-4 py-2 rounded border text-sm ${
                selectedDevice && deviceConnected
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : "bg-gray-100 border-gray-200 text-gray-400"
              }`}
              disabled={!selectedDevice || !deviceConnected}
              onClick={handleStartCapture}
            >
              Start Capture
            </button>
            <button
              className={`px-4 py-2 rounded border text-sm ${
                capturing ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" : "bg-gray-100 border-gray-200 text-gray-400"
              }`}
              disabled={!capturing}
              onClick={handleStopCapture}
            >
              Stop Capture
            </button>
            <button
              className="px-4 py-2 rounded border text-sm bg-white border-gray-300 hover:border-gray-400"
              onClick={handleRestartCapture}
            >
              Restart
            </button>
            <button className="px-4 py-2 rounded border text-sm bg-white border-gray-300 hover:border-gray-400" onClick={exportCapture}>
              Export
            </button>
            <button
              className="px-4 py-2 rounded border text-sm bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
              onClick={() => setMessages([])}
            >
              Clear
            </button>
          </div>
        </div>

        {!selectedDevice ? (
          <EmptyState title="Select a device to start" subtitle="1) Brancher en diag 2) Cliquer Start Capture" />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-gray-200">
              <div className={`flex flex-wrap items-center gap-3 px-4 py-2 text-xs text-gray-700 border-b ${toolbarBg}`}>
                <span>Filtres :</span>
                <select
                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value as any)}
                >
                  <option value="ALL">All dir</option>
                  <option value="UL">UL</option>
                  <option value="DL">DL</option>
                </select>
                <select
                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                  value={protocolFilter}
                  onChange={(e) => setProtocolFilter(e.target.value as any)}
                >
                  <option value="ALL">All proto</option>
                  <option value="RRC">RRC</option>
                  <option value="NAS">NAS</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-xs"
                    onClick={() => setFullscreenTable(true)}
                  >
                    Fullscreen
                  </button>
                  <span className="text-gray-500">Messages: {filteredMessages.length}</span>
                </div>
              </div>

              <div
                ref={tableRef}
                className={`flex-1 overflow-auto bg-white max-h-[720px] ${fullscreenTable ? "fixed inset-4 z-50 border shadow-lg" : ""}`}
              >
                {fullscreenTable && (
                  <div className="flex justify-end px-4 py-2 bg-white border-b border-gray-200">
                    <button
                      className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-sm"
                      onClick={() => setFullscreenTable(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
                {filteredMessages.length === 0 ? (
                  capturing ? (
                    <div className="grid grid-cols-1 gap-2 p-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse h-8 bg-gray-100 rounded" />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No messages yet" subtitle="Brancher en diag puis Start Capture" />
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
              <div className="border-b border-gray-200 px-4 py-2 bg-white flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-600">Message Details</div>
                {selectedMsg && (
                  <button
                    className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMsg.details || "")
                      pushToast("Copied", "success")
                    }}
                  >
                    Copy
                  </button>
                )}
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

      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded shadow text-sm ${t.tone === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
