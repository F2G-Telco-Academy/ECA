import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import type { Device } from '@/types'

interface XCALSidebarProps {
  onDeviceSelect: (deviceIds: string[]) => void
  onKpiSelect: (kpi: string) => void
  onViewSelect: (view: string) => void
}

export default function XCALSidebar({ onDeviceSelect, onKpiSelect, onViewSelect }: XCALSidebarProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
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
    qualcomm: false,
    qualcommMsg: false,
    '5gnrq': false,
    lteadvq: false,
    wcdma: false,
    cdma: false,
    xcalsmart: false,
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
    onViewSelect(item)
    onKpiSelect(item)
  }

  return (
    <div className="w-64 bg-gray-100 border-r border-gray-300 flex flex-col h-full overflow-hidden text-xs">
      {/* Mobile */}
      <div className="border-b border-gray-300">
        <div onClick={() => toggle('mobile')} className="px-3 py-2 bg-gray-200 cursor-pointer hover:bg-gray-300 flex items-center justify-between">
          <span className="font-semibold">Mobile</span>
          <span>{expanded.mobile ? '▼' : '▶'}</span>
        </div>
        {expanded.mobile && (
          <div className="p-2">
            {devices.map((device, idx) => (
              <label key={device.deviceId} className="flex items-center gap-2 hover:bg-gray-200 p-1 rounded cursor-pointer">
                <input type="checkbox" checked={selectedDevices.includes(device.deviceId)} onChange={() => handleDeviceToggle(device.deviceId)} className="w-3 h-3" />
                <span className={selectedDevices.includes(device.deviceId) ? 'text-blue-600 font-semibold' : ''}>
                  Mobile {idx + 1} ({device.deviceId.slice(0, 8)})
                </span>
              </label>
            ))}
            {devices.length === 0 && <div className="text-gray-500 p-2">No devices</div>}
          </div>
        )}
      </div>

      {/* Scanner */}
      <div className="border-b border-gray-300">
        <div onClick={() => toggle('scanner')} className="px-3 py-2 bg-gray-200 cursor-pointer hover:bg-gray-300 flex items-center justify-between">
          <span className="font-semibold">Scanner</span>
          <span>{expanded.scanner ? '▼' : '▶'}</span>
        </div>
        {expanded.scanner && (
          <div className="p-2">
            <label className="flex items-center gap-2 hover:bg-gray-200 p-1 rounded cursor-pointer">
              <input type="checkbox" className="w-3 h-3" />
              <span>Scanner 1</span>
            </label>
            <label className="flex items-center gap-2 hover:bg-gray-200 p-1 rounded cursor-pointer">
              <input type="checkbox" className="w-3 h-3" />
              <span>Scanner 2</span>
            </label>
          </div>
        )}
      </div>

      {/* GPS */}
      <div className="border-b border-gray-300">
        <div onClick={() => toggle('gps')} className="px-3 py-2 bg-gray-200 cursor-pointer hover:bg-gray-300 flex items-center justify-between">
          <span className="font-semibold">GPS</span>
          <span>{expanded.gps ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Supported KPIs */}
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2 bg-gray-200 border-b border-gray-300">
          <span className="font-semibold">Supported KPIs</span>
        </div>
        <div className="p-2">
          <input type="text" placeholder="Search Keyword" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
        </div>

        {/* Message */}
        <div className="border-b border-gray-300">
          <div onClick={() => toggle('message')} className="px-3 py-1.5 bg-gray-50 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
            <span>{expanded.message ? '▼' : '▶'}</span>
            <span className="font-semibold">Message</span>
          </div>
          {expanded.message && (
            <div>
              {['LBS Message', 'LCS Message', 'PPP Frame/Mobile Packet Message', 'AirPcap Message', 'HTTP / SIP Message', 'H.324m Message Viewer'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className="px-6 py-1 hover:bg-blue-50 cursor-pointer">{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* Layer3 KPI */}
        <div className="border-b border-gray-300">
          <div onClick={() => toggle('layer3kpi')} className="px-3 py-1.5 bg-gray-50 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
            <span>{expanded.layer3kpi ? '▼' : '▶'}</span>
            <span className="font-semibold">Layer3 KPI</span>
          </div>
          {expanded.layer3kpi && (
            <div>
              {/* 5GNR */}
              <div onClick={() => toggle('5gnr')} className="px-6 py-1 bg-gray-100 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
                <span>{expanded['5gnr'] ? '▼' : '▶'}</span>
                <span className="font-semibold">5GNR</span>
              </div>
              {expanded['5gnr'] && (
                <div>
                  {['5GNR Information (MIB)', '5GNR SA Information (SIB1)', '5GNR SipCell Information (Reconfig)', '5GNR TDD UL-DL Configuration', '5GNR NSA RRC State', '5GNR NSA Status Information', '5GNR RRC State', '5GNR SA Status Information', '5GNR UE Capability', '5GNR Feature Sets', '5GNR SCG Mobility Statistics', '5GNR EPS Fallback Statistics', '5GNR Handover Statistics (intra NR-HO)', '5GNR Handover Event Information', '5GNR SCell State'].map(item => (
                    <div key={item} onClick={() => handleItemClick(item)} className="px-9 py-1 hover:bg-blue-50 cursor-pointer">{item}</div>
                  ))}
                </div>
              )}
              {/* LTE */}
              <div onClick={() => toggle('lte')} className="px-6 py-1 bg-gray-100 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
                <span>{expanded.lte ? '▼' : '▶'}</span>
                <span className="font-semibold">LTE</span>
              </div>
              {expanded.lte && (
                <div>
                  {['LTE RRC State', 'LTE NAS'].map(item => (
                    <div key={item} onClick={() => handleItemClick(item)} className="px-9 py-1 hover:bg-blue-50 cursor-pointer">{item}</div>
                  ))}
                </div>
              )}
              {/* NAS */}
              <div onClick={() => toggle('nas')} className="px-6 py-1 bg-gray-100 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
                <span>{expanded.nas ? '▼' : '▶'}</span>
                <span className="font-semibold">NAS</span>
              </div>
            </div>
          )}
        </div>

        {/* RF KPI */}
        <div className="border-b border-gray-300">
          <div onClick={() => toggle('rfkpi')} className="px-3 py-1.5 bg-gray-50 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
            <span>{expanded.rfkpi ? '▼' : '▶'}</span>
            <span className="font-semibold">RF KPI</span>
          </div>
          {expanded.rfkpi && (
            <div>
              {['RF Measurement Summary Info', 'NRDC RF Measurement Summary Info', '5GNR Beamforming Information', 'Benchmarking RF Summary', 'Dynamic Spectrum Sharing'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className="px-6 py-1 hover:bg-blue-50 cursor-pointer">{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* Qualcomm */}
        <div className="border-b border-gray-300">
          <div onClick={() => toggle('qualcomm')} className="px-3 py-1.5 bg-gray-50 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
            <span>{expanded.qualcomm ? '▼' : '▶'}</span>
            <span className="font-semibold">Qualcomm</span>
          </div>
          {expanded.qualcomm && (
            <div>
              <div onClick={() => toggle('qualcommMsg')} className="px-6 py-1 bg-gray-100 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
                <span>{expanded.qualcommMsg ? '▼' : '▶'}</span>
                <span className="font-semibold">Message</span>
              </div>
              {expanded.qualcommMsg && (
                <div>
                  {['Qualcomm DM Message', 'Qualcomm Mobile Message', 'Qualcomm Event Report Message', 'Qualcomm QChat Message Viewer', 'Qualcomm L2 RLC Messages'].map(item => (
                    <div key={item} onClick={() => handleItemClick(item)} className="px-9 py-1 hover:bg-blue-50 cursor-pointer">{item}</div>
                  ))}
                </div>
              )}
              {['Common-Q', '5GNR-Q', 'LTE/Adv-Q Graph', 'LTE/Adv-Q', 'WCDMA-Graph', 'WCDMA-Statistics', 'WCDMA-Status', 'WCDMA-Layer 3', 'CDMA-Graph', 'CDMA-Statistics', 'CDMA-Status'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className="px-6 py-1 hover:bg-blue-50 cursor-pointer">{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* XCAL-Smart */}
        <div className="border-b border-gray-300">
          <div onClick={() => toggle('xcalsmart')} className="px-3 py-1.5 bg-gray-50 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
            <span>{expanded.xcalsmart ? '▼' : '▶'}</span>
            <span className="font-semibold">XCAL-Smart</span>
          </div>
          {expanded.xcalsmart && (
            <div>
              {['Smart App Message List', 'Smart App Status', 'Smart App Bluetooth/LE Status', 'Smart Standalone Mode Setting', 'WiFi Scan List', 'WCDMA RF Info', 'WiFi Info'].map(item => (
                <div key={item} onClick={() => handleItemClick(item)} className="px-6 py-1 hover:bg-blue-50 cursor-pointer">{item}</div>
              ))}
            </div>
          )}
        </div>

        {/* Autocall KPI */}
        <div className="border-b border-gray-300">
          <div onClick={() => toggle('autocallkpi')} className="px-3 py-1.5 bg-gray-50 cursor-pointer hover:bg-gray-200 flex items-center gap-2">
            <span>{expanded.autocallkpi ? '▼' : '▶'}</span>
            <span className="font-semibold">Autocall KPI</span>
          </div>
        </div>
      </div>
    </div>
  )
}
