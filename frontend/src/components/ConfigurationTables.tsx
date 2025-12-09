import { useState, useEffect } from 'react'

interface Props {
  sessionId: number | null
  type: 'MIB' | 'SIB1'
}

export default function ConfigurationTables({ sessionId, type }: Props) {
  const [timestamp, setTimestamp] = useState('08:57:02.913')

  return (
    <div className="h-full bg-gray-900 text-white overflow-auto">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {type === 'MIB' ? '5GNR Information (MIB)' : '5GNR SA Information (SIB1)'} | Mobile 1
        </div>
        <div className="text-sm text-gray-400">Time: {timestamp}</div>
      </div>

      {/* Configuration Table */}
      <div className="p-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-blue-900">
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>Time</th>
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>{timestamp}</th>
            </tr>
            <tr className="bg-blue-800">
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}></th>
              <th className="border border-gray-600 px-4 py-2 text-center">DL Config</th>
              <th className="border border-gray-600 px-4 py-2 text-center">UL Config</th>
              <th className="border border-gray-600 px-4 py-2 text-center">SDL Config</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700" colSpan={2}>Frequency Band</td>
              <td className="border border-gray-600 px-4 py-2 text-center">25</td>
              <td className="border border-gray-600 px-4 py-2 text-center">25</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700" colSpan={2}>SCS</td>
              <td className="border border-gray-600 px-4 py-2 text-center">15kHz</td>
              <td className="border border-gray-600 px-4 py-2 text-center">15kHz</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700" colSpan={2}>Bandwidth</td>
              <td className="border border-gray-600 px-4 py-2 text-center">20MHz(106)</td>
              <td className="border border-gray-600 px-4 py-2 text-center">20MHz(106)</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700" colSpan={2}>p-Max</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-</td>
              <td className="border border-gray-600 px-4 py-2 text-center">27</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-</td>
            </tr>

            {/* Serving Cell Config */}
            <tr className="bg-blue-800">
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>Serving Cell Config</th>
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>Cell Selection Info</th>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700" colSpan={2}>n-TimingAdvanceOffset</td>
              <td className="border border-gray-600 px-4 py-2 text-center">n39936</td>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700">q-RxLevMin</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-61 (-122 dBm)</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700" colSpan={2}>SSB-Periodicity</td>
              <td className="border border-gray-600 px-4 py-2 text-center">ms20</td>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700">q-RxLevMinOffset</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700" colSpan={2}>SSB-PositionInBurst</td>
              <td className="border border-gray-600 px-4 py-2 text-center">10000000</td>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700">q-RxLevMinSUL</td>
              <td className="border border-gray-600 px-4 py-2 text-center">-</td>
            </tr>

            {/* PLMN Identity List */}
            <tr className="bg-blue-800">
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={4}>PLMN Identity List</th>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700 text-center">MCC</td>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700 text-center">MNC</td>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700 text-center" colSpan={2}>Operator Use</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 text-center">310(USA)</td>
              <td className="border border-gray-600 px-4 py-2 text-center">260(T-Mobile)</td>
              <td className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>notReserved</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 bg-blue-700 text-center" colSpan={2}>PLMN ID</td>
              <td className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>-</td>
            </tr>
            <tr>
              <td className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>-</td>
              <td className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>-</td>
            </tr>

            {/* Tracking Area Code */}
            <tr className="bg-blue-800">
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>Tracking Area Code</th>
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>8180480</th>
            </tr>

            {/* Global Cell Identity */}
            <tr className="bg-blue-800">
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>Global Cell Identity (gNB / Cell ID)</th>
              <th className="border border-gray-600 px-4 py-2 text-center" colSpan={2}>6504808472 (397022 / 24)</th>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
