"use client"
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import TopBar from '@/components/TopBar'
import AnalyzerSidebar from '@/components/AnalyzerSidebar'
import StatusBar from '@/components/StatusBar'
import SignalingPage from '@/components/SignalingPage'
import ConvertView from '@/views/ConvertView'
import VisualizeView from '@/views/VisualizeView'
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
  const [selectedView, setSelectedView] = useState<string|null>(null)

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
    // Don't auto-switch tabs - let user stay on current tab
  }

  const content = useMemo(() => {
    switch(tab){
      case 'convert':
        return <ConvertView />
      case 'visualize':
        return <VisualizeView />
      case 'analyze':
        return <AnalyzerInterface />
      case 'signaling':
      default:
        return (
          <SignalingPage
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={setSelectedDevice}
            onPacketCount={setPacketCount}
            categoryFilter={category}
          />
        )
    }
  }, [tab, devices, selectedDevice, category])

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
