interface Props {
  currentPage?: string
  onPageChange?: (page: string) => void
  onMenuToggle?: () => void
  onThemeToggle?: () => void
  theme?: "light" | "dark"
}

export default function TopBar({ currentPage, onPageChange, onMenuToggle, onThemeToggle, theme }: Props = {}) {
  const tabs = [
    { id: "signaling", label: "Live Signaling", icon: "📡" },
    { id: "convert", label: "Convert", icon: "📄" },
    { id: "visualize", label: "Visualize", icon: "📈" },
    { id: "analyze", label: "Analyze", icon: "🔍" },
  ]

  return (
    <div className="border-b border-gray-200 bg-white text-gray-800">
      <div className="px-4 h-12 flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded border border-gray-200 hover:bg-gray-100"
          aria-label="Toggle menu"
          onClick={onMenuToggle}
        >
          ☰
        </button>
        <div className="font-semibold text-sm text-gray-700">Extended Cellular Analyzer</div>
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
          <span>File</span>
          <span>Settings</span>
          <span>Statistics</span>
          <span>User Defined</span>
          <span>Help</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
          <button
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-100"
            onClick={onThemeToggle}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "🌙" : "🌞"}
          </button>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span>System Ready</span>
        </div>
      </div>

      <div className="flex px-4 py-2 overflow-x-auto gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              currentPage === t.id ? "bg-black text-white shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onPageChange?.(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
