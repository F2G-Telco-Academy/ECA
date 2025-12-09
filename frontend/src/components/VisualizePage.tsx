'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Device {
  deviceId: string;
  deviceModel: string;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}

export default function VisualizePage({ devices, selectedDevice, onSelectDevice }: Props) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (selectedDevice) {
      const interval = setInterval(() => {
        setData(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            rsrp: -70 - Math.random() * 30,
            rsrq: -8 - Math.random() * 8,
            sinr: 5 + Math.random() * 20,
            throughput: Math.random() * 100
          };
          return [...prev.slice(-29), newPoint];
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Device Selection */}
      <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
        <div className="text-xs font-semibold text-gray-400 tracking-wider mb-3">DEVICE SELECTION</div>
        <div className="flex items-center gap-2">
          {devices.length === 0 ? (
            <div className="text-xs text-gray-600 px-4 py-2 bg-gray-900 rounded">No devices connected</div>
          ) : (
            devices.map((device, idx) => (
              <button
                key={device.deviceId}
                onClick={() => onSelectDevice(device.deviceId)}
                className={`px-4 py-2 text-xs font-medium border rounded transition-all ${
                  selectedDevice === device.deviceId
                    ? 'bg-white text-black border-white shadow-lg'
                    : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'
                }`}
              >
                Mobile {idx + 1}
              </button>
            ))
          )}
        </div>
      </div>

      {!selectedDevice ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 mb-4 bg-gray-900 rounded-xl flex items-center justify-center">
            <span className="text-3xl"><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span>
          </div>
          <div className="text-sm text-gray-500">Select a device to visualize data</div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* RSRP Chart */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-gray-400 tracking-wider">RSRP (dBm)</div>
              <div className="text-xs text-gray-600">Reference Signal Received Power</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis 
                  dataKey="time" 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                  domain={[-120, -40]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #374151', 
                    borderRadius: 6,
                    fontSize: 11
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rsrp" 
                  stroke="#fb923c" 
                  strokeWidth={2} 
                  dot={false}
                  name="RSRP"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* RSRQ Chart */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-gray-400 tracking-wider">RSRQ (dB)</div>
              <div className="text-xs text-gray-600">Reference Signal Received Quality</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis 
                  dataKey="time" 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                  domain={[-20, 0]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #374151', 
                    borderRadius: 6,
                    fontSize: 11
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rsrq" 
                  stroke="#fbbf24" 
                  strokeWidth={2} 
                  dot={false}
                  name="RSRQ"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SINR Chart */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-gray-400 tracking-wider">SINR (dB)</div>
              <div className="text-xs text-gray-600">Signal to Interference plus Noise Ratio</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis 
                  dataKey="time" 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                  domain={[-10, 30]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #374151', 
                    borderRadius: 6,
                    fontSize: 11
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sinr" 
                  stroke="#a3e635" 
                  strokeWidth={2} 
                  dot={false}
                  name="SINR"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Throughput Chart */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-gray-400 tracking-wider">THROUGHPUT (Mbps)</div>
              <div className="text-xs text-gray-600">Data Transfer Rate</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis 
                  dataKey="time" 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#4b5563" 
                  style={{ fontSize: 10 }}
                  tick={{ fill: '#6b7280' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #374151', 
                    borderRadius: 6,
                    fontSize: 11
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="throughput" 
                  stroke="#60a5fa" 
                  strokeWidth={2} 
                  dot={false}
                  name="Throughput"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
