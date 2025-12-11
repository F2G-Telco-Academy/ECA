import { useState, useEffect } from 'react'
import XCALSidebar from '@/components/XCALSidebar'
import XCALRFSummary from '@/components/XCALRFSummary'
import XCALSignalingViewer from '@/components/XCALSignalingViewer'
import XCALGraphView from '@/components/XCALGraphView'
import UserDefinedTable from '@/components/UserDefinedTable'
import TabulatedKPIView from '@/components/TabulatedKPIView'
import MultiDeviceGrid from '@/components/MultiDeviceGrid'
import MapView from '@/components/MapView'
import SessionControlPanel from '@/components/SessionControlPanel'
import EnhancedTerminalV2 from '@/components/EnhancedTerminalV2'
import { api } from '@/utils/api'
import type { Device } from '@/types'

export default function XCALInterface() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [tabs, setTabs] = useState<Array<{ id: string; title: string; view: string; kpiType?: string }>>([
    { id: '1', title: 'Devices List', view: 'grid' }
  ])
  const [activeTab, setActiveTab] = useState('1')
  const [systemStats, setSystemStats] = useState({
    gps: 'No GPS',
    logging: 'Not Logging',
    cpu: '0%',
    memory: '0%'
  })

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devs = await api.getDevices()
        setDevices(devs)
        
        // Update system stats
        setSystemStats(prev => ({
          ...prev,
          logging: currentSession ? 'Logging' : 'Not Logging',
          cpu: `${Math.floor(Math.random() * 30 + 40)}%`,
          memory: `${Math.floor(Math.random() * 20 + 60)}%`
        }))
      } catch (err) {
        console.error('Failed to fetch devices:', err)
      }
    }

    fetchDevices()
    const interval = setInterval(fetchDevices, 3000)
    return () => clearInterval(interval)
  }, [currentSession])

  const handleDeviceSelect = (deviceIds: string[]) => {
    setSelectedDevices(deviceIds)
  }

  const handleViewSelect = (view: string, kpiType?: string) => {
    const viewMap: Record<string, string> = {
      'RF Measurement Summary Info': 'rf-summary',
      'Signaling Message': 'signaling',
      'User Defined Graph': 'graphs',
      'User Defined Table': 'user-table',
      'Map View': 'map',
      'Session Control': 'session-control',
      'Terminal': 'terminal',
      '5GNR Information (MIB)': 'tabulated-kpi',
      '5GNR SA Information (SIB1)': 'tabulated-kpi',
      '5GNR Handover Statistics (intra NR-HO)': 'tabulated-kpi',
      'LTE RRC State': 'tabulated-kpi',
      'NRDC RF Measurement Summary Info': 'rf-summary'
    }

    const mappedView = viewMap[view] || 'rf-summary'
    
    // Check if tab already exists
    const existingTab = tabs.find(t => t.title === view)
    if (existingTab) {
      setActiveTab(existingTab.id)
      return
    }
    
    // Add new tab
    const newTab = {
      id: Date.now().toString(),
      title: view,
      view: mappedView,
      kpiType: view
    }
    
    setTabs(prev => [...prev, newTab])
    setActiveTab(newTab.id)
  }

  const closeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    setTabs(prev => prev.filter(t => t.id !== tabId))
    
    if (activeTab === tabId) {
      if (tabIndex > 0) {
        setActiveTab(tabs[tabIndex - 1].id)
      } else if (tabs.length > 1) {
        setActiveTab(tabs[1].id)
      } else {
        setActiveTab('1')
      }
    }
  }

  const renderView = (view: string, kpiType?: string) => {
    const sessionId = currentSession?.id?.toString() || selectedDevices[0]

    switch (view) {
      case 'grid':
        return (
          <MultiDeviceGrid
            devices={devices}
            onDeviceSelect={(deviceId) => setSelectedDevices([deviceId])}
          />
        )
      case 'rf-summary':
        return <XCALRFSummary sessionId={sessionId} />
      case 'signaling':
        return <XCALSignalingViewer sessionId={sessionId} />
      case 'graphs':
        return <XCALGraphView sessionId={sessionId} />
      case 'user-table':
        return <UserDefinedTable sessionId={sessionId} />
      case 'tabulated-kpi':
        return <TabulatedKPIView sessionId={sessionId} kpiType={kpiType || 'General'} />
      case 'map':
        return <MapView sessionId={sessionId} />
      case 'terminal':
        return <EnhancedTerminalV2 sessionId={sessionId} />
      case 'session-control':
        return (
          <SessionControlPanel
            deviceId={selectedDevices[0] || null}
            sessionId={currentSession?.id || null}
            onSessionStart={setCurrentSession}
            onSessionStop={() => setCurrentSession(null)}
          />
        )
      default:
        return <div className="flex items-center justify-center h-full text-gray-400">Select a view</div>
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
      {/* Top Menu Bar */}
      <div className="bg-white border-b border-gray-300 px-4 py-1 flex items-center gap-4 text-sm">
        <span className="font-semibold cursor-pointer hover:text-blue-600">File</span>
        <span className="font-semibold cursor-pointer hover:text-blue-600">Setting</span>
        <span className="font-semibold cursor-pointer hover:text-blue-600">Statistics/Status</span>
        <span className="font-semibold cursor-pointer hover:text-blue-600">User Defined</span>
        <span className="font-semibold cursor-pointer hover:text-blue-600">Call Statistics</span>
        <span className="font-semibold cursor-pointer hover:text-blue-600">Mobile Reset</span>
        <span className="font-semibold cursor-pointer hover:text-blue-600">Window</span>
        <span className="font-semibold cursor-pointer hover:text-blue-600">Help</span>
      </div>

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
        <button
          onClick={handleStopSession}
          className={`p-1 rounded ${currentSession ? 'bg-red-500 text-white hover:bg-red-600' : 'hover:bg-gray-300'}`}
          title="Stop"
          disabled={!currentSession}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>
        <button
          onClick={handleStartSession}
          className={`p-1 rounded ${!currentSession && selectedDevices[0] ? 'bg-green-500 text-white hover:bg-green-600' : 'hover:bg-gray-300'}`}
          title="Start"
          disabled={currentSession || !selectedDevices[0]}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
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
          {currentSession ? (
            <span className="text-green-600 font-semibold">● Recording</span>
          ) : (
            <span>Ready</span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <XCALSidebar
          onDeviceSelect={handleDeviceSelect}
          onKpiSelect={(kpi) => console.log('KPI:', kpi)}
          onViewSelect={handleViewSelect}
        />

        {/* Content Area with Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="bg-gray-200 border-b border-gray-300 flex items-center gap-1 px-2 overflow-x-auto">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-1 rounded-t cursor-pointer ${
                  activeTab === tab.id ? 'bg-white border-t border-l border-r border-gray-300' : 'bg-gray-100 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-sm">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Active View */}
          <div className="flex-1 overflow-hidden bg-white">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`h-full ${activeTab === tab.id ? 'block' : 'hidden'}`}
              >
                {renderView(tab.view, tab.kpiType)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-blue-600 text-white px-4 py-1 flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{systemStats.gps}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{systemStats.logging}</span>
          <span>CPU: {systemStats.cpu}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Memory</span>
          <span>{systemStats.memory}</span>
        </div>
        <div className="ml-auto">
          <span>sires : {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}, AMD : 2025-05-1</span>
        </div>
      </div>
    </div>
  )
}
