import { useState } from 'react';

interface Device {
  deviceId: string;
  deviceModel: string;
  connected: boolean;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}

export default function DeviceManager({ devices, selectedDevice, onSelectDevice }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rfkpi: true,
    qualcomm: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="w-64 border-r border-gray-800 bg-black flex flex-col text-xs">
      {/* Mobile Section */}
      <div className="border-b border-gray-800">
        <div className="px-5 py-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-wider mb-3">DEVICE MANAGER</h2>
          <div className="text-xs text-gray-600 mb-3">{devices.length} Connected</div>
        </div>
        
        {devices.length === 0 ? (
          <div className="px-5 pb-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-700 rounded" />
            </div>
            <div className="text-xs text-gray-600">No devices connected</div>
          </div>
        ) : (
          <div className="px-3 pb-3 space-y-2">
            {devices.map((device, idx) => (
              <button
                key={device.deviceId}
                onClick={() => onSelectDevice(device.deviceId)}
                className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
                  selectedDevice === device.deviceId 
                    ? 'bg-gray-900 border-gray-700 shadow-lg' 
                    : 'bg-gray-950 border-gray-800 hover:bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                    <span className="text-xs font-semibold">Mobile {idx + 1}</span>
                  </div>
                  {selectedDevice === device.deviceId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate mb-1">{device.deviceId}</div>
                <div className="text-xs text-gray-600">{device.deviceModel}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Supported KPIs */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-3 bg-gray-950 font-semibold text-gray-400 border-b border-gray-800">
          Supported KPIs
        </div>
        
        {/* Message */}
        <div className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-950 cursor-pointer text-gray-400 border-b border-gray-900">
          <div className="w-4 h-4 border border-gray-600 rounded-sm" />
          <span>Messages</span>
        </div>

        {/* Layer3 KPI */}
        <div className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-950 cursor-pointer text-gray-400 border-b border-gray-900">
          <div className="w-4 h-4 border border-gray-600 rounded-sm" />
          <span>Layer 3 KPI</span>
        </div>

        {/* RF KPI */}
        <div className={expandedSections.rfkpi ? 'border-l-2 border-blue-500 bg-gray-950/50' : 'border-b border-gray-900'}>
          <div 
            className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-950 cursor-pointer text-gray-300"
            onClick={() => toggleSection('rfkpi')}
          >
            <span className="text-xs">{expandedSections.rfkpi ? '▼' : '▶'}</span>
            <div className="w-4 h-4 border border-gray-600 rounded-sm" />
            <span>RF KPI</span>
          </div>
          {expandedSections.rfkpi && (
            <div className="bg-gray-950/30 text-gray-500 border-b border-gray-900">
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">
                RF Measurement Summary
              </div>
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">
                5GNR Beamforming Info
              </div>
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">
                Benchmarking RF Summary
              </div>
            </div>
          )}
        </div>

        {/* Qualcomm */}
        <div className="border-b border-gray-900">
          <div 
            className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-950 cursor-pointer text-gray-400"
            onClick={() => toggleSection('qualcomm')}
          >
            <span className="text-xs">{expandedSections.qualcomm ? '▼' : '▶'}</span>
            <div className="w-4 h-4 border border-gray-600 rounded-sm" />
            <span>Qualcomm</span>
          </div>
          {expandedSections.qualcomm && (
            <div className="bg-gray-950/30 text-gray-500">
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">Messages</div>
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">Common-Q</div>
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">5GNR-Q</div>
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">LTE/eANR-Q</div>
              <div className="px-8 py-2 hover:bg-gray-900 hover:text-gray-300 cursor-pointer text-xs">WCDMA</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 px-5 py-3 bg-gray-950">
        <div className="text-xs text-gray-600">Auto-sync enabled</div>
      </div>
    </div>
  );
}
