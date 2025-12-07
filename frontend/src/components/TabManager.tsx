import { useState } from 'react'

interface Tab {
  id: string
  title: string
  component: React.ReactNode
  closeable?: boolean
}

interface TabManagerProps {
  tabs: Tab[]
  onTabClose?: (id: string) => void
}

export default function TabManager({ tabs, onTabClose }: TabManagerProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id)

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-gray-200 border-b border-gray-400 overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 border-r border-gray-400 cursor-pointer ${
              activeTab === tab.id ? 'bg-white' : 'hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-sm text-gray-800">{tab.title}</span>
            {tab.closeable && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose?.(tab.id)
                }}
                className="text-gray-600 hover:text-red-600"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {tabs.find(t => t.id === activeTab)?.component}
      </div>
    </div>
  )
}
