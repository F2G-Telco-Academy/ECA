export default function IconToolbar() {
  return (
    <div className="bg-gray-100 border-b border-gray-400 flex items-center gap-1 px-2 py-1">
      <button className="p-2 hover:bg-gray-300 rounded" title="New">📄</button>
      <button className="p-2 hover:bg-gray-300 rounded" title="Open">📁</button>
      <button className="p-2 hover:bg-gray-300 rounded" title="Save">💾</button>
      <div className="w-px h-6 bg-gray-400 mx-1" />
      <button className="p-2 hover:bg-gray-300 rounded" title="Statistics">📊</button>
      <button className="p-2 hover:bg-gray-300 rounded" title="Settings">⚙️</button>
      <button className="p-2 hover:bg-gray-300 rounded" title="Alerts">⚠️</button>
      <button className="p-2 hover:bg-gray-300 rounded" title="Search">🔍</button>
      <div className="w-px h-6 bg-gray-400 mx-1" />
      <button className="p-2 hover:bg-gray-300 rounded" title="Device">📱</button>
      <button className="p-2 hover:bg-gray-300 rounded bg-green-200" title="Start">▶️</button>
      <button className="p-2 hover:bg-gray-300 rounded" title="Pause">⏸️</button>
      <button className="p-2 hover:bg-gray-300 rounded bg-red-200" title="Stop">⏹️</button>
      <div className="w-px h-6 bg-gray-400 mx-1" />
      <button className="p-2 hover:bg-gray-300 rounded" title="Export">📤</button>
    </div>
  )
}
