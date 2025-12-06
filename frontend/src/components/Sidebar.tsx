import { useState, useEffect } from 'react'

interface SidebarProps {
  selectedDevice: string | null
  onDeviceSelect: (deviceId: string) => void
}

export default function Sidebar({ selectedDevice, onDeviceSelect }: SidebarProps) {
  const [devices, setDevices] = useState<any[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['rf-kpi']))

  useEffect(() => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => setDevices(data))
      .catch(console.error)
  }, [])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
      <div className="p-2">
        <div className="mb-4">
          <div className="font-bold text-sm mb-2">Mobile</div>
          {devices.map((device, idx) => (
            <div
              key={device.id}
              onClick={() => onDeviceSelect(device.id)}
              className={`pl-4 py-1 cursor-pointer hover:bg-gray-700 ${
                selectedDevice === device.id ? 'bg-blue-600' : ''
              }`}
            >
              Mobile {idx + 1} ({device.deviceModel || device.deviceId})
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="font-bold text-sm mb-2">Supported KPIs</div>
          
          <div>
            <div
              onClick={() => toggleSection('rf-kpi')}
              className="cursor-pointer hover:bg-gray-700 py-1 flex items-center"
            >
              <span className="mr-2">{expandedSections.has('rf-kpi') ? '▼' : '▶'}</span>
              RF KPI
            </div>
            {expandedSections.has('rf-kpi') && (
              <div className="pl-6 text-sm">
                <div className="py-1 hover:bg-gray-700 cursor-pointer">RF Measurement Summary Info</div>
                <div className="py-1 hover:bg-gray-700 cursor-pointer">5GNR Information</div>
                <div className="py-1 hover:bg-gray-700 cursor-pointer">LTE/eAir-Q</div>
              </div>
            )}
          </div>

          <div>
            <div
              onClick={() => toggleSection('5gnr')}
              className="cursor-pointer hover:bg-gray-700 py-1 flex items-center"
            >
              <span className="mr-2">{expandedSections.has('5gnr') ? '▼' : '▶'}</span>
              5GNR
            </div>
            {expandedSections.has('5gnr') && (
              <div className="pl-6 text-sm">
                <div className="py-1 hover:bg-gray-700 cursor-pointer">5GNR Information (MIB)</div>
                <div className="py-1 hover:bg-gray-700 cursor-pointer">5GNR UE Capability</div>
              </div>
            )}
          </div>

          <div>
            <div
              onClick={() => toggleSection('lte')}
              className="cursor-pointer hover:bg-gray-700 py-1 flex items-center"
            >
              <span className="mr-2">{expandedSections.has('lte') ? '▼' : '▶'}</span>
              LTE
            </div>
          </div>

          <div>
            <div
              onClick={() => toggleSection('qualcomm')}
              className="cursor-pointer hover:bg-gray-700 py-1 flex items-center"
            >
              <span className="mr-2">{expandedSections.has('qualcomm') ? '▼' : '▶'}</span>
              Qualcomm
            </div>
            {expandedSections.has('qualcomm') && (
              <div className="pl-6 text-sm">
                <div className="py-1 hover:bg-gray-700 cursor-pointer">Message</div>
                <div className="py-1 hover:bg-gray-700 cursor-pointer">Common-Q</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
