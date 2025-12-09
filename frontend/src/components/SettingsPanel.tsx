import { useState } from 'react'

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 2000,
    theme: 'light',
    showNotifications: true
  })

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm">Auto Refresh</label>
          <input
            type="checkbox"
            checked={settings.autoRefresh}
            onChange={(e) => handleChange('autoRefresh', e.target.checked)}
            className="w-4 h-4"
          />
        </div>
        <div>
          <label className="text-sm block mb-1">Refresh Interval (ms)</label>
          <input
            type="number"
            value={settings.refreshInterval}
            onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded"
            min="1000"
            max="10000"
            step="1000"
          />
        </div>
        <div>
          <label className="text-sm block mb-1">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm">Show Notifications</label>
          <input
            type="checkbox"
            checked={settings.showNotifications}
            onChange={(e) => handleChange('showNotifications', e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      </div>
    </div>
  )
}
