'use client';

import { useState, useEffect } from 'react';

interface Device {
  deviceId: string;
  deviceModel: string;
}

interface LogMessage {
  id: number;
  timestamp: string;
  protocol: string;
  direction: string;
  messageType: string;
  channel: string;
  length: number;
  info: string;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}

export default function LogMessagesPage({ devices, selectedDevice, onSelectDevice }: Props) {
  const [activeTab, setActiveTab] = useState<'rrc' | 'nas' | 'mac' | 'rlc'>('rrc');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [filter, setFilter] = useState<'all' | 'uplink' | 'downlink'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedDevice) {
      // Simulate log data
      const mockLogs: LogMessage[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        protocol: activeTab.toUpperCase(),
        direction: Math.random() > 0.5 ? 'UL' : 'DL',
        messageType: getMessageType(activeTab),
        channel: getChannel(activeTab),
        length: Math.floor(Math.random() * 500) + 50,
        info: 'Additional info...'
      }));
      setLogs(mockLogs);
    }
  }, [selectedDevice, activeTab]);

  const getMessageType = (protocol: string) => {
    const types = {
      rrc: ['MeasurementReport', 'RRCConnectionSetup', 'RRCConnectionReconfiguration', 'SecurityModeCommand'],
      nas: ['AttachRequest', 'AttachAccept', 'TAU Request', 'ServiceRequest'],
      mac: ['UL_GRANT', 'DL_GRANT', 'BSR', 'PHR'],
      rlc: ['AMD PDU', 'UMD PDU', 'STATUS PDU', 'DATA PDU']
    };
    return types[protocol as keyof typeof types][Math.floor(Math.random() * 4)];
  };

  const getChannel = (protocol: string) => {
    const channels = {
      rrc: ['DCCH', 'BCCH', 'PCCH', 'CCCH'],
      nas: ['EMM', 'ESM', 'SMS', 'SS'],
      mac: ['PUSCH', 'PDSCH', 'PUCCH', 'PDCCH'],
      rlc: ['AM', 'UM', 'TM', 'UM-Bidir']
    };
    return channels[protocol as keyof typeof channels][Math.floor(Math.random() * 4)];
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.direction === (filter === 'uplink' ? 'UL' : 'DL');
    const matchesSearch = log.messageType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: logs.length,
    uplink: logs.filter(l => l.direction === 'UL').length,
    downlink: logs.filter(l => l.direction === 'DL').length,
  };

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
          <div className="text-sm text-gray-500">Select a device to view logs</div>
        </div>
      ) : (
        <>
          {/* Protocol Tabs */}
          <div className="border-b border-gray-800 px-6 bg-gray-950">
            <div className="flex gap-1">
              {(['rrc', 'nas', 'mac', 'rlc'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === tab
                      ? 'border-white text-white bg-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.toUpperCase()} Messages
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-800">
                <div className="text-xs text-gray-500 mb-1">Total</div>
                <div className="text-xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-800">
                <div className="text-xs text-gray-500 mb-1">Uplink</div>
                <div className="text-xl font-bold text-green-400">{stats.uplink}</div>
              </div>
              <div className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-800">
                <div className="text-xs text-gray-500 mb-1">Downlink</div>
                <div className="text-xl font-bold text-yellow-400">{stats.downlink}</div>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="border-b border-gray-800 px-6 py-3 bg-gray-950 flex items-center justify-between">
            <div className="flex gap-1 bg-gray-900 rounded p-1">
              {(['all', 'uplink', 'downlink'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    filter === f ? 'bg-gray-700 text-white' : 'text-gray-500'
                  }`}
                >
                  {f === 'all' ? 'ALL' : f === 'uplink' ? 'UL' : 'DL'}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-gray-500"
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-950 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400">Protocol</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400">Direction</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400">Channel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400">Message Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400">Length</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-400">Info</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-900 hover:bg-gray-950">
                    <td className="px-4 py-3 text-gray-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-blue-400 font-medium">{log.protocol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.direction === 'UL' 
                          ? 'bg-green-900/30 text-green-400' 
                          : 'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-purple-400">{log.channel}</td>
                    <td className="px-4 py-3 text-gray-300">{log.messageType}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{log.length} B</td>
                    <td className="px-4 py-3 text-gray-600">{log.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
