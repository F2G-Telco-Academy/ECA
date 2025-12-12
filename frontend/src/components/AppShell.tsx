"use client"
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import TopBar from '@/components/TopBar'
import AnalyzerSidebar from '@/components/AnalyzerSidebar'
import StatusBar from '@/components/StatusBar'
import SignalingPage from '@/components/SignalingPage'
import ConvertView from '@/views/ConvertView'
import VisualizeView from '@/views/VisualizeView'
import AnalyzeView from '@/views/AnalyzeView'
import type { Device } from '@/types'

// Dynamically import the XCAL-structured analyzer
const AnalyzerInterface = dynamic(() => import('@/pages/analyzer'), { ssr: false })

type TabId = 'signaling' | 'convert' | 'visualize' | 'analyze'

export default function AppShell() {
  const [tab, setTab] = useState<TabId>('signaling')
  const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [packetCount, setPacketCount] = useState(0)
  const [devices, setDevices] = useState<Device[]>([])
  const [category, setCategory] = useState<string|null>(null)
  const [selectedView, setSelectedView] = useState<string>('Signaling Message')

  // Load devices periodically
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/devices')
        if (res.ok) {
          const list = await res.json()
          setDevices(list || [])
        }
      } catch {}
    }
    load()
    const i = setInterval(load, 3000)
    return () => clearInterval(i)
  }, [])

  // Sync tab with URL hash
  useEffect(() => {
    const applyHash = () => {
      const h = (window.location.hash || '').replace('#','') as TabId
      if (h && ['signaling','convert','visualize','analyze'].includes(h)) setTab(h)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const onTabChange = (t: TabId) => {
    setTab(t)
    if (typeof window !== 'undefined') window.location.hash = t
  }

  const handleViewSelect = (view: string) => {
    setSelectedView(view)
  }

  // Get sessionId for views
  const sessionId = selectedDevices[0] || null

  // Render view based on sidebar selection
  const renderView = () => {
    if (!sessionId) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">📱</div>
            <div className="text-lg mb-2">No Device Selected</div>
            <div className="text-sm">Please select a device from the sidebar</div>
          </div>
        </div>
      )
    }

    // Map view names to components
    const viewMap: Record<string, any> = {
      'Signaling Message': () => import('@/components/SignalingViewer'),
      'Terminal Logs': () => import('@/components/TerminalViewer'),
      'RF Measurement Summary Info': () => import('@/components/RFSummary'),
      'Qualcomm DM Message': () => import('@/components/QualcommViewer'),
      'User Defined Table': () => import('@/components/UserDefinedTable'),
      'User Defined Graph': () => import('@/components/GraphView'),
      'Map View': () => import('@/components/MapView'),
    }

    const ViewComponent = viewMap[selectedView]
    if (ViewComponent) {
      const Component = dynamic(ViewComponent, { ssr: false })
      return <Component sessionId={sessionId} />
    }

    return <SignalingPage
      devices={devices}
      selectedDevice={selectedDevice}
      onSelectDevice={setSelectedDevice}
      onPacketCount={setPacketCount}
      categoryFilter={category}
    />
  }

  const content = useMemo(() => {
    switch(tab){
      case 'convert':
        return <ConvertView />
      case 'visualize':
        return <VisualizeView />
      case 'analyze':
        return <AnalyzeView sessionId={sessionId} />
      case 'signaling':
      default:
        return renderView()
    }
  }, [tab, selectedView, devices, selectedDevice, category, sessionId])

  return (
    <div className="h-screen flex flex-col bg-white text-gray-800">
      <TopBar currentPage={tab} onPageChange={onTabChange} />
      <div className="flex flex-1 overflow-hidden">
        {/* AnalyzerSidebar for all tabs (XCAL structure with device slots) */}
        {tab !== 'analyze' && (
          <AnalyzerSidebar
            onDeviceSelect={(ids) => {
              setSelectedDevices(ids)
              if (ids.length > 0) setSelectedDevice(ids[0])
            }}
            onKpiSelect={setCategory}
            onViewSelect={handleViewSelect}
          />
        )}
        {/* Main content area */}
        <div className="flex-1 overflow-hidden">{content}</div>
      </div>
      <StatusBar />
    </div>
  )
}
