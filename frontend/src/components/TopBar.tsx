import Link from 'next/link'

interface Props {
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

export default function TopBar({ currentPage, onPageChange }: Props = {}) {
  const tabs = [
    { href: '/live', id: 'signaling', label: 'Live Messages' },
    { href: '/logs', id: 'logs', label: 'Log Messages' },
    { href: '/kpi', id: 'kpi', label: 'KPI' },
    { href: '/5gnr', id: '5gnr', label: '5GNR Info' },
    { href: '/visualize', id: 'visualize', label: 'Visualize' },
    { href: '/analyze', id: 'analyze', label: 'Analyze' },
    { href: '/convert', id: 'convert', label: 'Convert' },
    { href: '/devices', id: 'devices', label: 'Devices' },
    { href: '/settings', id: 'settings', label: 'Settings' },
    { href: '/help', id: 'help', label: 'Help' },
  ]

  return (
    <div className="border-b border-gray-800 bg-black">
      {/* Menu bar */}
      <div className="px-4 py-1 text-[11px] text-gray-300 border-b border-gray-800 flex gap-6">
        <span>File</span>
        <span>Setting</span>
        <span>Statistics/Status</span>
        <span>User Defined</span>
        <span>Call Statistics</span>
        <span>Mobile Reset</span>
        <span>Window</span>
        <span>Help</span>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-1 bg-gray-950 border-b border-gray-800 text-gray-300 text-xs flex items-center gap-2">
        <button title="Save" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">
          💾
        </button>
        <button title="Open" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">
          📂
        </button>
        <button title="Settings" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">
          ⚙️
        </button>
        <span className="mx-1 w-px h-4 bg-gray-800" />
        <button title="Warning" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">⚠️</button>
        <button title="Info" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">ℹ️</button>
        <button title="Search" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">🔍</button>
        <span className="mx-1 w-px h-4 bg-gray-800" />
        <button title="Zoom -" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">➖</button>
        <button title="Zoom +" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">➕</button>
        <span className="mx-1 w-px h-4 bg-gray-800" />
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-400">System Ready</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-2 overflow-x-auto">
        {tabs.map(t => (
          <Link key={t.id} href={t.href} className={`px-4 py-2 text-xs border-b-2 ${
            currentPage === t.id ? 'border-white text-white bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-950'
          }`} onClick={() => onPageChange?.(t.id)}>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
