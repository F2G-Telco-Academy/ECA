import { useState, useEffect } from 'react'

interface RFMeasurementSummaryProps {
  deviceId: string | null
}

export default function RFMeasurementSummary({ deviceId }: RFMeasurementSummaryProps) {
  const [kpiData, setKpiData] = useState<any>(null)

  useEffect(() => {
    if (!deviceId) return
    
    const fetchKpis = () => {
      fetch(`/api/kpis/session/${deviceId}`)
        .then(res => res.json())
        .then(data => setKpiData(data))
        .catch(console.error)
    }

    fetchKpis()
    const interval = setInterval(fetchKpis, 2000)
    return () => clearInterval(interval)
  }, [deviceId])

  if (!deviceId) {
    return <div className="p-4 text-center text-gray-400">Select a device to view measurements</div>
  }

  return (
    <div className="p-4 bg-black text-white">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-2xl font-bold">📡 RF Measurement Summary</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 p-4 rounded">
          <div className="text-sm text-gray-400">UE State</div>
          <div className="text-xl font-bold text-yellow-400">5GNR</div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded">
          <div className="text-sm text-gray-400">Current Throughput</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div className="text-xs text-gray-400">DL</div>
              <div className="text-2xl font-bold text-green-400">
                {kpiData?.throughput?.dl || 0} <span className="text-sm">Mbps</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">UL</div>
              <div className="text-2xl font-bold text-blue-400">
                {kpiData?.throughput?.ul || 0} <span className="text-sm">Mbps</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded">
          <div className="text-sm text-gray-400">Battery Temperature</div>
          <div className="text-xl font-bold">{kpiData?.battery?.temp || '--'}°C</div>
        </div>
      </div>

      <div className="bg-gray-900 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-900">
            <tr>
              <th className="p-2 text-left">RF Measurement</th>
              <th className="p-2">PCell</th>
              <th className="p-2">SCell1</th>
              <th className="p-2">SCell2</th>
              <th className="p-2">SCell3</th>
              <th className="p-2">SCell4</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-700">
              <td className="p-2 text-green-400">LTE</td>
              <td colSpan={5}></td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">Serving PCI</td>
              <td className="p-2 text-center">{kpiData?.lte?.pci || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">EARFCN</td>
              <td className="p-2 text-center">{kpiData?.lte?.earfcn || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">Band</td>
              <td className="p-2 text-center">{kpiData?.lte?.band || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">RSRP(dBm)</td>
              <td className="p-2 text-center text-yellow-400">{kpiData?.lte?.rsrp || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">RSRQ(dB)</td>
              <td className="p-2 text-center text-yellow-400">{kpiData?.lte?.rsrq || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">SINR(dB)</td>
              <td className="p-2 text-center text-yellow-400">{kpiData?.lte?.sinr || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">DL TP(Mbps)</td>
              <td className="p-2 text-center text-red-400">{kpiData?.lte?.dlTp || '0.00'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">UL TP(Mbps)</td>
              <td className="p-2 text-center text-red-400">{kpiData?.lte?.ulTp || '0.00'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            
            <tr className="border-t border-gray-700">
              <td className="p-2 text-red-400">5GNR</td>
              <td colSpan={5}></td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">Serving PCI</td>
              <td className="p-2 text-center">{kpiData?.nr?.pci || '82'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">NR-ARFCN(Band)</td>
              <td className="p-2 text-center text-red-400">{kpiData?.nr?.arfcn || '396970(25)'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">SS-RSRP(dBm)</td>
              <td className="p-2 text-center text-red-400">{kpiData?.nr?.ssRsrp || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">SS-RSRQ(dB)</td>
              <td className="p-2 text-center text-red-400">{kpiData?.nr?.ssRsrq || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="p-2 pl-6">SINR(dB)</td>
              <td className="p-2 text-center text-red-400">{kpiData?.nr?.sinr || '--'}</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
              <td className="p-2 text-center">--</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
