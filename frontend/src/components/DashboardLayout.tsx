'use client'
import { useState } from 'react'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface Panel {
  i: string
  x: number
  y: number
  w: number
  h: number
  component: React.ReactNode
  title: string
}

interface DashboardLayoutProps {
  panels: Panel[]
  onLayoutChange?: (layout: Layout[]) => void
}

export default function DashboardLayout({ panels, onLayoutChange }: DashboardLayoutProps) {
  const [layouts, setLayouts] = useState<Layout[]>(
    panels.map(p => ({ i: p.i, x: p.x, y: p.y, w: p.w, h: p.h }))
  )

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayouts(newLayout)
    onLayoutChange?.(newLayout)
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layouts }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={60}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".drag-handle"
      isDraggable
      isResizable
      compactType="vertical"
    >
      {panels.map(panel => (
        <div key={panel.i} className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
          <div className="drag-handle bg-gray-900 px-3 py-2 cursor-move flex items-center justify-between border-b border-gray-700">
            <span className="text-sm font-semibold text-gray-300">{panel.title}</span>
            <div className="flex gap-2">
              <button className="text-gray-400 hover:text-white text-xs">⚙</button>
              <button className="text-gray-400 hover:text-white text-xs">✕</button>
            </div>
          </div>
          <div className="h-[calc(100%-40px)] overflow-auto">
            {panel.component}
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
