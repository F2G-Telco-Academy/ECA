import { useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'

export default function SettingsPage(){
  const [apiUrl, setApiUrl] = useState('http://localhost:8080')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(3000)

  const handleSave = () => {
    localStorage.setItem('eca_api_url', apiUrl)
    localStorage.setItem('eca_auto_refresh', String(autoRefresh))
    localStorage.setItem('eca_refresh_interval', String(refreshInterval))
    alert('Settings saved successfully!')
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6 max-w-2xl">
        <div className="text-2xl font-bold mb-6">Settings</div>
        
        <div className="space-y-6">
          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-4">Backend Configuration</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">API URL</label>
                <input 
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-4">Display Settings</div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-sm">Auto-refresh data</label>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Refresh Interval (ms)</label>
                <input 
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )
}
