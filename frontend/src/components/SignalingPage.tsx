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
        setCapturing(false)
        setSessionId(null)
        pushToast("Stream error. Check diag mode and restart capture.", "error")
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
      } catch (err: any) {
        if (err?.status !== 409) {
          pushToast(err?.message || "Failed to stop capture", "error")
        }
      }
    }
    setSessionId(null)
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
    setSessionId(null)
    setMessages([])
    setSelectedMsg(null)
    setCaptureStartTs(null)
    setCapturing(false)
    await handleStartCapture()
  }

  const handleToggleCapture = async () => {
    if (!selectedDevice || !deviceConnected) return
    if (capturing) {
      await handleStopCapture()
    } else {
      await handleStartCapture()
    }
  }

  const bgMain = theme === "dark" ? "bg-slate-900 text-gray-100" : "bg-slate-50 text-gray-800"
  const headerBg = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
  const panelBg = theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"
  const rowOdd = theme === "dark" ? "odd:bg-slate-900" : "odd:bg-slate-50"

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
        dY"
      </div>
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      <div className="text-xs text-gray-400">{subtitle}</div>
      <a
        href="https://reactjs.org/link/react-devtools"
        className="mt-2 text-xs text-blue-600 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        See diagnostic steps (*#0808*)
      </a>
    </div>
  )

  return (
    <div className={`flex h-full ${bgMain}`}>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 border-b ${headerBg}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">Live Signaling Messages</h1>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    capturing ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {capturing ? "Capturing" : "Idle"}
                </span>
                {captureStartTs && (
                  <span className="text-xs text-gray-500">Duration: {formatDuration(captureStartTs)}</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Sélectionne un appareil, lance la capture et surveille les messages RRC/NAS en direct.
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> {devices.filter((d) => d.connected !== false).length} connecté(s)
                </span>
                {lastComPort && <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">Diag port: {lastComPort}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition ${
                  selectedDevice && deviceConnected
                    ? capturing
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!selectedDevice || !deviceConnected}
                onClick={handleToggleCapture}
              >
                {capturing ? "Stop Capture" : "Start Capture"}
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 bg-white hover:border-gray-400 transition"
                onClick={handleRestartCapture}
              >
                Restart
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 bg-white hover:border-gray-400 transition"
                onClick={exportCapture}
              >
                Export
              </button>
              <button
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                onClick={() => setMessages([])}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Device chips */}
        <div className="px-5 py-3 border-b bg-white flex items-center gap-2 flex-wrap">
          {devices
            .filter((d) => d.connected !== false)
            .map((device, idx) => {
              const isActive = selectedDevice === device.deviceId
              const label = device.model || device.deviceId || `Device ${idx + 1}`
              return (
                <button
                  key={device.deviceId || idx}
                  onClick={() => onSelectDevice(device.deviceId)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                    isActive ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                  title={device.deviceId}
                >
                  {label}
                </button>
              )
            })}
          {!devices.some((d) => d.connected !== false) && (
            <span className="text-sm text-gray-500">Aucun appareil connecté</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par message, proto ou device..."
              className="min-w-[220px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="px-2 py-1 rounded-full bg-gray-100">Messages : {filteredMessages.length}</span>
              {capturing && <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">Live</span>}
            </div>
          </div>
        </div>

        {!selectedDevice ? (
          <EmptyState title="Select a device to start" subtitle="1) Plug in diag mode 2) Click Start Capture" />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-gray-200">
              <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs text-gray-700 border-b bg-white">
                <span className="text-gray-500 font-semibold">Filtres :</span>
                <div className="flex items-center gap-2">
                  {["ALL", "UL", "DL"].map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setDirectionFilter(dir as any)}
                      className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                        directionFilter === dir ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {dir === "ALL" ? "All dir" : dir}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {["ALL", "RRC", "NAS"].map((proto) => (
                    <button
                      key={proto}
                      onClick={() => setProtocolFilter(proto as any)}
                      className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                        protocolFilter === proto
                          ? "bg-blue-50 border-blue-400 text-blue-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {proto === "ALL" ? "All proto" : proto}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1 text-gray-500">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Auto-scroll
                  </label>
                  <button
                    className="px-3 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-100 text-xs"
                    onClick={() => setFullscreenTable(true)}
                  >
                    Fullscreen
                  </button>
                </div>
              </div>

              <div
                ref={tableRef}
                className={`flex-1 overflow-auto ${fullscreenTable ? "fixed inset-4 z-50 border shadow-lg bg-white" : ""}`}
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
                    <div className="p-5 space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />
                      ))}
                      <div className="text-xs text-gray-500">Capture en cours... en attente de messages.</div>
                    </div>
                  ) : (
                    <EmptyState title="Aucun message" subtitle="Lance une capture en mode diag pour voir les messages ici." />
                  )
                ) : (
                  <div className="p-4">
                    <div className="overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
                              className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer ${rowOdd} ${
                                selectedMsg?.id === msg.id ? "bg-blue-50" : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-gray-600">{msg.timestamp}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                                    msg.ueNet === "UL" ? "bg-cyan-50 text-cyan-700" : "bg-pink-50 text-pink-700"
                                  }`}
                                >
                                  {msg.direction}
                                </span>
                              </td>
                              <td className={`px-3 py-2 ${getChannelColor(msg.channel)}`}>{msg.channel}</td>
                              <td className={`px-3 py-2 ${getMessageColor(msg.message)}`}>{msg.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-96 bg-slate-50 flex flex-col">
              <div className={`border-b px-4 py-3 bg-white flex items-center justify-between`}>
                <div className="text-sm font-semibold text-gray-700">Message Details</div>
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
                    <div className={`${panelBg} rounded-lg p-3`}>
                      <div className="text-gray-500 mb-1">Timestamp</div>
                      <div className="text-gray-700">{selectedMsg.timestamp}</div>
                    </div>
                    <div className={`${panelBg} rounded-lg p-3`}>
                      <div className="text-gray-500 mb-1">Direction</div>
                      <div className={selectedMsg.ueNet === "UL" ? "text-cyan-600" : "text-pink-600"}>{selectedMsg.direction}</div>
                    </div>
                    <div className={`${panelBg} rounded-lg p-3`}>
                      <div className="text-gray-500 mb-1">Channel</div>
                      <div className={getChannelColor(selectedMsg.channel)}>{selectedMsg.channel}</div>
                    </div>
                    <div className={`${panelBg} rounded-lg p-3`}>
                      <div className="text-gray-500 mb-1">Message</div>
                      <div className={getMessageColor(selectedMsg.message)}>{selectedMsg.message}</div>
                    </div>
                    <div className={`${panelBg} rounded-lg p-3`}>
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
