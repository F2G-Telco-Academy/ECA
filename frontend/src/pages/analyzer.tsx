import { useState, useEffect } from 'react'
import AnalyzerSidebar from '@/components/AnalyzerSidebar'
import RFSummary from '@/components/RFSummary'
import SignalingViewer from '@/components/SignalingViewer'
import TabulatedKPIView from '@/components/TabulatedKPIView'
import UserDefinedTable from '@/components/UserDefinedTable'
import MultiDeviceGrid from '@/components/MultiDeviceGrid'
import MapView from '@/components/MapView'
import GraphView from '@/components/GraphView'
import TerminalViewer from '@/components/TerminalViewer'
import QualcommViewer from '@/components/QualcommViewer'
import MultiPanelGrid from '@/components/MultiPanelGrid'
import AboutDialog from '@/components/AboutDialog'
import { api } from '@/utils/api'
import type { Device } from '@/types'

interface Tab {
  id: string
  title: string
  type: 'grid' | 'rf-summary' | 'signaling' | 'tabulated' | 'user-table' | 'graph' | 'map' | 'terminal' | 'qualcomm' | 'multi-panel'
  kpiType?: string
}

export default function AnalyzerInterface() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Multi-Panel View', type: 'multi-panel' }
  ])
  const [activeTabId, setActiveTabId] = useState('1')
  const [showAbout, setShowAbout] = useState(false)

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

  const handleViewSelect = (viewName: string) => {
    const viewTypeMap: Record<string, { type: Tab['type'], kpiType?: string }> = {
      'RF Measurement Summary Info': { type: 'rf-summary' },
      'NRDC RF Measurement Summary Info': { type: 'rf-summary' },
      'Signaling Message': { type: 'signaling' },
      '5GNR Information (MIB)': { type: 'tabulated', kpiType: '5GNR Information (MIB)' },
      '5GNR SA Information (SIB1)': { type: 'tabulated', kpiType: '5GNR SA Information (SIB1)' },
      '5GNR Handover Statistics (intra NR-HO)': { type: 'tabulated', kpiType: '5GNR Handover Statistics' },
      'User Defined Table': { type: 'user-table' },
      'User Defined Graph': { type: 'graph' },
      'Map View': { type: 'map' },
      'Qualcomm DM Message': { type: 'qualcomm' },
      'Qualcomm Mobile Message': { type: 'qualcomm' },
      'Terminal Logs': { type: 'terminal' },
      'Log Streaming': { type: 'terminal' }
    }

    const viewConfig = viewTypeMap[viewName] || { type: 'tabulated', kpiType: viewName }
    
    const existingTab = tabs.find(t => t.title === viewName)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      return
    }

    const newTab: Tab = {
      id: Date.now().toString(),
      title: viewName,
      type: viewConfig.type,
      kpiType: viewConfig.kpiType
    }

    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    setTabs(prev => prev.filter(t => t.id !== tabId))
    
    if (activeTabId === tabId) {
      if (tabIndex > 0) {
        setActiveTabId(tabs[tabIndex - 1].id)
      } else if (tabs.length > 1) {
        setActiveTabId(tabs[1].id)
      }
    }
  }

  const renderTabContent = (tab: Tab) => {
    const sessionId = currentSession?.id?.toString() || selectedDevices[0] || null

    // Show message if no session/device selected
    if (!sessionId && tab.type !== 'multi-panel' && tab.type !== 'grid') {
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">📱</div>
            <div className="text-lg mb-2">No Device Selected</div>
            <div className="text-sm">Please select a device from the sidebar and start a session</div>
          </div>
        </div>
      )
    }

    try {
      switch (tab.type) {
        case 'multi-panel':
          return <MultiPanelGrid sessionId={sessionId} />
        case 'grid':
          return <MultiDeviceGrid devices={devices} onDeviceSelect={(id) => setSelectedDevices([id])} />
        case 'rf-summary':
          return <RFSummary sessionId={sessionId} />
        case 'signaling':
          return <SignalingViewer sessionId={sessionId} />
        case 'tabulated':
          return <TabulatedKPIView sessionId={sessionId} kpiType={tab.kpiType || 'General'} />
        case 'user-table':
          return <UserDefinedTable sessionId={sessionId} />
        case 'map':
          return <MapView sessionId={sessionId} />
        case 'graph':
          return <GraphView sessionId={sessionId} />
        case 'terminal':
          return <TerminalViewer sessionId={sessionId} />
        case 'qualcomm':
          return <QualcommViewer sessionId={sessionId} />
        default:
          return <div className="h-full flex items-center justify-center text-gray-400">Select a view from sidebar</div>
      }
    } catch (error) {
      return (
        <div className="h-full flex items-center justify-center text-red-400">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg mb-2">Error Loading View</div>
            <div className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</div>
          </div>
        </div>
      )
    }
  }

  const handleStartSession = async () => {
    if (!selectedDevices[0]) return
    try {
      const session = await api.startSession(selectedDevices[0])
      setCurrentSession(session)
    } catch (err) {
      console.error('Failed to start session:', err)
    }
  }

  const handleStopSession = async () => {
    if (!currentSession) return
    try {
      await api.stopSession(currentSession.id)
      setCurrentSession(null)
    } catch (err) {
      console.error('Failed to stop session:', err)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Toolbar */}
      <div className="bg-gray-200 border-b border-gray-300 px-2 py-1 flex items-center gap-1">
        <button className="p-1 hover:bg-gray-300 rounded" title="New">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button className="p-1 hover:bg-gray-300 rounded" title="Open">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button className="p-1 hover:bg-gray-300 rounded" title="Save">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </button>
        <div className="w-px h-6 bg-gray-400 mx-1" />
        <button onClick={handleStopSession} disabled={!currentSession} className={`p-1 rounded ${currentSession ? 'bg-red-500 text-white hover:bg-red-600' : 'hover:bg-gray-300 opacity-50'}`} title="Stop">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>
        </button>
        <button onClick={handleStartSession} disabled={currentSession || !selectedDevices[0]} className={`p-1 rounded ${!currentSession && selectedDevices[0] ? 'bg-green-500 text-white hover:bg-green-600' : 'hover:bg-gray-300 opacity-50'}`} title="Start">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </button>
        <div className="w-px h-6 bg-gray-400 mx-1" />
        <button className="p-1 hover:bg-gray-300 rounded" title="Settings">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="flex-1" />
        <div className="text-xs text-gray-600">
          {currentSession ? <span className="text-green-600 font-semibold">● Recording</span> : <span>Ready</span>}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Left Sidebar */}
        <AnalyzerSidebar
          onDeviceSelect={setSelectedDevices}
          onKpiSelect={(kpi) => console.log('KPI:', kpi)}
          onViewSelect={handleViewSelect}
        />

        {/* Right Content Area with Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="bg-gray-200 border-b border-gray-300 flex items-center overflow-x-auto">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-r border-gray-300 text-sm whitespace-nowrap ${
                  activeTabId === tab.id ? 'bg-white font-semibold' : 'bg-gray-100 hover:bg-gray-50'
                }`}
              >
                <span>{tab.title}</span>
                {tabs.length > 1 && (
                  <button onClick={(e) => closeTab(tab.id, e)} className="text-gray-500 hover:text-gray-700 font-bold">×</button>
                )}
              </div>
            ))}
          </div>

          {/* Active Tab Content */}
          <div className="flex-1 overflow-hidden bg-white">
            {tabs.map(tab => (
              <div key={tab.id} className={`h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}>
                {renderTabContent(tab)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-blue-600 text-white px-4 py-1 flex items-center gap-6 text-xs">
        <div><span className="font-semibold">No GPS</span></div>
        <div><span className="font-semibold">{currentSession ? 'Logging' : 'Not Logging'}</span> <span>CPU: {Math.floor(Math.random() * 30 + 40)}%</span></div>
        <div><span className="font-semibold">Memory</span> <span>{Math.floor(Math.random() * 20 + 60)}%</span></div>
        <div className="ml-auto flex items-center gap-4">
          <span>ECA v0.1.0 : {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
          <span className="text-xs opacity-80">© 2025 F2G Telco Academy - Proprietary Software</span>
        </div>
      </div>
    </div>
  )
}
