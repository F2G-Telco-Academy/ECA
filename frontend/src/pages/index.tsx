import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const SignalingMessageViewer = dynamic(() => import('@/components/SignalingMessageViewer'), { ssr: false })
const EnhancedTerminal = dynamic(() => import('@/components/EnhancedTerminal'), { ssr: false })

export default function Home() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [devices, setDevices] = useState<any[]>([])

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/devices')
        const data = await res.json()
        setDevices(data)
      } catch (err) {
        console.error('Failed to fetch devices:', err)
      }
    }
    fetchDevices()
    const interval = setInterval(fetchDevices, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Top Menu Bar */}
      <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-2 text-xs">
        <button className="px-3 py-1 hover:bg-slate-700 rounded">File</button>
        <button className="px-3 py-1 hover:bg-slate-700 rounded">Edit</button>
        <button className="px-3 py-1 hover:bg-slate-700 rounded">View</button>
        <button className="px-3 py-1 hover:bg-slate-700 rounded">Tools</button>
        <button className="px-3 py-1 hover:bg-slate-700 rounded">Window</button>
        <button className="px-3 py-1 hover:bg-slate-700 rounded">Help</button>
      </div>

      {/* Toolbar */}
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-3 gap-2">
        <button className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium">
          Start Capture
        </button>
        <button className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm font-medium">
          Stop
        </button>
        <div className="w-px h-8 bg-slate-600 mx-2" />
        <button className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Export
        </button>
        <button className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Settings
        </button>
        <div className="flex-1" />
        <div className="text-sm text-slate-400">
          {devices.length > 0 ? `${devices.length} device(s) connected` : 'No devices'}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold mb-2">Connected Devices</h3>
            <div className="space-y-1">
              {devices.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">No devices detected</div>
              ) : (
                devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => setSelectedDevice(device.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${
                      selectedDevice === device.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    <div className="font-medium">{device.model || device.id}</div>
                    <div className="text-xs opacity-75">{device.manufacturer}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-sm font-semibold mb-2">KPI Categories</h3>
            <div className="space-y-1 text-sm">
              <div className="py-1.5 px-2 hover:bg-slate-700 rounded cursor-pointer">RF Measurements</div>
              <div className="py-1.5 px-2 hover:bg-slate-700 rounded cursor-pointer">Layer 3 Messages</div>
              <div className="py-1.5 px-2 hover:bg-slate-700 rounded cursor-pointer">Throughput</div>
              <div className="py-1.5 px-2 hover:bg-slate-700 rounded cursor-pointer">Call Statistics</div>
              <div className="py-1.5 px-2 hover:bg-slate-700 rounded cursor-pointer">Handover Analysis</div>
            </div>
          </div>
        </div>

        {/* Main Panel - Resizable Grid */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-slate-900">
            {/* Panel 1 - RF Summary */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
              <div className="h-10 bg-slate-750 border-b border-slate-700 flex items-center justify-between px-3">
                <span className="text-sm font-medium">RF Measurement Summary</span>
                <button className="text-slate-400 hover:text-white">⚙</button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {!selectedDevice ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    Select a device to view RF measurements
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900 rounded p-3">
                        <div className="text-xs text-slate-400 mb-1">RSRP</div>
                        <div className="text-2xl font-bold text-green-400">-85 dBm</div>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <div className="text-xs text-slate-400 mb-1">RSRQ</div>
                        <div className="text-2xl font-bold text-blue-400">-10 dB</div>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <div className="text-xs text-slate-400 mb-1">SINR</div>
                        <div className="text-2xl font-bold text-yellow-400">15 dB</div>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <div className="text-xs text-slate-400 mb-1">PCI</div>
                        <div className="text-2xl font-bold text-purple-400">256</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2 - Signaling Messages */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
              <div className="h-10 bg-slate-750 border-b border-slate-700 flex items-center justify-between px-3">
                <span className="text-sm font-medium">Signaling Messages</span>
                <button className="text-slate-400 hover:text-white">⚙</button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SignalingMessageViewer sessionId={sessionId} />
              </div>
            </div>

            {/* Panel 3 - Terminal */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
              <div className="h-10 bg-slate-750 border-b border-slate-700 flex items-center justify-between px-3">
                <span className="text-sm font-medium">Live Logs</span>
                <button className="text-slate-400 hover:text-white">⚙</button>
              </div>
              <div className="flex-1 overflow-hidden">
                <EnhancedTerminal sessionId={sessionId} />
              </div>
            </div>

            {/* Panel 4 - KPI Charts */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
              <div className="h-10 bg-slate-750 border-b border-slate-700 flex items-center justify-between px-3">
                <span className="text-sm font-medium">KPI Trends</span>
                <button className="text-slate-400 hover:text-white">⚙</button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="h-full flex items-center justify-center text-slate-500">
                  KPI charts will appear here
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-4">
          <span className={selectedDevice ? 'text-green-400' : 'text-red-400'}>
            {selectedDevice ? '● Connected' : '○ Disconnected'}
          </span>
          <span className="text-slate-400">CPU: 0%</span>
          <span className="text-slate-400">Memory: 0 MB</span>
        </div>
        <div className="text-slate-400">Extended Cellular Analyzer v0.1.0</div>
      </div>
    </div>
  )
}
