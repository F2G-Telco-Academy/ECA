import { useState } from 'react'

interface Panel {
  id: string
  content: 'rf-summary' | 'signaling' | 'terminal' | 'graphs' | 'config' | 'map' | 'kpi-charts' | 'none'
  label: string
}

interface ModularDashboardProps {
  sessionId: string | null
  availableComponents: { [key: string]: React.ReactNode }
}

export default function ModularDashboard({ sessionId, availableComponents }: ModularDashboardProps) {
  const [panels, setPanels] = useState<Panel[]>([
    { id: '1', content: 'rf-summary', label: 'Panel 1' },
    { id: '2', content: 'signaling', label: 'Panel 2' },
    { id: '3', content: 'terminal', label: 'Panel 3' },
    { id: '4', content: 'graphs', label: 'Panel 4' }
  ])

  const [layout, setLayout] = useState<'2x2' | '1x4' | '4x1' | '1x1'>('2x2')

  const contentOptions = [
    { value: 'none', label: 'None' },
    { value: 'rf-summary', label: 'RF Measurement Summary' },
    { value: 'signaling', label: 'Signaling Message' },
    { value: 'terminal', label: 'Terminal Logs' },
    { value: 'graphs', label: 'User Defined Graph' },
    { value: 'config', label: '5GNR Configuration' },
    { value: 'map', label: 'Map View' },
    { value: 'kpi-charts', label: 'KPI Charts' }
  ]

  const updatePanelContent = (panelId: string, content: string) => {
    setPanels(panels.map(p => p.id === panelId ? { ...p, content: content as any } : p))
  }

  const getGridClass = () => {
    switch (layout) {
      case '2x2': return 'grid grid-cols-2 grid-rows-2'
      case '1x4': return 'grid grid-cols-1 grid-rows-4'
      case '4x1': return 'grid grid-cols-4 grid-rows-1'
      case '1x1': return 'grid grid-cols-1 grid-rows-1'
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Layout Controls */}
      <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400">Layout:</span>
        <button onClick={() => setLayout('2x2')} className={`px-2 py-1 text-xs rounded ${layout === '2x2' ? 'bg-blue-600' : 'bg-gray-700'}`}>2×2</button>
        <button onClick={() => setLayout('1x4')} className={`px-2 py-1 text-xs rounded ${layout === '1x4' ? 'bg-blue-600' : 'bg-gray-700'}`}>1×4</button>
        <button onClick={() => setLayout('4x1')} className={`px-2 py-1 text-xs rounded ${layout === '4x1' ? 'bg-blue-600' : 'bg-gray-700'}`}>4×1</button>
        <button onClick={() => setLayout('1x1')} className={`px-2 py-1 text-xs rounded ${layout === '1x1' ? 'bg-blue-600' : 'bg-gray-700'}`}>1×1</button>
      </div>

      {/* Modular Grid */}
      <div className={`flex-1 ${getGridClass()} gap-1 p-1`}>
        {panels.map(panel => (
          <div key={panel.id} className="bg-gray-800 border border-gray-700 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="bg-gray-900 px-2 py-1 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">{panel.id}</span>
                <select
                  value={panel.content}
                  onChange={(e) => updatePanelContent(panel.id, e.target.value)}
                  className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
                >
                  {contentOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-auto">
              {panel.content === 'none' ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-4xl font-bold">
                  {panel.id}
                </div>
              ) : (
                availableComponents[panel.content]
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
