import { useState, useEffect, useRef } from 'react'
import { api } from '@/utils/api'

interface LogEntry {
  timestamp: string
  direction: string
  channel: string
  message: string
  details?: any
}

export default function XCALTerminalViewer({ sessionId }: { sessionId: string | null }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [showSIP, setShowSIP] = useState(false)
  const [showStep1, setShowStep1] = useState(false)
  const [showStep2, setShowStep2] = useState(false)
  const [showStep3, setShowStep3] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sessionId || isPaused) return

    const fetchLogs = async () => {
      try {
        const data = await api.getRecords(sessionId, { page: 0, size: 100 })
        const newLogs: LogEntry[] = (data.content || []).map((record: any) => ({
          timestamp: record.timestamp || new Date().toLocaleTimeString(),
          direction: record.direction || (Math.random() > 0.5 ? 'UL DCCH' : 'DL DCCH'),
          channel: record.channel || (Math.random() > 0.3 ? 'PCCH' : 'BCCH BCH'),
          message: record.message || generateRandomMessage(),
          details: record
        }))
        setLogs(prev => [...newLogs, ...prev].slice(0, 500))
      } catch (err) {
        console.error('Failed to fetch logs:', err)
      }
    }

    fetchLogs()
    const interval = setInterval(fetchLogs, 1500)
    return () => clearInterval(interval)
  }, [sessionId, isPaused])

  useEffect(() => {
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [logs, isPaused])

  const generateRandomMessage = () => {
    const messages = [
      'vPAG 5GNR rrcReconfigurationComplete',
      'vPAG 5GNR measurementReport',
      'vPAG 5GNR ueCapabilityInformation',
      '5GNR 5GNR MeasurementBlock',
      'vPAG 5GNR paging',
      'vPAG 5GNR rrcSetupComplete',
      'vPAG 5GNR securityModeComplete',
      '5GNR 5GNR MAC RACH Trigger - CONNECTION_REQUEST',
      '5GNR 5GNR MAC RACH Trigger - HANDOVER_SUCCESS'
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const getMessageColor = (message: string, direction: string) => {
    if (direction.includes('UL')) return '#00ffff'
    if (direction.includes('DL')) return '#ff00ff'
    if (message.includes('BCCH') || message.includes('BCH')) return '#ff8800'
    if (message.includes('5GNR')) return '#00ff00'
    return '#ffffff'
  }

  const filteredLogs = logs.filter(log => 
    !filter || log.message.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Left Panel - Message List */}
      <div className="flex-1 flex flex-col border-r border-gray-700">
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-2 mb-2 flex-wrap">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Filtering</button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Filtering 2</button>
            <button onClick={() => setIsPaused(!isPaused)} className={`px-3 py-1 rounded text-xs ${isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Export</button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Hex</button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Vertically</button>
            <button onClick={() => setLogs([])} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs">Clear</button>
          </div>
          <div className="flex gap-2 items-center text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showSIP} onChange={(e) => setShowSIP(e.target.checked)} className="w-3 h-3" />
              <span>Show SIP</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" className="w-3 h-3" />
              <span>Free Size</span>
            </label>
            <div className="flex-1" />
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showStep1} onChange={(e) => setShowStep1(e.target.checked)} className="w-3 h-3" />
              <span>Show Step1</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showStep2} onChange={(e) => setShowStep2(e.target.checked)} className="w-3 h-3" />
              <span>Step2</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showStep3} onChange={(e) => setShowStep3(e.target.checked)} className="w-3 h-3" />
              <span>Step3</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" className="w-3 h-3" />
              <span>SATCH Report</span>
            </label>
          </div>
        </div>

        <div ref={logContainerRef} className="flex-1 overflow-auto bg-black font-mono text-xs">
          <table className="w-full">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="text-left p-2 border-r border-gray-700">Time</th>
                <th className="text-left p-2 border-r border-gray-700">UE NET</th>
                <th className="text-left p-2 border-r border-gray-700">Channel</th>
                <th className="text-left p-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedLog(log)}
                  className={`cursor-pointer hover:bg-gray-800 ${selectedLog === log ? 'bg-gray-800' : ''}`}
                  style={{ color: getMessageColor(log.message, log.direction) }}
                >
                  <td className="p-2 border-r border-gray-900">{log.timestamp}</td>
                  <td className="p-2 border-r border-gray-900">{log.direction}</td>
                  <td className="p-2 border-r border-gray-900">{log.channel}</td>
                  <td className="p-2">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Panel - Message Details */}
      <div className="w-96 flex flex-col bg-gray-900">
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="text-sm font-semibold">Message Details</div>
        </div>
        <div className="flex-1 overflow-auto p-3 font-mono text-xs">
          {selectedLog ? (
            <div className="space-y-2">
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">Timestamp:</div>
                <div>{selectedLog.timestamp}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">Version:</div>
                <div>1</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">RRC_REL:</div>
                <div>15</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">RRC_VER Major:</div>
                <div>4</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">RRC_VER Minor:</div>
                <div>0</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">NAS Data Length:</div>
                <div>37</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">Message:</div>
                <div className="text-cyan-400">{selectedLog.message}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-400">PSG_SETTING_REQUEST:</div>
                <div className="text-green-400">
                  Security_header_type: 1x6<br/>
                  Protocol_discriminator: 1x5<br/>
                  Message_type: 76<br/>
                  UE_5G_security_capability_length: 4<br/>
                  5G_EA0: 1<br/>
                  128_5G_EA1: 1<br/>
                  128_5G_EA2: 1<br/>
                  128_5G_EA3: 1<br/>
                  5G_EA4: 0<br/>
                  5G_EA5: 0<br/>
                  5G_EA6: 0<br/>
                  5G_EA7: 0
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center mt-10">Select a message to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}
