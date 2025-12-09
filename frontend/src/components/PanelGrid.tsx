import { ReactNode } from 'react'

interface Panel {
  id: string
  title: string
  content: ReactNode
}

interface PanelGridProps {
  panels: Panel[]
  layout?: '1x1' | '2x2' | '1x4' | '2x4'
}

export default function PanelGrid({ panels, layout = '2x2' }: PanelGridProps) {
  if (!panels || panels.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-500">No panels to display</div>
  }

  const gridClass = {
    '1x1': 'grid-cols-1 grid-rows-1',
    '2x2': 'grid-cols-2 grid-rows-2',
    '1x4': 'grid-cols-1 grid-rows-4',
    '2x4': 'grid-cols-2 grid-rows-4'
  }[layout]

  return (
    <div className={`grid ${gridClass} gap-1 h-full bg-slate-950`}>
      {panels.map((panel) => (
        <div key={panel.id} className="bg-slate-900 border border-slate-700 flex flex-col overflow-hidden">
          <div className="bg-slate-800 px-3 py-1 text-sm font-semibold border-b border-slate-700">
            {panel.title}
          </div>
          <div className="flex-1 overflow-auto">
            {panel.content}
          </div>
        </div>
      ))}
    </div>
  )
}
