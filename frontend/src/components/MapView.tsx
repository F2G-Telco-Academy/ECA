import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

export default function MapView({ sessionId }: { sessionId: string | null }) {
  const [mapData, setMapData] = useState<any>(null)
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('')
  const [selectedParameter, setSelectedParameter] = useState('NR_Num_of_Detected_Beams(P)')
  const [isLogging, setIsLogging] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    const fetchMapData = async () => {
      try {
        const data = await api.getMapData(sessionId)
        setMapData(data)
      } catch (err) {
        console.error('Failed to fetch map data:', err)
      }
    }
    fetchMapData()
    const interval = setInterval(fetchMapData, 3000)
    return () => clearInterval(interval)
  }, [sessionId])

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-yellow-100 border-b border-gray-300 p-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Building</label>
            <select value={selectedBuilding} onChange={(e) => setSelectedBuilding(e.target.value)} className="px-2 py-1 border border-gray-400 rounded text-sm">
              <option value="">Select Building</option>
              <option value="building1">Building 1</option>
              <option value="building2">Building 2</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Floor</label>
            <select value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)} className="px-2 py-1 border border-gray-400 rounded text-sm">
              <option value="">Select Floor</option>
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
            </select>
          </div>
          <button className="p-1 bg-white border border-gray-400 rounded hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Parameter Selection Bar */}
      <div className="bg-blue-500 border-b border-blue-600 p-2 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
          </div>
          <label className="text-white text-sm font-semibold">Parameter</label>
        </div>
        <select value={selectedParameter} onChange={(e) => setSelectedParameter(e.target.value)} className="px-3 py-1 border border-blue-600 rounded text-sm flex-1 max-w-md">
          <option>M1</option>
          <option>5GNR-Q</option>
          <option>NR_Num_of_Detected_Beams(P)</option>
          <option>RSRP</option>
          <option>RSRQ</option>
          <option>SINR</option>
        </select>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white" title="Zoom In">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
          <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white" title="Zoom Out">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white" title="Fit to Screen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 bg-white relative">
          {mapData ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 mb-2">Map View</div>
                <div className="text-sm text-gray-500">GPS data will be displayed here</div>
                <div className="text-xs text-gray-400 mt-2">Parameter: {selectedParameter}</div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400">No GPS data available</div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-24 bg-gray-200 border-l border-gray-300 flex flex-col items-center py-4 gap-4">
          <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded" title="Shortcut Keys">
            <div className="w-12 h-12 bg-white border border-gray-400 rounded flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs">Shortcut Keys</span>
          </button>

          <button onClick={() => setIsLogging(!isLogging)} className={`flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded ${isLogging ? 'bg-green-200' : ''}`} title="Logging Start">
            <div className={`w-12 h-12 border border-gray-400 rounded-full flex items-center justify-center ${isLogging ? 'bg-green-500' : 'bg-white'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs">Logging Start</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded" title="Autocall Start">
            <div className="w-12 h-12 bg-white border border-gray-400 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-xs">Autocall Start</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded" title="Measurement Start">
            <div className="w-12 h-12 bg-white border border-gray-400 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-xs">Measurement Start</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded" title="Print Stop">
            <div className="w-12 h-12 bg-white border border-gray-400 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="text-xs">Print Stop</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded" title="Pause">
            <div className="w-12 h-12 bg-white border border-gray-400 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </div>
            <span className="text-xs">Pause</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded" title="Call Listing">
            <div className="w-12 h-12 bg-white border border-gray-400 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <span className="text-xs">Call Listing</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-300 rounded" title="Mini Map">
            <div className="w-12 h-12 bg-white border border-gray-400 rounded flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-xs">Mini Map</span>
          </button>
        </div>
      </div>
    </div>
  )
}
