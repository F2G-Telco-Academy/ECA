import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import type { Device, Session } from '@/types'

interface MultiDeviceGridProps {
  devices: Device[]
  onDeviceSelect: (deviceId: string) => void
}

export default function MultiDeviceGrid({ devices, onDeviceSelect }: MultiDeviceGridProps) {
  const [sessions, setSessions] = useState<Record<string, Session | null>>({})
  const [gridSize, setGridSize] = useState<'2x2' | '2x4' | '3x3'>('2x4')

  useEffect(() => {
    // Fetch active sessions for each device
    devices.forEach(async (device) => {
      try {
        const recentSessions = await api.getRecentSessions(1)
        const deviceSession = recentSessions.find(s => s.deviceId === device.deviceId)
        setSessions(prev => ({ ...prev, [device.deviceId]: deviceSession || null }))
      } catch (err) {
        console.error(`Failed to fetch session for ${device.deviceId}:`, err)
      }
    })
  }, [devices])

  const getGridClass = () => {
    switch (gridSize) {
      case '2x2': return 'grid-cols-2 grid-rows-2'
      case '2x4': return 'grid-cols-2 grid-rows-4'
      case '3x3': return 'grid-cols-3 grid-rows-3'
    }
  }

  const getDeviceStatus = (device: Device) => {
    const session = sessions[device.deviceId]
    if (session?.status === 'ACTIVE') return 'CAPTURING'
    if (device.status === 'CONNECTED') return 'CONNECTED'
    return 'IDLE'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CAPTURING': return 'bg-green-500'
      case 'CONNECTED': return 'bg-blue-500'
      case 'ERROR': return 'bg-red-500'
      default: return 'bg-gray-600'
    }
  }

  const maxPanels = gridSize === '2x2' ? 4 : gridSize === '2x4' ? 8 : 9
  const panels = Array.from({ length: maxPanels }, (_, i) => {
    const device = devices[i]
    return { index: i + 1, device }
  })

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => setGridSize('2x2')}
            className={`px-3 py-1 rounded text-xs ${gridSize === '2x2' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            2×2
          </button>
          <button
            onClick={() => setGridSize('2x4')}
            className={`px-3 py-1 rounded text-xs ${gridSize === '2x4' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            2×4
          </button>
          <button
            onClick={() => setGridSize('3x3')}
            className={`px-3 py-1 rounded text-xs ${gridSize === '3x3' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            3×3
          </button>
        </div>
        <div className="text-sm text-gray-400">
          {devices.length} device(s) connected
        </div>
      </div>

      {/* Grid */}
      <div className={`flex-1 grid ${getGridClass()} gap-1 p-1`}>
        {panels.map(({ index, device }) => (
          <div
            key={index}
            onClick={() => device && onDeviceSelect(device.deviceId)}
            className={`relative bg-gray-800 border-2 rounded-lg overflow-hidden transition-all ${
              device ? 'border-blue-500 cursor-pointer hover:border-blue-400' : 'border-gray-700'
            }`}
          >
            {/* Panel Number */}
            <div className="absolute top-2 left-2 text-6xl font-bold text-gray-700 opacity-50">
              {index}
            </div>

            {device ? (
              <div className="relative z-10 h-full flex flex-col p-4">
                {/* Device Info */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(getDeviceStatus(device))} animate-pulse`} />
                    <span className="text-white font-semibold text-sm">
                      {device.deviceModel || device.deviceId}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {device.deviceId}
                  </div>
                </div>

                {/* Status */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(getDeviceStatus(device))} text-white mb-2`}>
                      {getDeviceStatus(device)}
                    </div>
                    {sessions[device.deviceId] && (
                      <div className="text-xs text-gray-400">
                        Session #{sessions[device.deviceId]?.id}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                {sessions[device.deviceId]?.status === 'ACTIVE' && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-500">RSRP</div>
                      <div className="text-green-400 font-bold">-85 dBm</div>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-500">SINR</div>
                      <div className="text-blue-400 font-bold">15 dB</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-gray-600 text-lg">None</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-t border-gray-700">
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
          Airplane
        </button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
          Mobile Reset
        </button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
          Select All
        </button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
          Unselect All
        </button>
        <div className="ml-auto text-xs text-gray-400">
          Click panel to view details
        </div>
      </div>
    </div>
  )
}
