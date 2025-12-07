'use client'
import { useState, useEffect } from 'react'

interface Device {
  id: string
  deviceId: string
  deviceModel?: string
  status: string
  selected: boolean
}

interface EnhancedSidebarProps {
  onDeviceSelect: (deviceIds: string[]) => void
  onKpiSelect: (kpi: string) => void
}

export default function EnhancedSidebar({ onDeviceSelect, onKpiSelect }: EnhancedSidebarProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['mobile', 'kpi', 'rf-kpi', 'qualcomm'])
  )
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetch('http://localhost:8080/api/sessions')
      .then(res => res.json())
      .then(data => setDevices(data.map((d: any) => ({ ...d, selected: false }))))
      .catch(console.error)

    const interval = setInterval(() => {
      fetch('http://localhost:8080/api/sessions')
        .then(res => res.json())
        .then(data => setDevices(data.map((d: any) => ({ ...d, selected: selectedDevices.has(d.id) }))))
        .catch(console.error)
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedDevices])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const toggleDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices)
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId)
    } else {
      newSelected.add(deviceId)
    }
    setSelectedDevices(newSelected)
    onDeviceSelect(Array.from(newSelected))
  }

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
    'Qualcomm': {
      'Message': ['Qualcomm DM Message', 'Qualcomm Mobile Message', 'Qualcomm Event Report Message'],
      'Common-Q': [],
      '5GNR-Q': ['5GNR Information (MIB)', '5GNR SA Information (SIB1)', '5GNR SgCell Information (Reconfig)'],
      'LTE/eAir-Q': ['LTE/eAir-Q Graph', 'LTE/eAir-Q'],
      'WCDMA-Graph': [],
      'WCDMA-Statistics': [],
      'WCDMA-Status': [],
      'WCDMA-Layer 3': [],
      'CDMA-Graph': [],
      'CDMA-Statistics': [],
      'CDMA-Status': []
    },
    'XCAL_Smart': [
      'Smart App Message List'
    ],
    'Autocall KPI': []
  }

  const renderKpiTree = (items: any, level = 0) => {
    if (Array.isArray(items)) {
      return items.map((item, idx) => (
        <div
          key={idx}
          onClick={() => onKpiSelect(item)}
          className="py-1 hover:bg-gray-700 cursor-pointer text-gray-300 text-xs"
          style={{ paddingLeft: `${(level + 1) * 16}px` }}
        >
          {item}
        </div>
      ))
    }

    return Object.entries(items).map(([key, value]) => (
      <div key={key}>
        <div
          onClick={() => toggleSection(key)}
          className="cursor-pointer hover:bg-gray-700 py-1 flex items-center text-gray-200 text-xs"
          style={{ paddingLeft: `${level * 16}px` }}
        >
          <span className="mr-2 text-gray-500">
            {expandedSections.has(key) ? '▼' : '▶'}
          </span>
          {key}
        </div>
        {expandedSections.has(key) && (
          <div>{renderKpiTree(value, level + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto flex flex-col h-full">
      {/* Devices List Tab */}
      <div className="border-b border-gray-700 bg-gray-900">
        <div className="flex">
          <button className="flex-1 px-3 py-2 text-xs font-semibold bg-gray-700 border-r border-gray-600">
            Devices List
          </button>
          <button className="flex-1 px-3 py-2 text-xs font-semibold text-gray-400 hover:bg-gray-700">
            Port Status
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Mobile Section */}
        <div className="p-2">
          <div
            onClick={() => toggleSection('mobile')}
            className="font-bold text-xs mb-2 cursor-pointer flex items-center text-gray-200"
          >
            <span className="mr-2">{expandedSections.has('mobile') ? '▼' : '▶'}</span>
            Mobile
          </div>
          {expandedSections.has('mobile') && (
            <div className="space-y-1">
              {devices.map((device, idx) => (
                <div key={device.id} className="flex items-center pl-4">
                  <input
                    type="checkbox"
                    checked={selectedDevices.has(device.id)}
                    onChange={() => toggleDevice(device.id)}
                    className="mr-2"
                  />
                  <div
                    className={`flex-1 py-1 px-2 cursor-pointer text-xs rounded ${
                      selectedDevices.has(device.id) ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    Mobile {idx + 1} ({device.deviceModel || device.deviceId})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scanner Section */}
        <div className="p-2 border-t border-gray-700">
          <div
            onClick={() => toggleSection('scanner')}
            className="font-bold text-xs mb-2 cursor-pointer flex items-center text-gray-200"
          >
            <span className="mr-2">{expandedSections.has('scanner') ? '▼' : '▶'}</span>
            Scanner
          </div>
          {expandedSections.has('scanner') && (
            <div className="pl-4 space-y-1">
              <div className="py-1 hover:bg-gray-700 cursor-pointer text-xs text-gray-300">Scanner 1</div>
              <div className="py-1 hover:bg-gray-700 cursor-pointer text-xs text-gray-300">Scanner 2</div>
            </div>
          )}
        </div>

        {/* GPS Section */}
        <div className="p-2 border-t border-gray-700">
          <div
            onClick={() => toggleSection('gps')}
            className="font-bold text-xs mb-2 cursor-pointer flex items-center text-gray-200"
          >
            <span className="mr-2">{expandedSections.has('gps') ? '▼' : '▶'}</span>
            GPS
          </div>
        </div>

        {/* Supported KPIs Section */}
        <div className="p-2 border-t border-gray-700">
          <div className="font-bold text-xs mb-2 text-gray-200">Supported KPIs</div>
          
          {/* Search Box */}
          <input
            type="text"
            placeholder="Search Keyword"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 mb-2 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300"
          />

          {/* KPI Tree */}
          <div className="text-xs">
            {renderKpiTree(kpiTree)}
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="border-t border-gray-700 p-2 bg-gray-900 flex gap-2">
        <button className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
          Airplane
        </button>
        <button className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
          Mobile Reset
        </button>
        <button className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
          Select All
        </button>
        <button className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
          Unselect All
        </button>
      </div>
    </div>
  )
}
