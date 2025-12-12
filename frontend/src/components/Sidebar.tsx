import { useMemo, useState } from 'react'
import type { Device } from '@/types'

interface SidebarProps {
  devices: Device[]
  selectedDevice: string | null
  onDeviceSelect: (deviceId: string) => void
  onSelectCategory?: (category: string | null) => void
  theme?: 'light' | 'dark'
}

export default function Sidebar({ devices, selectedDevice, onDeviceSelect, onSelectCategory, theme = 'light' }: SidebarProps) {
  const [openSection, setOpenSection] = useState<'kpis' | 'messages' | null>(null)
  const [collapsed, setCollapsed] = useState(false)

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

  const panelBg =
    theme === 'dark' ? 'bg-slate-900 text-gray-100 border-slate-800' : 'bg-slate-50 text-gray-800 border-gray-200'
  const itemHover = theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
  const slots = [0, 1, 2, 3] // four placeholders

  return (
    <div className={`flex flex-col h-full border-r ${panelBg} ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between ${collapsed ? 'px-2' : 'px-4'} py-3 ${
          theme === 'dark' ? 'border-b border-slate-800' : 'border-b border-gray-200'
        }`}
      >
        {!collapsed ? (
          <div>
            <div className="text-sm font-semibold">Extended Cellular</div>
            <div className="text-[11px] text-gray-400">Analyzer</div>
          </div>
        ) : (
          <div className="text-sm font-semibold text-gray-500">ECA</div>
        )}
        <button
          className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div className={`flex-1 overflow-auto ${collapsed ? 'px-1 py-2' : 'px-3 py-3'} space-y-4`}>
        {/* Device Manager */}
        <div>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-3'} py-2 text-sm rounded ${itemHover}`}>
            <span className="text-gray-500">📱</span>
            {!collapsed && <span className="text-gray-700 font-semibold">Device Manager</span>}
          </div>
          <div className="mt-2 space-y-2">
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
                  className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-sm rounded-lg border transition ${
                    active
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : isConnected
                        ? 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                        : 'bg-slate-100 text-gray-400 border-slate-200 cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {!collapsed && (
                      <div className="flex flex-col text-left leading-tight">
                        <span className="font-semibold">Mobile {slotIdx + 1}</span>
                        <span className="text-[11px] text-gray-500">
                          {isConnected ? device.model || device.deviceId : 'Not connected'}
                        </span>
                      </div>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="text-[11px] text-gray-500 capitalize">
                      {isConnected ? device.status?.toLowerCase?.() || 'connected' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* KPIs */}
        <div>
          <button
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'} py-2 text-sm rounded ${itemHover}`}
            onClick={() => setOpenSection(openSection === 'kpis' ? null : 'kpis')}
          >
            <span className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-500">📊</span>
              {!collapsed && <span className="font-semibold">KPIs</span>}
            </span>
            {!collapsed && <span className="text-gray-400">{openSection === 'kpis' ? '−' : '+'}</span>}
          </button>
          {!collapsed && openSection === 'kpis' && (
            <div className="space-y-1 text-sm text-gray-600 px-3 py-2">
              <div>CSSR</div>
              <div>RSRP</div>
              <div>RSRQ</div>
              <div>SINR</div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div>
          <button
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'} py-2 text-sm rounded ${itemHover}`}
            onClick={() => setOpenSection(openSection === 'messages' ? null : 'messages')}
          >
            <span className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-500">💬</span>
              {!collapsed && <span className="font-semibold">Messages</span>}
            </span>
            {!collapsed && <span className="text-gray-400">{openSection === 'messages' ? '−' : '+'}</span>}
          </button>
          {!collapsed && openSection === 'messages' && (
            <div className="space-y-1 py-2">
              {messageCategories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => onSelectCategory?.(cat.key)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 text-sm text-gray-700"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
