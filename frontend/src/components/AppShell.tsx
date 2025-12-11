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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

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

  // Persist theme (localStorage + system preference)
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('eca-theme') as 'light' | 'dark' | null : null
    if (saved) {
      setTheme(saved)
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eca-theme', theme)
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

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
        return <ConvertView theme={theme} />
      case 'visualize':
        return <VisualizeView theme={theme} />
      case 'analyze':
        return <AnalyzeView />
      case 'signaling':
      default:
        return (
          <SignalingPage
            theme={theme}
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
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-900 text-gray-100' : 'bg-white text-gray-800'}`}>
      <TopBar
        currentPage={tab}
        onPageChange={onTabChange}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        theme={theme}
      />
      <div className="flex flex-1 overflow-hidden relative pb-16 md:pb-0">
        {/* Sidebar desktop */}
        <div className="hidden md:block">
          <Sidebar
            theme={theme}
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceSelect={setSelectedDevice}
            onSelectCategory={setCategory}
          />
        </div>

        {/* Sidebar mobile overlay */}
        {sidebarOpen && (
          <div className="md:hidden absolute inset-0 z-20 flex">
            <div className="w-64 max-w-[70vw] bg-black shadow-lg">
              <Sidebar
                theme={theme}
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={(id) => {
                  setSelectedDevice(id)
                  setSidebarOpen(false)
                }}
                onSelectCategory={(cat) => {
                  setCategory(cat)
                  setSidebarOpen(false)
                }}
              />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        <div className="flex-1 overflow-hidden">{content}</div>
      </div>

      {/* Bottom navigation for mobile */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-30 border-t ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
        <div className="grid grid-cols-4 text-xs">
          {(['signaling','convert','visualize','analyze'] as TabId[]).map((id) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`py-2 ${tab === id ? 'text-blue-600 font-semibold' : ''}`}
            >
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <StatusBar deviceCount={devices.length} packetCount={packetCount} theme={theme} />
    </div>
  )
}
