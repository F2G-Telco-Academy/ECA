import { useState } from 'react'
import { X } from 'lucide-react'
import dynamic from 'next/dynamic'

const XCALRFSummary = dynamic(() => import('./XCALRFSummary'), { ssr: false })
const XCALSignalingViewer = dynamic(() => import('./XCALSignalingViewer'), { ssr: false })
const FiveGNRInfo = dynamic(() => import('./FiveGNRInfo'), { ssr: false })
const QualcommDMViewer = dynamic(() => import('./QualcommDMViewer'), { ssr: false })
const UserDefinedGraphs = dynamic(() => import('./UserDefinedGraphs'), { ssr: false })
const UserDefinedTable = dynamic(() => import('./UserDefinedTable'), { ssr: false })
const ProductionGPSClusteringMap = dynamic(() => import('./ProductionGPSClusteringMap'), { ssr: false })

export interface Tab {
  id: string
  title: string
  type: string
  closeable: boolean
}

interface XCALTabManagerProps {
  sessionId: string | null
  initialTabs?: Tab[]
}

export default function XCALTabManager({ sessionId, initialTabs = [] }: XCALTabManagerProps) {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs.length > 0 ? initialTabs : [
    { id: 'signaling-1', title: 'Signaling Message', type: 'signaling', closeable: true }
  ])
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id)

  const addTab = (title: string, type: string) => {
    const newTab: Tab = {
      id: `${type}-${Date.now()}`,
      title,
      type,
      closeable: true
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  const closeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    
    if (activeTabId === tabId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1)
      setActiveTabId(newTabs[newActiveIndex].id)
    }
  }

  const renderTabContent = (tab: Tab) => {
    const numericSessionId = sessionId ? (typeof sessionId === 'string' ? parseInt(sessionId) : sessionId) : null
    
    switch (tab.type) {
      case 'rf-summary':
        return <XCALRFSummary sessionId={sessionId} />
      
      case 'signaling':
        return <XCALSignalingViewer sessionId={sessionId} />
      
      case '5gnr-mib':
        return <FiveGNRInfo sessionId={sessionId} type="MIB" />
      
      case '5gnr-sib1':
        return <FiveGNRInfo sessionId={sessionId} type="SIB1" />
      
      case 'qualcomm-dm':
        return <QualcommDMViewer sessionId={sessionId} />
      
      case 'user-graph':
        return <UserDefinedGraphs sessionId={numericSessionId} />
      
      case 'user-table':
        return <UserDefinedTable sessionId={numericSessionId} />
      
      case 'map':
        return <ProductionGPSClusteringMap sessionId={sessionId} />
      
      default:
        return (
          <div className="flex items-center justify-center h-full bg-gray-900 text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">{tab.title}</h3>
              <p className="text-gray-400">Content for this view is being loaded...</p>
            </div>
          </div>
        )
    }
  }

  const activeTab = tabs.find(t => t.id === activeTabId)

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Tab Bar */}
      <div className="flex items-center bg-white border-b border-gray-300 overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 border-r border-gray-300 cursor-pointer min-w-max ${
              activeTabId === tab.id
                ? 'bg-blue-50 border-b-2 border-b-blue-500'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="text-sm font-medium">{tab.title}</span>
            {tab.closeable && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="hover:bg-gray-200 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab && renderTabContent(activeTab)}
      </div>
    </div>
  )
}
