import { useState } from 'react'

export default function MenuBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const menus = {
    File: ['New', 'Open', 'Save', 'Save As', 'Export', 'Exit'],
    Setting: ['Preferences', 'Device Configuration', 'Network Settings', 'Display Options'],
    'Statistics/Status': ['Session Statistics', 'Device Status', 'Network Status'],
    'User Defined': ['New Graph', 'Edit Graph', 'Delete Graph', 'Import Template'],
    'Call Statistics': ['Call Summary', 'Success Rate', 'Drop Analysis'],
    'Mobile Reset': ['Soft Reset', 'Hard Reset', 'Airplane Mode'],
    Window: ['New Window', 'Tile Horizontal', 'Tile Vertical', 'Cascade'],
    Help: ['Documentation', 'About', 'Check Updates']
  }

  return (
    <div className="bg-gray-200 border-b border-gray-400 flex items-center text-sm">
      {Object.entries(menus).map(([menu, items]) => (
        <div key={menu} className="relative">
          <button
            onMouseEnter={() => setActiveMenu(menu)}
            onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
            className="px-3 py-1 hover:bg-gray-300 text-gray-800"
          >
            {menu}
          </button>
          {activeMenu === menu && (
            <div 
              onMouseLeave={() => setActiveMenu(null)}
              className="absolute top-full left-0 bg-white border border-gray-400 shadow-lg min-w-[200px] z-50"
            >
              {items.map(item => (
                <button
                  key={item}
                  className="w-full px-4 py-2 text-left hover:bg-blue-100 text-gray-800 text-xs"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
