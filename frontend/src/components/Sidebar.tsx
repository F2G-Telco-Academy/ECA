import { useState, useEffect } from 'react'

interface SidebarProps {
  selectedDevice: string | null
  onDeviceSelect: (deviceId: string) => void
  onSelectCategory?: (category: string|null) => void
}

export default function Sidebar({ selectedDevice, onDeviceSelect, onSelectCategory }: SidebarProps) {
  const [devices, setDevices] = useState<any[]>([])
  // Expand Device Manager and Messages by default to mirror the design
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['device-manager', 'messages']))
  const [selectedCategory, setSelectedCategory] = useState<string|null>(null)

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

  const handleCategorySelect = (cat: string|null) => {
    setSelectedCategory(cat)
    onSelectCategory?.(cat)
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto text-gray-800">
      <div className="p-2">
        {/* Device Manager */}
        <div className="mb-4">
          <div
            className="font-bold text-sm mb-2 cursor-pointer flex items-center text-gray-700"
            onClick={() => toggleSection('device-manager')}
          >
            <span className="mr-2">{expandedSections.has('device-manager') ? '▼' : '▶'}</span>
            Device Manager
          </div>
          {expandedSections.has('device-manager') && (
            <div className="pl-2">
              {devices.map((device, idx) => (
                <div
                  key={device.id}
                  onClick={() => onDeviceSelect(device.id)}
                  className={`pl-4 py-1 rounded cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                    selectedDevice === device.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Mobile {idx + 1}
                </div>
              ))}
              {devices.length === 0 && (
                <div className="pl-4 py-1 text-xs text-gray-400">No devices connected</div>
              )}
            </div>
          )}
        </div>

        {/* Signaling Messages */}
        <div className="mb-2">
          <div
            className={`cursor-pointer hover:bg-gray-100 py-1 px-2 rounded text-gray-700 ${selectedCategory===null?'bg-blue-50 border border-blue-200':''}`}
            onClick={() => handleCategorySelect(null)}
            title="Show all signaling messages"
          >
            📡 Signaling Messages
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-4">
          <div className="cursor-pointer hover:bg-gray-100 py-1 px-2 rounded text-gray-700">📊 KPIs</div>
        </div>

        {/* Messages group */}
        <div className="mb-2">
          <div
            className="cursor-pointer py-1 flex items-center px-2 rounded hover:bg-gray-100 text-gray-700"
            onClick={() => toggleSection('messages')}
          >
            <span className="mr-2">{expandedSections.has('messages') ? '▼' : '▶'}</span>
            Messages
          </div>
          {expandedSections.has('messages') && (
            <div className="pl-6 text-sm">
              {[
                { key: 'rrc', label: 'RRC Connection' },
                { key: 'mib', label: 'MIB Information' },
                { key: 'sib', label: 'SIB Information' },
                { key: 'nas5g', label: 'NAS 5G' },
                { key: 'nas4g', label: 'NAS 4G' },
                { key: 'nas3g', label: 'NAS 3G' },
                { key: 'nas2g', label: 'NAS 2G' },
              ].map(item => (
                <div
                  key={item.key}
                  className={`py-1 hover:bg-gray-100 cursor-pointer rounded px-2 ${selectedCategory===item.key?'bg-blue-50 border border-blue-200':''}`}
                  onClick={() => handleCategorySelect(item.key)}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
