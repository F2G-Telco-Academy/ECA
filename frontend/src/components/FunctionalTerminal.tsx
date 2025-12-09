import { useState, useEffect, useRef } from 'react'
import { api } from '@/utils/api'

interface Props {
  sessionId: number | null
}

interface PacketLine {
  no: string
  time: string
  source: string
  destination: string
  protocol: string
  length: string
  info: string
}

export default function FunctionalTerminal({ sessionId }: Props) {
  const [packets, setPackets] = useState<PacketLine[]>([])
  const [selectedPacket, setSelectedPacket] = useState<PacketLine | null>(null)
  const [filter, setFilter] = useState('')
  const [appliedFilter, setAppliedFilter] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const terminalRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!sessionId) return

    // Start SSE stream for real-time packets
    startPacketStream()

    return () => {
      stopPacketStream()
    }
  }, [sessionId])

  const startPacketStream = () => {
    if (!sessionId) return

    setConnectionStatus('connecting')
    setIsStreaming(true)

    try {
      const eventSource = api.createLogStream(sessionId)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setConnectionStatus('connected')
        console.log('Terminal stream connected')
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Parse packet data
          const packet: PacketLine = {
            no: data.frameNumber || packets.length + 1,
            time: data.timestamp || new Date().toISOString(),
            source: data.source || 'N/A',
            destination: data.destination || 'N/A',
            protocol: data.protocol || 'GSMTAP',
            length: data.length || '0',
            info: data.info || data.message || 'Packet data'
          }

          setPackets(prev => [...prev, packet].slice(-1000)) // Keep last 1000 packets
          
          // Auto-scroll to bottom
          if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight
          }
        } catch (error) {
          console.error('Failed to parse packet:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('Stream error:', error)
        setConnectionStatus('disconnected')
        setIsStreaming(false)
      }
    } catch (error) {
      console.error('Failed to start stream:', error)
      setConnectionStatus('disconnected')
      setIsStreaming(false)
    }
  }

  const stopPacketStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
    setConnectionStatus('disconnected')
  }

  const applyFilter = () => {
    setAppliedFilter(filter)
  }

  const clearPackets = () => {
    setPackets([])
    setSelectedPacket(null)
  }

  const filteredPackets = appliedFilter
    ? packets.filter(p => 
        p.protocol.toLowerCase().includes(appliedFilter.toLowerCase()) ||
        p.info.toLowerCase().includes(appliedFilter.toLowerCase())
      )
    : packets

  const getProtocolColor = (protocol: string) => {
    if (protocol.includes('RRC')) return 'text-blue-400'
    if (protocol.includes('NAS')) return 'text-purple-400'
    if (protocol.includes('MAC')) return 'text-green-400'
    if (protocol.includes('GSMTAP')) return 'text-cyan-400'
    return 'text-slate-400'
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Terminal Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium text-slate-300">
                {connectionStatus === 'connected' ? 'Streaming' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-slate-400">
              {filteredPackets.length} packets
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
              placeholder="Display filter (e.g., RRC, NAS)"
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button
              onClick={applyFilter}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Apply
            </button>
            {appliedFilter && (
              <button
                onClick={() => { setFilter(''); setAppliedFilter('') }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
              >
                Clear Filter
              </button>
            )}
            <button
              onClick={clearPackets}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={isStreaming ? stopPacketStream : startPacketStream}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isStreaming
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isStreaming ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      </div>

      {/* Packet List */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto font-mono text-xs" ref={terminalRef}>
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left w-16">No.</th>
                <th className="px-3 py-2 text-left w-32">Time</th>
                <th className="px-3 py-2 text-left w-32">Source</th>
                <th className="px-3 py-2 text-left w-32">Destination</th>
                <th className="px-3 py-2 text-left w-24">Protocol</th>
                <th className="px-3 py-2 text-left w-20">Length</th>
                <th className="px-3 py-2 text-left">Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackets.map((packet, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedPacket(packet)}
                  className={`cursor-pointer transition-colors ${
                    selectedPacket === packet
                      ? 'bg-blue-900/50'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-3 py-1 text-slate-400">{packet.no}</td>
                  <td className="px-3 py-1 text-slate-400">{packet.time}</td>
                  <td className="px-3 py-1 text-cyan-400">{packet.source}</td>
                  <td className="px-3 py-1 text-green-400">{packet.destination}</td>
                  <td className={`px-3 py-1 font-semibold ${getProtocolColor(packet.protocol)}`}>
                    {packet.protocol}
                  </td>
                  <td className="px-3 py-1 text-slate-400">{packet.length}</td>
                  <td className="px-3 py-1 text-slate-300">{packet.info}</td>
                </tr>
              ))}
              {filteredPackets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    {appliedFilter ? 'No packets match the filter' : 'Waiting for packets...'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Packet Details Panel */}
        {selectedPacket && (
          <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-auto">
            <div className="p-4">
              <div className="text-sm font-semibold text-slate-200 mb-4">Packet Details</div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-slate-500 mb-1">Frame Number</div>
                  <div className="text-slate-300 font-mono">{selectedPacket.no}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Timestamp</div>
                  <div className="text-slate-300 font-mono">{selectedPacket.time}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Source</div>
                  <div className="text-cyan-400 font-mono">{selectedPacket.source}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Destination</div>
                  <div className="text-green-400 font-mono">{selectedPacket.destination}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Protocol</div>
                  <div className={`font-mono font-semibold ${getProtocolColor(selectedPacket.protocol)}`}>
                    {selectedPacket.protocol}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Length</div>
                  <div className="text-slate-300 font-mono">{selectedPacket.length} bytes</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Info</div>
                  <div className="text-slate-300 break-words">{selectedPacket.info}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>Session: {sessionId || 'None'}</span>
          <span>Packets: {filteredPackets.length}</span>
          {appliedFilter && <span>Filter: {appliedFilter}</span>}
        </div>
        <div>
          TShark Integration Active
        </div>
      </div>
    </div>
  )
}
