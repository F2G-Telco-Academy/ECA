'use client';

import { useState, useEffect } from 'react';

interface Device {
  deviceId: string;
  deviceModel: string;
  connected: boolean;
  manufacturer?: string;
  androidVersion?: string;
  batteryLevel?: number;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/devices');
      const data = await res.json();
      setDevices(data);
    } catch (error) {
      console.error('Device fetch failed');
    }
  };

  const connectedDevices = devices.filter(d => d.connected);
  const disconnectedDevices = devices.filter(d => !d.connected);

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
        <div className="text-xs font-semibold text-gray-400 tracking-wider">DEVICE MANAGEMENT</div>
        <div className="text-xs text-gray-600 mt-1">
          {connectedDevices.length} connected • {disconnectedDevices.length} disconnected
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Connected Devices */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-gray-400 mb-4">CONNECTED DEVICES</div>
          
          {connectedDevices.length === 0 ? (
            <div className="bg-gray-950 rounded-lg p-8 border border-gray-800 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-xl flex items-center justify-center">
                <span className="text-3xl"><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span>
              </div>
              <div className="text-sm text-gray-500 mb-2">No devices connected</div>
              <div className="text-xs text-gray-700">Connect devices via ADB</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {connectedDevices.map((device, idx) => (
                <div key={device.deviceId} className="bg-gray-950 rounded-lg p-5 border border-gray-800">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                        <span className="text-xl"><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-1">Mobile {idx + 1}</div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                          <span className="text-xs text-green-400">Connected</span>
                        </div>
                      </div>
                    </div>
                    
                    {device.batteryLevel && (
                      <div className="text-xs text-gray-500">
                        🔋 {device.batteryLevel}%
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Device ID:</span>
                      <span className="text-gray-400 font-mono">{device.deviceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Model:</span>
                      <span className="text-gray-400">{device.deviceModel}</span>
                    </div>
                    {device.manufacturer && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Manufacturer:</span>
                        <span className="text-gray-400">{device.manufacturer}</span>
                      </div>
                    )}
                    {device.androidVersion && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Android:</span>
                        <span className="text-gray-400">{device.androidVersion}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-800 flex gap-2">
                    <button className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded transition-all">
                      View Logs
                    </button>
                    <button className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded transition-all">
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disconnected Devices */}
        {disconnectedDevices.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-400 mb-4">RECENTLY DISCONNECTED</div>
            <div className="space-y-2">
              {disconnectedDevices.map(device => (
                <div key={device.deviceId} className="bg-gray-950 rounded-lg p-4 border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center opacity-50">
                      <span className="text-lg"><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{device.deviceModel}</div>
                      <div className="text-xs text-gray-700">{device.deviceId}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-red-400">Disconnected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
