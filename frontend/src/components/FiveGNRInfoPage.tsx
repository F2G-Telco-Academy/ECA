'use client';

interface Device {
  deviceId: string;
  deviceModel: string;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}

export default function FiveGNRInfoPage({ devices, selectedDevice, onSelectDevice }: Props) {
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Device Selection */}
      <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
        <div className="text-xs font-semibold text-gray-400 tracking-wider mb-3">5GNR INFORMATION</div>
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
          <div className="text-sm text-gray-500">Select a device to view 5GNR information</div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {/* Header with Time */}
          <div className="mb-4 text-right">
            <div className="text-sm text-gray-400">Time: <span className="text-white">08:57:02.913</span></div>
          </div>

          {/* DL/UL Config Table */}
          <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden mb-6">
            <table className="w-full text-xs">
              <thead className="bg-blue-900/30 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-blue-300" colSpan={2}>DL Config</th>
                  <th className="px-4 py-3 text-left font-semibold text-blue-300" colSpan={2}>UL Config</th>
                  <th className="px-4 py-3 text-left font-semibold text-blue-300">SUL Config</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-900">
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">Frequency Band</td>
                  <td className="px-4 py-3 text-gray-300">25</td>
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">Frequency Band</td>
                  <td className="px-4 py-3 text-gray-300">25</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                </tr>
                <tr className="border-b border-gray-900">
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">SCS</td>
                  <td className="px-4 py-3 text-gray-300">15kHz</td>
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">SCS</td>
                  <td className="px-4 py-3 text-gray-300">15kHz</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                </tr>
                <tr className="border-b border-gray-900">
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">Bandwidth</td>
                  <td className="px-4 py-3 text-gray-300">20MHz(106)</td>
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">Bandwidth</td>
                  <td className="px-4 py-3 text-gray-300">20MHz(106)</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                </tr>
                <tr className="border-b border-gray-900">
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">p-Max</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                  <td className="px-4 py-3 text-blue-300 bg-blue-900/20">p-Max</td>
                  <td className="px-4 py-3 text-gray-300">27</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Serving Cell Config & Cell Selection Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden">
              <div className="bg-blue-900/30 px-4 py-3 border-b border-gray-800">
                <div className="text-xs font-semibold text-blue-300">Serving Cell Config</div>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-900">
                    <td className="px-4 py-3 text-blue-300 bg-blue-900/20">n-TimingAdvanceOffset</td>
                    <td className="px-4 py-3 text-gray-300">n39936</td>
                  </tr>
                  <tr className="border-b border-gray-900">
                    <td className="px-4 py-3 text-blue-300 bg-blue-900/20">SSB-Periodicity</td>
                    <td className="px-4 py-3 text-gray-300">ms20</td>
                  </tr>
                  <tr className="border-b border-gray-900">
                    <td className="px-4 py-3 text-blue-300 bg-blue-900/20">SSB-PositionInBurst</td>
                    <td className="px-4 py-3 text-gray-300">10000000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden">
              <div className="bg-blue-900/30 px-4 py-3 border-b border-gray-800">
                <div className="text-xs font-semibold text-blue-300">Cell Selection Info</div>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-gray-900">
                    <td className="px-4 py-3 text-blue-300 bg-blue-900/20">q-RxLevMin</td>
                    <td className="px-4 py-3 text-gray-300">-61 (-122 dBm)</td>
                  </tr>
                  <tr className="border-b border-gray-900">
                    <td className="px-4 py-3 text-blue-300 bg-blue-900/20">q-RxLevMinOffset</td>
                    <td className="px-4 py-3 text-gray-600">-</td>
                  </tr>
                  <tr className="border-b border-gray-900">
                    <td className="px-4 py-3 text-blue-300 bg-blue-900/20">q-RxLevMinSUL</td>
                    <td className="px-4 py-3 text-gray-600">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PLMN Identity List */}
          <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden mb-6">
            <div className="bg-blue-900/30 px-4 py-3 border-b border-gray-800">
              <div className="text-xs font-semibold text-blue-300">PLMN Identity List</div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-blue-300">MCC</th>
                  <th className="px-4 py-3 text-left font-semibold text-blue-300">MNC</th>
                  <th className="px-4 py-3 text-left font-semibold text-blue-300">Operator Use</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-900">
                  <td className="px-4 py-3 text-gray-300">310(USA)</td>
                  <td className="px-4 py-3 text-gray-300">260(T-Mobile)</td>
                  <td className="px-4 py-3 text-gray-300">notReserved</td>
                </tr>
                <tr className="border-b border-gray-900">
                  <td className="px-4 py-3 text-gray-600">-</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-950 rounded-lg border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-2">Tracking Area Code</div>
              <div className="text-2xl font-bold text-gray-300">8180480</div>
            </div>

            <div className="bg-gray-950 rounded-lg border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-2">Global Cell Identity (gNB / Cell ID)</div>
              <div className="text-2xl font-bold text-gray-300">6504808472 (397022 / 24)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
