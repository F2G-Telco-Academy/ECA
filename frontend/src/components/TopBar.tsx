interface Props {
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

export default function TopBar({ currentPage, onPageChange }: Props = {}) {
  const tabs = [
    { id: 'signaling', label: 'Live Signaling' },
    { id: 'convert', label: 'Convert' },
    { id: 'visualize', label: 'Visualize' },
    { id: 'analyze', label: 'Analyze' },
  ]

  return (
    <div className="border-b border-gray-200 bg-white text-gray-800">
      {/* Menu bar */}
      <div className="px-4 py-1 text-[11px] text-gray-600 border-b border-gray-200 flex gap-6">
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
      <div className="px-3 py-1 bg-gray-50 border-b border-gray-200 text-gray-700 text-xs flex items-center gap-2">
        <button title="Save" className="px-2 py-1 hover:bg-gray-100 rounded border border-transparent hover:border-gray-300">
          💾
        </button>
        <button title="Open" className="px-2 py-1 hover:bg-gray-100 rounded border border-transparent hover:border-gray-300">
          📂
        </button>
        <button title="Settings" className="px-2 py-1 hover:bg-gray-100 rounded border border-transparent hover:border-gray-300">
          ⚙️
        </button>
        <span className="mx-1 w-px h-4 bg-gray-200" />
        <button title="Warning" className="px-2 py-1 hover:bg-gray-100 rounded border border-transparent hover:border-gray-300">⚠️</button>
        <button title="Info" className="px-2 py-1 hover:bg-gray-100 rounded border border-transparent hover:border-gray-300">ℹ️</button>
        <button title="Search" className="px-2 py-1 hover:bg-gray-100 rounded border border-transparent hover:border-gray-300">🔍</button>
        <span className="mx-1 w-px h-4 bg-gray-200" />
        <button title="Zoom -" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">➖</button>
        <button title="Zoom +" className="px-2 py-1 hover:bg-gray-900 rounded border border-transparent hover:border-gray-700">➕</button>
        <span className="mx-1 w-px h-4 bg-gray-200" />
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600">System Ready</span>
        </div>
      </div>

      {/* Tabs (no navigation, in-page switching) */}
      <div className="flex px-2 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            className={`px-4 py-2 text-xs border-b-2 ${
              currentPage === t.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => onPageChange?.(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
