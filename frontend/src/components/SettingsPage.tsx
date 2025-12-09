'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    autoCapture: true,
    captureInterval: 1000,
    maxLogSize: 10000,
    exportFormat: 'csv',
    theme: 'dark',
    notifications: true,
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
        <div className="text-xs font-semibold text-gray-400 tracking-wider">SETTINGS</div>
        <div className="text-xs text-gray-600 mt-1">Configure application preferences</div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Capture Settings */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="text-sm font-semibold text-gray-400 mb-4">CAPTURE SETTINGS</div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium mb-1">Auto-start Capture</div>
                  <div className="text-xs text-gray-600">Start capturing when device connects</div>
                </div>
                <button
                  onClick={() => updateSetting('autoCapture', !settings.autoCapture)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.autoCapture ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.autoCapture ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div>
                <div className="text-xs font-medium mb-2">Capture Interval (ms)</div>
                <input
                  type="number"
                  value={settings.captureInterval}
                  onChange={(e) => updateSetting('captureInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <div className="text-xs font-medium mb-2">Max Log Size (messages)</div>
                <input
                  type="number"
                  value={settings.maxLogSize}
                  onChange={(e) => updateSetting('maxLogSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Export Settings */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="text-sm font-semibold text-gray-400 mb-4">EXPORT SETTINGS</div>
            
            <div>
              <div className="text-xs font-medium mb-2">Default Export Format</div>
              <select
                value={settings.exportFormat}
                onChange={(e) => updateSetting('exportFormat', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-gray-500"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="pcap">PCAP</option>
                <option value="pdf">PDF Report</option>
              </select>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="text-sm font-semibold text-gray-400 mb-4">APPEARANCE</div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium mb-2">Theme</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    className={`px-4 py-2 text-xs font-medium border rounded transition-all ${
                      settings.theme === 'dark'
                        ? 'bg-white text-black border-white'
                        : 'bg-gray-900 text-gray-400 border-gray-700'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    className={`px-4 py-2 text-xs font-medium border rounded transition-all ${
                      settings.theme === 'light'
                        ? 'bg-white text-black border-white'
                        : 'bg-gray-900 text-gray-400 border-gray-700'
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium mb-1">Notifications</div>
                  <div className="text-xs text-gray-600">Show system notifications</div>
                </div>
                <button
                  onClick={() => updateSetting('notifications', !settings.notifications)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.notifications ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifications ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="text-sm font-semibold text-gray-400 mb-4">ABOUT</div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="text-gray-400">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Backend:</span>
                <span className="text-green-400">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API:</span>
                <span className="text-gray-400">http://localhost:8080</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 rounded transition-all">
              Save Settings
            </button>
            <button className="px-4 py-2.5 text-xs font-medium border border-gray-700 hover:bg-gray-900 rounded transition-all">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
