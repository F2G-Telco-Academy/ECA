import { useState } from 'react'
import dynamic from 'next/dynamic'

const AnalyticsDashboard = dynamic(() => import('./AnalyticsDashboard'), { ssr: false })
const CellInfoPanel = dynamic(() => import('./CellInfoPanel'), { ssr: false })
const NeighborCellList = dynamic(() => import('./NeighborCellList'), { ssr: false })
const BearerStatusPanel = dynamic(() => import('./BearerStatusPanel'), { ssr: false })
const EventTimeline = dynamic(() => import('./EventTimeline'), { ssr: false })
const ProtocolStackViewer = dynamic(() => import('./ProtocolStackViewer'), { ssr: false })
const ThroughputChart = dynamic(() => import('./ThroughputChart'), { ssr: false })
const ExportManager = dynamic(() => import('./ExportManager'), { ssr: false })
const SettingsPanel = dynamic(() => import('./SettingsPanel'), { ssr: false })

interface Props {
  sessionId: number
  pcapPath: string
}

export default function ComprehensiveDashboard({ sessionId, pcapPath }: Props) {
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'network' | 'export'>('overview')

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b px-4 py-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded ${activeView === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 rounded ${activeView === 'analytics' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveView('network')}
            className={`px-4 py-2 rounded ${activeView === 'network' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Network
          </button>
          <button
            onClick={() => setActiveView('export')}
            className={`px-4 py-2 rounded ${activeView === 'export' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeView === 'overview' && (
          <div className="grid grid-cols-2 gap-4">
            <CellInfoPanel sessionId={sessionId} />
            <ThroughputChart pcapPath={pcapPath} />
            <BearerStatusPanel sessionId={sessionId} />
            <EventTimeline sessionId={sessionId} />
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="space-y-4">
            <AnalyticsDashboard pcapPath={pcapPath} />
            <ProtocolStackViewer pcapPath={pcapPath} />
          </div>
        )}

        {activeView === 'network' && (
          <div className="grid grid-cols-2 gap-4">
            <CellInfoPanel sessionId={sessionId} />
            <NeighborCellList sessionId={sessionId} />
            <div className="col-span-2">
              <BearerStatusPanel sessionId={sessionId} />
            </div>
          </div>
        )}

        {activeView === 'export' && (
          <div className="grid grid-cols-2 gap-4">
            <ExportManager sessionId={sessionId} />
            <SettingsPanel />
          </div>
        )}
      </div>
    </div>
  )
}
