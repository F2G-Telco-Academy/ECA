import { useEffect, useState } from 'react'

export default function DetailedConfigTables({ sessionId }: { sessionId: string | null }) {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return
    fetch(`http://localhost:8080/api/sessions/${sessionId}/config`)
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error)
  }, [sessionId])

  if (!sessionId) return <div className="p-4 text-center text-gray-400">Select a session</div>

  return (
    <div className="h-full bg-white text-black overflow-auto p-4">
      <div className="mb-4 flex items-center justify-between border-b pb-2">
        <h3 className="font-bold">5GNR Information (SIB1) | Mobile 1</h3>
        <div className="text-sm text-gray-600">Time: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* DL/UL/SUL Config Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-blue-900 text-white">
            <th className="border border-gray-400 px-4 py-2">Time</th>
            <th className="border border-gray-400 px-4 py-2">DL Config</th>
            <th className="border border-gray-400 px-4 py-2">UL Config</th>
            <th className="border border-gray-400 px-4 py-2">SUL Config</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 px-4 py-2 bg-blue-100" rowSpan={4}>08:57:02.913</td>
            <td className="border border-gray-400 px-4 py-2 font-semibold">Frequency Band</td>
            <td className="border border-gray-400 px-4 py-2">25</td>
            <td className="border border-gray-400 px-4 py-2">25</td>
            <td className="border border-gray-400 px-4 py-2">-</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-4 py-2 font-semibold">SCS</td>
            <td className="border border-gray-400 px-4 py-2">15kHz</td>
            <td className="border border-gray-400 px-4 py-2">15kHz</td>
            <td className="border border-gray-400 px-4 py-2">-</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-4 py-2 font-semibold">Bandwidth</td>
            <td className="border border-gray-400 px-4 py-2">20MHz(106)</td>
            <td className="border border-gray-400 px-4 py-2">20MHz(106)</td>
            <td className="border border-gray-400 px-4 py-2">-</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-4 py-2 font-semibold">p-Max</td>
            <td className="border border-gray-400 px-4 py-2">-</td>
            <td className="border border-gray-400 px-4 py-2">27</td>
            <td className="border border-gray-400 px-4 py-2">-</td>
          </tr>
        </tbody>
      </table>

      {/* Serving Cell Config */}
      <div className="mb-6">
        <h4 className="bg-blue-900 text-white px-4 py-2 font-semibold">Serving Cell Config</h4>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2 bg-blue-100 font-semibold w-1/3">n-TimingAdvanceOffset</td>
              <td className="border border-gray-400 px-4 py-2">n39936</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2 bg-blue-100 font-semibold">SSB-Periodicity</td>
              <td className="border border-gray-400 px-4 py-2">ms20</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2 bg-blue-100 font-semibold">SSB-PositionInBurst</td>
              <td className="border border-gray-400 px-4 py-2">10000000</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cell Selection Info */}
      <div className="mb-6">
        <h4 className="bg-blue-900 text-white px-4 py-2 font-semibold">Cell Selection Info</h4>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-100">
              <th className="border border-gray-400 px-4 py-2">q-RxLevMin</th>
              <th className="border border-gray-400 px-4 py-2">q-RxLevMinOffset</th>
              <th className="border border-gray-400 px-4 py-2">q-RxLevMinSUL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2 text-center">-61 (-122 dBm)</td>
              <td className="border border-gray-400 px-4 py-2 text-center">-</td>
              <td className="border border-gray-400 px-4 py-2 text-center">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PLMN Identity List */}
      <div className="mb-6">
        <h4 className="bg-blue-900 text-white px-4 py-2 font-semibold">PLMN Identity List</h4>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-100">
              <th className="border border-gray-400 px-4 py-2">MCC</th>
              <th className="border border-gray-400 px-4 py-2">MNC</th>
              <th className="border border-gray-400 px-4 py-2">Operator Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2 text-center">310(USA)</td>
              <td className="border border-gray-400 px-4 py-2 text-center">260(T-Mobile)</td>
              <td className="border border-gray-400 px-4 py-2 text-center">notReserved</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="border border-gray-400 p-2">
            <span className="font-semibold">PLMN ID:</span> -
          </div>
          <div className="border border-gray-400 p-2">
            <span className="font-semibold">Tracking Area Code:</span> 8180480
          </div>
        </div>
      </div>

      {/* Global Cell Identity */}
      <div className="border border-gray-400 p-4 bg-blue-50">
        <div className="font-semibold mb-2">Global Cell Identity (gNB / Cell ID)</div>
        <div className="text-lg">6504808472 (397022 / 24)</div>
      </div>
    </div>
  )
}
