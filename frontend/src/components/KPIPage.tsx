'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Device {
  deviceId: string;
  deviceModel: string;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}

export default function KPIPage({ devices, selectedDevice, onSelectDevice }: Props) {
  const [kpiData, setKpiData] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [ueState, setUeState] = useState('5GNR');

  useEffect(() => {
    if (selectedDevice) {
      fetchKPIData();
      const interval = setInterval(fetchKPIData, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  const fetchKPIData = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/enhanced-clustering/kpi-summary');
      const data = await res.json();
      setKpiData(data);
      
      setTimeSeriesData(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          rsrp: data.rsrp?.average || -100,
          rsrq: data.rsrq?.average || -10,
          sinr: data.sinr?.average || 10,
          dlTp: Math.random() * 100,
          ulTp: Math.random() * 50
        };
        return [...prev.slice(-19), newPoint];
      });
    } catch (error) {
      console.error('KPI fetch failed');
    }
  };

  const qualityDistribution = kpiData ? [
    { name: 'Excellent', value: kpiData.rsrp?.qualityDistribution?.excellent || 0 },
    { name: 'Good', value: kpiData.rsrp?.qualityDistribution?.good || 0 },
    { name: 'Fair', value: kpiData.rsrp?.qualityDistribution?.fair || 0 },
    { name: 'Poor', value: kpiData.rsrp?.qualityDistribution?.poor || 0 },
  ] : [];

  return (
    <div className="flex h-full bg-black">
      {/* Left Panel - UE State & Throughput */}
      <div className="w-80 border-r border-gray-800 bg-gray-950 p-4 space-y-4">
        <div className="bg-black rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-500 mb-2">UE State</div>
          <div className="text-2xl font-bold text-green-400">{ueState}</div>
        </div>

        <div className="bg-black rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-500 mb-3">Current Throughput</div>
          
          <div className="mb-4">
            <div className="text-xs text-yellow-400 mb-2">Total</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-600">DL</div>
                <div className="text-2xl font-bold">{timeSeriesData[timeSeriesData.length - 1]?.dlTp.toFixed(0) || 0}</div>
                <div className="text-gray-600">Mbps</div>
              </div>
              <div>
                <div className="text-gray-600">UL</div>
                <div className="text-2xl font-bold">{timeSeriesData[timeSeriesData.length - 1]?.ulTp.toFixed(0) || 0}</div>
                <div className="text-gray-600">Mbps</div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-green-400 mb-2 flex items-center gap-2">
              <span>📶</span> LTE
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-600">DL</div>
                <div className="text-xl font-bold">0</div>
                <div className="text-gray-600">Mbps</div>
              </div>
              <div>
                <div className="text-gray-600">UL</div>
                <div className="text-xl font-bold">0</div>
                <div className="text-gray-600">Mbps</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-red-400 mb-2 flex items-center gap-2">
              <span><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span> 5GNR
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-600">DL</div>
                <div className="text-xl font-bold">0</div>
                <div className="text-gray-600">Mbps</div>
              </div>
              <div>
                <div className="text-gray-600">UL</div>
                <div className="text-xl font-bold">0</div>
                <div className="text-gray-600">Mbps</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Device Selection */}
        <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
          <div className="text-xs font-semibold text-gray-400 tracking-wider mb-3">RF MEASUREMENT SUMMARY</div>
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
            <div className="text-sm text-gray-500">Select a device to view KPIs</div>
          </div>
        ) : !kpiData ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs text-gray-600">Loading KPI data...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* RF Measurement Table */}
            <div className="p-6">
              <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-900 border-b border-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">RF Measurement</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">PCell</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">SCell1</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">SCell2</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">SCell3</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">SCell4</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">SCell5</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">SCell6</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-400">SCell7</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">Serving PCI</td>
                        <td className="px-4 py-3 text-orange-400">82</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">EARFCN</td>
                        <td className="px-4 py-3 text-gray-300">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">Band</td>
                        <td className="px-4 py-3 text-gray-300">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900 bg-gray-900/30">
                        <td className="px-4 py-3 text-green-400 flex items-center gap-2">
                          <span>📶</span> LTE
                        </td>
                        <td colSpan={8}></td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">RSRP(dBm)</td>
                        <td className="px-4 py-3 text-gray-300">{kpiData.rsrp?.average?.toFixed(1) || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">RSRQ(dB)</td>
                        <td className="px-4 py-3 text-gray-300">{kpiData.rsrq?.average?.toFixed(1) || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">SINR(dB)</td>
                        <td className="px-4 py-3 text-gray-300">{kpiData.sinr?.average?.toFixed(1) || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">DL TP(Mbps)</td>
                        <td className="px-4 py-3 text-gray-300">{timeSeriesData[timeSeriesData.length - 1]?.dlTp.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">UL TP(Mbps)</td>
                        <td className="px-4 py-3 text-gray-300">{timeSeriesData[timeSeriesData.length - 1]?.ulTp.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">Serving Tx Beam ID</td>
                        <td className="px-4 py-3 text-orange-400">0</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">NR-ARFCN(Band)</td>
                        <td className="px-4 py-3 text-orange-400">396970(25)</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">Duplex Mode</td>
                        <td className="px-4 py-3 text-orange-400">FDD</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900 bg-gray-900/30">
                        <td className="px-4 py-3 text-red-400 flex items-center gap-2">
                          <span><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span> 5GNR
                        </td>
                        <td colSpan={8}></td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">SCS(kHz)</td>
                        <td className="px-4 py-3 text-gray-300">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">SS-RSRP(dBm)</td>
                        <td className="px-4 py-3 text-orange-400">-103.79</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">SS-RSRQ(dB)</td>
                        <td className="px-4 py-3 text-orange-400">-11.84</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">SINR(dB)</td>
                        <td className="px-4 py-3 text-orange-400">4.25</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">DL TP(Mbps)</td>
                        <td className="px-4 py-3 text-orange-400">0.00</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                      <tr className="border-b border-gray-900">
                        <td className="px-4 py-3 text-gray-400">UL TP(Mbps)</td>
                        <td className="px-4 py-3 text-gray-300">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                        <td className="px-4 py-3 text-gray-600">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
