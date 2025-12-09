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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'mobile': true,
    'scanner': false,
    'gps': false,
    'supportedKpis': true,
    'message': false,
    'layer3Kpi': false,
    'rfKpi': true,
    'qualcomm': false,
    'xcalSmart': false,
    'autocallKpi': false
  })

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleDeviceToggle = (deviceId: string) => {
    const newSelected = selectedDevices.includes(deviceId)
      ? selectedDevices.filter(id => id !== deviceId)
      : [...selectedDevices, deviceId]
    
    setSelectedDevices(newSelected)
    onDeviceSelect(newSelected)
  }

  const [search, setSearch] = useState('')
  const kpiTree = {
    'Message': [
      'AirPcap Message',
      'HTTP / SIP Message',
      'H.324m Message Viewer'
    ],
    'Layer3 KPI': [
      '5GNR',
      'LTE',
      'NAS'
    ],
    'RF KPI': [
      'RF Measurement Summary Info',
      'NRDC RF Measurement Summary Info',
      '5GNR Beamforming Information',
      'Benchmarking RF Summary',
      'Dynamic Spectrum Sharing'
    ],
    'Qualcomm': [
      'Message',
      'Common-Q',
      '5GNR-Q',
      'LTE/Adv-Q Graph',
      'LTE/Adv-Q',
      'WCDMA Graph',
      'WCDMA Statistics',
      'WCDMA Status',
      'WCDMA Layer 3',
      'CDMA-Graph',
      'CDMA-Statistics',
      'CDMA-Status'
    ],
    'XCAL-Smart': [
      'Smart App Message List',
      'Smart App Status',
      'Smart App Bluetooth/LE Status',
      'Smart Standalone Mode Setting',
      'WiFi Scan List',
      'WCDMA RF Info',
      'WiFi Info'
    ],
    'Autocall KPI': []
  }

  return (
    <div className="w-64 bg-gray-100 border-r border-gray-300 flex flex-col h-full overflow-hidden">
      {/* Mobile Section */}
      <div className="border-b border-gray-300">
        <div
          onClick={() => toggleSection('mobile')}
          className="px-3 py-2 bg-gray-200 cursor-pointer hover:bg-gray-300 flex items-center justify-between"
        >
          <span className="text-sm font-semibold">Mobile</span>
          <span className="text-xs">{expandedSections.mobile ? '▼' : '▶'}</span>
        </div>
        {expandedSections.mobile && (
          <div className="p-2 space-y-1">
            {devices.map((device, idx) => (
              <label key={device.deviceId} className="flex items-center gap-2 text-sm hover:bg-gray-200 p-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.deviceId)}
                  onChange={() => handleDeviceToggle(device.deviceId)}
                  className="w-4 h-4"
                />
                <span className={selectedDevices.includes(device.deviceId) ? 'text-blue-600 font-semibold' : ''}>
                  Mobile {idx + 1} ({device.deviceId.slice(0, 8)})
                </span>
              </label>
            ))}
            {devices.length === 0 && (
              <div className="text-xs text-gray-500 p-2">No devices connected</div>
            )}
          </div>
        )}
      </div>

      {/* Scanner Section */}
      <div className="border-b border-gray-300">
        <div
          onClick={() => toggleSection('scanner')}
          className="px-3 py-2 bg-gray-200 cursor-pointer hover:bg-gray-300 flex items-center justify-between"
        >
          <span className="text-sm font-semibold">Scanner</span>
          <span className="text-xs">{expandedSections.scanner ? '▼' : '▶'}</span>
        </div>
        {expandedSections.scanner && (
          <div className="p-2 space-y-1">
            <label className="flex items-center gap-2 text-sm hover:bg-gray-200 p-1 rounded cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Scanner 1</span>
            </label>
            <label className="flex items-center gap-2 text-sm hover:bg-gray-200 p-1 rounded cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Scanner 2</span>
            </label>
          </div>
        )}
      </div>

      {/* GPS Section */}
      <div className="border-b border-gray-300">
        <div
          onClick={() => toggleSection('gps')}
          className="px-3 py-2 bg-gray-200 cursor-pointer hover:bg-gray-300 flex items-center justify-between"
        >
          <span className="text-sm font-semibold">GPS</span>
          <span className="text-xs">{expandedSections.gps ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Supported KPIs Section */}
      <div className="flex-1 overflow-auto">
        <div className="border-b border-gray-300">
          <div className="px-3 py-2 bg-gray-200">
            <span className="text-sm font-semibold">Supported KPIs</span>
          </div>
          <div className="p-2">
            <input
              type="text"
              placeholder="Search Keyword"
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* KPI Tree */}
        <div className="text-xs">
          {Object.entries(kpiTree).map(([category, items]) => (
            <div key={category} className="border-b border-gray-300">
              <div
                onClick={() => toggleSection(category.toLowerCase().replace(/\s+/g, ''))}
                className="px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-200 flex items-center gap-2"
              >
                <span className="text-xs">
                  {expandedSections[category.toLowerCase().replace(/\s+/g, '')] ? '▼' : '▶'}
                </span>
                <span className="font-semibold">{category}</span>
              </div>
              {expandedSections[category.toLowerCase().replace(/\s+/g, '')] && (
                <div className="bg-white">
                  {items.filter(i => i.toLowerCase().includes(search.toLowerCase())).map((item) => (
                    <div
                      key={item}
                      onClick={() => { onViewSelect(item); onKpiSelect(item); }}
                      className="px-6 py-1.5 hover:bg-blue-50 cursor-pointer text-xs"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
