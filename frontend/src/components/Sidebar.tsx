import { useMemo } from 'react'
import type { Device } from '@/types'

interface SidebarProps {
  devices: Device[]
  selectedDevice: string | null
  onDeviceSelect: (deviceId: string) => void
  onSelectCategory?: (category: string | null) => void
  theme?: 'light' | 'dark'
}

export default function Sidebar({ devices, selectedDevice, onDeviceSelect, onSelectCategory, theme = 'light' }: SidebarProps) {
  const messageCategories = useMemo(
    () => [
      { key: 'rrc', label: 'RRC Connection' },
      { key: 'mib', label: 'MIB Information' },
      { key: 'sib', label: 'SIB Information' },
      { key: 'nas5g', label: 'NAS 5G' },
      { key: 'nas4g', label: 'NAS 4G' },
      { key: 'nas3g', label: 'NAS 3G' },
      { key: 'nas2g', label: 'NAS 2G' },
    ],
    []
  )

  const panelBg = 'bg-black text-gray-100 border-gray-800'
  const itemHover = 'hover:bg-gray-900'
  const slots = [0, 1, 2, 3] // four placeholders

  return (
    <div className={`w-64 flex flex-col h-full border-r ${panelBg}`}>
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="text-sm font-semibold">Extended Cellular</div>
        <div className="text-[11px] text-gray-400">Analyzer</div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Device Manager</div>
        <div className="space-y-2 mb-4">
          {slots.map((slotIdx) => {
            const device = devices[slotIdx]
            const isConnected = !!device
            const active = isConnected && selectedDevice === device.deviceId
            return (
              <button
                key={slotIdx}
                onClick={() => {
                  if (device) onDeviceSelect(device.deviceId)
                }}
                className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded border ${
                  active
                    ? 'bg-slate-800 text-white border-slate-700'
                    : isConnected
                      ? 'bg-slate-900 text-gray-200 border-slate-800 hover:bg-slate-800'
                      : 'bg-gray-900 text-gray-400 border-gray-800 cursor-default'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                  <div className="flex flex-col text-left leading-tight">
                    <span>Mobile {slotIdx + 1}</span>
                    <span className="text-[11px] text-gray-300">
                      {isConnected ? device.model || device.deviceId : 'Not connected'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 capitalize">
                  {isConnected ? device.status?.toLowerCase?.() || 'connected' : ''}
                </span>
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Signaling</div>
            <button
              onClick={() => onSelectCategory?.(null)}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-900 text-sm"
            >
              Live Signaling Messages
            </button>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">KPIs</div>
            <div className="space-y-1 text-sm text-gray-300 px-3">
              <div>CSSR</div>
              <div>RSRP</div>
              <div>RSRQ</div>
              <div>SINR</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Messages</div>
            <div className="space-y-1">
              {messageCategories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => onSelectCategory?.(cat.key)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-900 text-sm text-gray-200"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
