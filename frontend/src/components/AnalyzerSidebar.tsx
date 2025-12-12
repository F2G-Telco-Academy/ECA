import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import type { Device } from '@/types'

interface SidebarProps {
  onDeviceSelect: (deviceIds: string[]) => void
  onKpiSelect: (kpi: string) => void
  onViewSelect: (view: string) => void
}

export default function AnalyzerSidebar({ onDeviceSelect, onKpiSelect, onViewSelect }: SidebarProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [activeView, setActiveView] = useState<string>('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    mobile: true,
    scanner: false,
    gps: false,
    message: false,
    layer3kpi: false,
    '5gnr': false,
    lte: false,
    nas: false,
    rfkpi: true,
    userdefined: false,
    qualcomm: false,
    qualcommMsg: false,
    '5gnrq': false,
    lteadvq: false,
    wcdma: false,
    cdma: false,
    smartapp: false,
    autocallkpi: false
  })
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devs = await api.getDevices()
        setDevices(devs)
      } catch (err) {
        console.error('Failed to fetch devices:', err)
      }
    }
    fetchDevices()
    const interval = setInterval(fetchDevices, 3000)
    return () => clearInterval(interval)
  }, [])

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const handleDeviceToggle = (deviceId: string) => {
    const newSelected = selectedDevices.includes(deviceId)
      ? selectedDevices.filter(id => id !== deviceId)
      : [...selectedDevices, deviceId]
    setSelectedDevices(newSelected)
    onDeviceSelect(newSelected)
  }

  const handleItemClick = (item: string) => {
    setActiveView(item)
    onViewSelect(item)
    onKpiSelect(item)
  }

  return (
    <div className="w-64 bg-gray-900 text-white border-r border-gray-700 flex flex-col h-full text-xs" style={{ minHeight: 0 }}>
      {/* Device Manager - Beautiful UI Style */}
      <div className="border-b border-gray-700 flex-shrink-0">
        <div className="px-3 py-2 bg-gray-800 flex items-center justify-between">
          <span className="font-semibold text-sm">📱 Device Manager</span>
        </div>
        <div className="p-2 space-y-2">
          {[1, 2, 3, 4].map((slot) => {
            const device = devices[slot - 1]
            const isConnected = !!device
            const isSelected = device && selectedDevices.includes(device.deviceId)
            
            return (
              <div
                key={slot}
                onClick={() => device && handleDeviceToggle(device.deviceId)}
                className={`p-2 rounded cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 border border-blue-400'
                    : isConnected
                    ? 'bg-gray-800 border border-gray-600 hover:bg-gray-700'
                    : 'bg-gray-800 border border-gray-700 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className="font-medium">Mobile {slot}</span>
                </div>
                {isConnected ? (
                  <div className="text-[10px] text-gray-400 mt-1 truncate">
                    {device.model || device.deviceId.slice(0, 12)}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500 mt-1">Not connected</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* GPS */}
      <div className="border-b border-gray-700 flex-shrink-0">
        <div onClick={() => toggle('gps')} className="px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center justify-between">
          <span className="font-semibold">🌍 GPS</span>
          <span>{expanded.gps ? '▼' : '▶'}</span>
        </div>
        {expanded.gps && (
          <div className="p-2 text-gray-400 text-[10px]">
            GPS tracking enabled
          </div>
        )}
      </div>

      {/* Supported KPIs */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <span className="font-semibold">Supported KPIs</span>
        </div>
        <div className="p-2 flex-shrink-0">
          <input type="text" placeholder="Search Keyword" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-2 py-1 border border-gray-600 bg-gray-800 text-white rounded text-xs focus:outline-none focus:border-blue-500" />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden"  style={{ minHeight: 0 }}>

        {/* Message */}
        <div className="border-b border-gray-700">
          <div onClick={() => toggle('message')} className="px-3 py-1.5 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
            <span>{expanded.message ? '▼' : '▶'}</span>
            <span className="font-semibold">Message</span>
          </div>
          {expanded.message && (
            <div>
              {['Signaling Message', 'Terminal Logs', 'LBS Message', 'LCS Message', 'PPP Frame/Mobile Packet Message', 'AirPcap Message', 'HTTP / SIP Message', 'H.324m Message Viewer'].map(item => (
                <div 
                  key={item} 
                  onClick={() => handleItemClick(item)} 
                  className={`px-6 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layer3 KPI */}
        <div className="border-b border-gray-700">
          <div onClick={() => toggle('layer3kpi')} className="px-3 py-1.5 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
            <span>{expanded.layer3kpi ? '▼' : '▶'}</span>
            <span className="font-semibold">Layer3 KPI</span>
          </div>
          {expanded.layer3kpi && (
            <div>
              {/* 5GNR */}
              <div onClick={() => toggle('5gnr')} className="px-6 py-1 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
                <span>{expanded['5gnr'] ? '▼' : '▶'}</span>
                <span className="font-semibold">5GNR</span>
              </div>
              {expanded['5gnr'] && (
                <div>
                  {['5GNR Information (MIB)', '5GNR SA Information (SIB1)', '5GNR SipCell Information (Reconfig)', '5GNR TDD UL-DL Configuration', '5GNR NSA RRC State', '5GNR NSA Status Information', '5GNR RRC State', '5GNR SA Status Information', '5GNR UE Capability', '5GNR Feature Sets', '5GNR SCG Mobility Statistics', '5GNR EPS Fallback Statistics', '5GNR Handover Statistics (intra NR-HO)', '5GNR Handover Event Information', '5GNR SCell State'].map(item => (
                    <div key={item} onClick={() => handleItemClick(item)} className={`px-9 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</div>
                  ))}
                </div>
              )}
              {/* LTE */}
              <div onClick={() => toggle('lte')} className="px-6 py-1 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
                <span>{expanded.lte ? '▼' : '▶'}</span>
                <span className="font-semibold">LTE</span>
              </div>
              {expanded.lte && (
                <div>
                  {['LTE RRC State', 'LTE NAS'].map(item => (
                    <div key={item} onClick={() => handleItemClick(item)} className={`px-9 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</div>
                  ))}
                </div>
              )}
              {/* NAS */}
              <div onClick={() => toggle('nas')} className="px-6 py-1 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
                <span>{expanded.nas ? '▼' : '▶'}</span>
                <span className="font-semibold">NAS</span>
              </div>
            </div>
          )}
        </div>

        {/* RF KPI */}
        <div className="border-b border-gray-700">
          <div onClick={() => toggle('rfkpi')} className="px-3 py-1.5 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
            <span>{expanded.rfkpi ? '▼' : '▶'}</span>
            <span className="font-semibold">RF KPI</span>
          </div>
          {expanded.rfkpi && (
            <div>
              {['RF Measurement Summary Info', 'NRDC RF Measurement Summary Info', '5GNR Beamforming Information', 'Benchmarking RF Summary', 'Dynamic Spectrum Sharing'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className={`px-6 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* User Defined */}
        <div className="border-b border-gray-700">
          <div onClick={() => toggle('userdefined')} className="px-3 py-1.5 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
            <span>{expanded.userdefined ? '▼' : '▶'}</span>
            <span className="font-semibold">User Defined</span>
          </div>
          {expanded.userdefined && (
            <div>
              {['User Defined Table', 'User Defined Graph'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className={`px-6 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* Qualcomm */}
        <div className="border-b border-gray-700">
          <div onClick={() => toggle('qualcomm')} className="px-3 py-1.5 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
            <span>{expanded.qualcomm ? '▼' : '▶'}</span>
            <span className="font-semibold">Qualcomm</span>
          </div>
          {expanded.qualcomm && (
            <div>
              <div onClick={() => toggle('qualcommMsg')} className="px-6 py-1 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
                <span>{expanded.qualcommMsg ? '▼' : '▶'}</span>
                <span className="font-semibold">Message</span>
              </div>
              {expanded.qualcommMsg && (
                <div>
                  {['Qualcomm DM Message', 'Qualcomm Mobile Message', 'Qualcomm Event Report Message', 'Qualcomm QChat Message Viewer', 'Qualcomm L2 RLC Messages'].map(item => (
                    <div key={item} onClick={() => handleItemClick(item)} className={`px-9 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</div>
                  ))}
                </div>
              )}
              {['Common-Q', '5GNR-Q', 'LTE/Adv-Q Graph', 'LTE/Adv-Q', 'WCDMA-Graph', 'WCDMA-Statistics', 'WCDMA-Status', 'WCDMA-Layer 3', 'CDMA-Graph', 'CDMA-Statistics', 'CDMA-Status'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className={`px-6 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* Smart App */}
        <div className="border-b border-gray-700">
          <div onClick={() => toggle('smartapp')} className="px-3 py-1.5 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
            <span>{expanded.smartapp ? '▼' : '▶'}</span>
            <span className="font-semibold">Smart App</span>
          </div>
          {expanded.smartapp && (
            <div>
              {['Smart App Message List', 'Smart App Status', 'Smart App Bluetooth/LE Status', 'Smart Standalone Mode Setting', 'WiFi Scan List', 'WCDMA RF Info', 'WiFi Info'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className={`px-6 py-1 cursor-pointer ${activeView === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* Autocall KPI */}
        <div className="border-b border-gray-700">
          <div onClick={() => toggle('autocallkpi')} className="px-3 py-1.5 bg-gray-800 cursor-pointer hover:bg-gray-700 flex items-center gap-2">
            <span>{expanded.autocallkpi ? '▼' : '▶'}</span>
            <span className="font-semibold">Autocall KPI</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
