import { useState } from 'react'
import RFSummary from './RFSummary'
import SignalingViewer from './SignalingViewer'
import TabulatedKPIView from './TabulatedKPIView'
import UserDefinedTable from './UserDefinedTable'
import GraphView from './GraphView'
import TerminalViewer from './TerminalViewer'
import QualcommViewer from './QualcommViewer'
import MapView from './MapView'

type PanelContent = 'none' | 'rf-summary' | 'signaling' | 'tabulated' | 'user-table' | 'graph' | 'terminal' | 'qualcomm' | 'map'

interface Panel {
  id: number
  content: PanelContent
  kpiType?: string
}

export default function MultiPanelGrid({ sessionId }: { sessionId: string | null }) {
  const [layout, setLayout] = useState<'1x1' | '1x2' | '2x2' | '1x4' | '2x4'>('1x4')
  const [panels, setPanels] = useState<Panel[]>([
    { id: 1, content: 'none' },
    { id: 2, content: 'none' },
    { id: 3, content: 'none' },
    { id: 4, content: 'none' },
    { id: 5, content: 'none' },
    { id: 6, content: 'none' },
    { id: 7, content: 'none' },
    { id: 8, content: 'none' }
  ])
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null)

  const renderPanelContent = (panel: Panel) => {
    if (panel.content === 'none') {
      return (
        <div className="h-full flex items-center justify-center text-gray-400 text-6xl font-bold">
          {panel.id}
        </div>
      )
    }

    switch (panel.content) {
      case 'rf-summary':
        return <RFSummary sessionId={sessionId} />
      case 'signaling':
        return <SignalingViewer sessionId={sessionId} />
      case 'tabulated':
        return <TabulatedKPIView sessionId={sessionId} kpiType={panel.kpiType || 'General'} />
      case 'user-table':
        return <UserDefinedTable sessionId={sessionId} />
      case 'graph':
        return <GraphView sessionId={sessionId} />
      case 'terminal':
        return <TerminalViewer sessionId={sessionId} />
      case 'qualcomm':
        return <QualcommViewer sessionId={sessionId} />
      case 'map':
        return <MapView sessionId={sessionId} />
      default:
        return <div className="h-full flex items-center justify-center text-gray-400">None</div>
    }
  }

  const setPanelContent = (panelId: number, content: PanelContent, kpiType?: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, content, kpiType } : p))
  }

  const getGridClass = () => {
    switch (layout) {
      case '1x1': return 'grid-cols-1 grid-rows-1'
      case '1x2': return 'grid-cols-1 grid-rows-2'
      case '2x2': return 'grid-cols-2 grid-rows-2'
      case '1x4': return 'grid-cols-2 grid-rows-2'
      case '2x4': return 'grid-cols-2 grid-rows-4'
      default: return 'grid-cols-2 grid-rows-2'
    }
  }

  const getVisiblePanels = () => {
    switch (layout) {
      case '1x1': return panels.slice(0, 1)
      case '1x2': return panels.slice(0, 2)
      case '2x2': return panels.slice(0, 4)
      case '1x4': return panels.slice(0, 4)
      case '2x4': return panels.slice(0, 8)
      default: return panels.slice(0, 4)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Control Bar */}
      <div className="bg-gray-700 border-b border-gray-600 p-2 flex items-center gap-2">
        <span className="text-white text-xs font-semibold">Layout:</span>
        <button onClick={() => setLayout('1x1')} className={`px-3 py-1 rounded text-xs ${layout === '1x1' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>1x1</button>
        <button onClick={() => setLayout('1x2')} className={`px-3 py-1 rounded text-xs ${layout === '1x2' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>1x2</button>
        <button onClick={() => setLayout('2x2')} className={`px-3 py-1 rounded text-xs ${layout === '2x2' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>2x2</button>
        <button onClick={() => setLayout('1x4')} className={`px-3 py-1 rounded text-xs ${layout === '1x4' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>1^4</button>
        <button onClick={() => setLayout('2x4')} className={`px-3 py-1 rounded text-xs ${layout === '2x4' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>2x4</button>
        
        <div className="flex-1" />
        
        {selectedPanel && (
          <div className="flex gap-2">
            <span className="text-white text-xs">Panel {selectedPanel}:</span>
            <select 
              onChange={(e) => setPanelContent(selectedPanel, e.target.value as PanelContent)}
              className="px-2 py-1 bg-gray-600 text-white text-xs rounded"
            >
              <option value="none">None</option>
              <option value="rf-summary">RF Summary</option>
              <option value="signaling">Signaling</option>
              <option value="tabulated">Tabulated KPI</option>
              <option value="user-table">User Table</option>
              <option value="graph">Graph</option>
              <option value="terminal">Terminal</option>
              <option value="qualcomm">Qualcomm</option>
              <option value="map">Map</option>
            </select>
          </div>
        )}
        
        <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs">Airplane</button>
        <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs">Mobile Reset</button>
        <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs">Select All</button>
        <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs">Unselect All</button>
        <button className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs">Close</button>
      </div>

      {/* Grid Layout */}
      <div className={`flex-1 grid ${getGridClass()} gap-1 p-1 overflow-hidden`}>
        {getVisiblePanels().map(panel => (
          <div
            key={panel.id}
            onClick={() => setSelectedPanel(panel.id)}
            className={`bg-gray-900 border-2 overflow-hidden ${
              selectedPanel === panel.id ? 'border-blue-500' : 'border-gray-700'
            }`}
          >
            {panel.content === 'none' && (
              <div className="absolute top-2 left-2 text-white text-xs bg-gray-800 px-2 py-1 rounded">
                Panel {panel.id}
              </div>
            )}
            {renderPanelContent(panel)}
          </div>
        ))}
      </div>
    </div>
  )
}
