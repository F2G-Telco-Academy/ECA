'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [visibleMetrics, setVisibleMetrics] = useState<{ [k: string]: boolean }>({
    rsrp: true,
    rsrq: true,
    sinr: true,
    throughput: true
  });

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

  const toggleMetric = (key: string) => {
    setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cardClass = "bg-white rounded-xl p-5 border border-gray-200 shadow-sm";
  const headerClass = "text-xs font-semibold text-gray-500 tracking-wider";

  return (
    <div className="flex flex-col h-full bg-slate-50 text-gray-800">
      {/* Device Selection */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white shadow-sm">
        <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">Device selection</div>
        <div className="flex items-center gap-2 flex-wrap">
          {devices.length === 0 ? (
            <div className="text-xs text-gray-500 px-4 py-2 bg-gray-100 rounded-full">No devices connected</div>
          ) : (
            devices.map((device, idx) => (
              <button
                key={device.deviceId}
                onClick={() => onSelectDevice(device.deviceId)}
                className={`px-4 py-2 text-xs font-semibold border rounded-full transition-all ${
                  selectedDevice === device.deviceId
                    ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {device.deviceModel || `Mobile ${idx + 1}`}
              </button>
            ))
          )}
        </div>
      </div>

      {!selectedDevice ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 rounded" />
          </div>
          <div className="text-sm text-gray-500">Select a device to visualize data</div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Toggles */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Metrics</div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'rsrp', label: 'RSRP' },
                { key: 'rsrq', label: 'RSRQ' },
                { key: 'sinr', label: 'SINR' },
                { key: 'throughput', label: 'Throughput' }
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => toggleMetric(m.key)}
                  className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                    visibleMetrics[m.key]
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleMetrics.rsrp && (
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <div className={headerClass}>RSRP (dBm)</div>
                  <div className="text-xs text-gray-500">Reference Signal Received Power</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[-120, -40]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#6b7280' }}
                    />
                    <Line type="monotone" dataKey="rsrp" stroke="#f97316" strokeWidth={2} dot={false} name="RSRP" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {visibleMetrics.rsrq && (
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <div className={headerClass}>RSRQ (dB)</div>
                  <div className="text-xs text-gray-500">Reference Signal Received Quality</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[-20, 0]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#6b7280' }}
                    />
                    <Line type="monotone" dataKey="rsrq" stroke="#fbbf24" strokeWidth={2} dot={false} name="RSRQ" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {visibleMetrics.sinr && (
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <div className={headerClass}>SINR (dB)</div>
                  <div className="text-xs text-gray-500">Signal to Interference plus Noise Ratio</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[-10, 30]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#6b7280' }}
                    />
                    <Line type="monotone" dataKey="sinr" stroke="#84cc16" strokeWidth={2} dot={false} name="SINR" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {visibleMetrics.throughput && (
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <div className={headerClass}>Throughput (Mbps)</div>
                  <div className="text-xs text-gray-500">Data Transfer Rate</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#6b7280' }}
                    />
                    <Line type="monotone" dataKey="throughput" stroke="#3b82f6" strokeWidth={2} dot={false} name="Throughput" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
