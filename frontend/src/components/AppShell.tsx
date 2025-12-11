"use client"
import { useEffect, useMemo, useState } from 'react'
import TopBar from '@/components/TopBar'
import Sidebar from '@/components/Sidebar'
import StatusBar from '@/components/StatusBar'
import SignalingPage from '@/components/SignalingPage'
import ConvertView from '@/views/ConvertView'
import VisualizeView from '@/views/VisualizeView'
import AnalyzeView from '@/views/AnalyzeView'
import type { Device } from '@/types'

type TabId = 'signaling' | 'convert' | 'visualize' | 'analyze'

export default function AppShell() {
  const [tab, setTab] = useState<TabId>('signaling')
  const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
  const [packetCount, setPacketCount] = useState(0)
  const [devices, setDevices] = useState<Device[]>([])
  const [category, setCategory] = useState<string|null>(null)

  // Load devices periodically to fill chips and sidebar
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

  // Sync tab with URL hash (no full page navigation)
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
    // update hash for back/forward without redirect
    if (typeof window !== 'undefined') window.location.hash = t
  }

  const content = useMemo(() => {
    switch(tab){
      case 'convert':
        return <ConvertView />
      case 'visualize':
        return <VisualizeView />
      case 'analyze':
        return <AnalyzeView />
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
    <div className="min-h-screen flex flex-col bg-white text-gray-800">
      <TopBar currentPage={tab} onPageChange={onTabChange} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar fixed */}
        <Sidebar selectedDevice={selectedDevice} onDeviceSelect={setSelectedDevice} onSelectCategory={setCategory} />
        {/* Main content area swaps only the embedded view */}
        <div className="flex-1 overflow-hidden">{content}</div>
      </div>
      <StatusBar />
    </div>
  )
}
