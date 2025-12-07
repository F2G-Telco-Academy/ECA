import { useState, useEffect } from 'react'

interface RFData {
  ueState: string
  currentThroughput: { dl: number; ul: number }
  lte: {
    dl: { peak: number; avg: number }
    ul: { peak: number; avg: number }
  }
  nr: {
    dl: { peak: number; avg: number }
    ul: { peak: number; avg: number }
  }
  servingPCI: number
  earfcn: string
  band: number
  rsrp: number
  rsrq: number
  sinr: number
  dlThroughput: number
  ulThroughput: number
  servingTxBeamId: number
  nrArfcn: string
  duplexMode: string
  scs: string
  ssRsrp: number
  ssRsrq: number
  cells: Array<{
    name: string
    pci: number
    rsrp: number
    rsrq: number
    sinr: number
  }>
}

interface ProfessionalRFSummaryProps {
  deviceId: string | null
}

export default function ProfessionalRFSummary({ deviceId }: ProfessionalRFSummaryProps) {
  const [rfData, setRfData] = useState<RFData | null>(null)
  const [batteryTemp, setBatteryTemp] = useState({ celsius: 32.38, fahrenheit: 90.14 })
  const [thermalStatus, setThermalStatus] = useState('NONE')

  useEffect(() => {
    if (!deviceId) return

    const fetchData = () => {
      fetch(`http://localhost:8080/api/kpis/session/${deviceId}/rf-summary`)
        .then(res => res.json())
        .then(data => setRfData(data))
        .catch(console.error)
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [deviceId])

  if (!deviceId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-black">
        Select a device to view RF Measurement Summary
      </div>
    )
  }

  if (!rfData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-black">
        Loading RF data...
      </div>
    )
  }

  return (
    <div className="h-full bg-black text-white p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xl">
            📡
          </div>
          <h2 className="text-xl font-bold">RF Measurement Summary</h2>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-400">Battery Temperature:</span>{' '}
            <span className="text-yellow-400">{batteryTemp.celsius.toFixed(2)} (°C)</span>{' '}
            <span className="text-yellow-400">{batteryTemp.fahrenheit.toFixed(2)} (°F)</span>
          </div>
          <div>
            <span className="text-gray-400">Thermal Status:</span>{' '}
            <span className="text-green-400">{thermalStatus}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel - Throughput Gauges */}
        <div className="col-span-3 space-y-4">
          {/* UE State */}
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">UE State</div>
            <div className="text-2xl font-bold text-green-400">{rfData.ueState}</div>
          </div>

          {/* Current Throughput */}
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Current Throughput</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Mbps</span>
              <span className="text-xs text-gray-400">Mbps</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-400 mb-1">DL</div>
                <div className="text-3xl font-bold text-green-400">
                  {rfData.currentThroughput.dl}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">UL</div>
                <div className="text-3xl font-bold text-blue-400">
                  {rfData.currentThroughput.ul}
                </div>
              </div>
            </div>
          </div>

          {/* LTE Section */}
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold">LTE</div>
              <div className="text-xs text-gray-400">📶</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-400 mb-1">DL</div>
                <div className="text-2xl font-bold text-green-400">
                  {rfData.lte.dl.avg}
                </div>
                <div className="text-gray-500 text-xs">Mbps</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Peak</span>
                    <span>{rfData.lte.dl.peak} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg</span>
                    <span>{rfData.lte.dl.avg} Mbps</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">UL</div>
                <div className="text-2xl font-bold text-blue-400">
                  {rfData.lte.ul.avg}
                </div>
                <div className="text-gray-500 text-xs">Mbps</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Peak</span>
                    <span>{rfData.lte.ul.peak} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg</span>
                    <span>{rfData.lte.ul.avg} Mbps</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5GNR Section */}
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold text-red-400">5GNR</div>
              <div className="text-xs text-gray-400">📡</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-400 mb-1">DL</div>
                <div className="text-2xl font-bold text-green-400">
                  {rfData.nr.dl.avg}
                </div>
                <div className="text-gray-500 text-xs">Mbps</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Peak</span>
                    <span>{rfData.nr.dl.peak} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg</span>
                    <span>{rfData.nr.dl.avg} Mbps</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">UL</div>
                <div className="text-2xl font-bold text-blue-400">
                  {rfData.nr.ul.avg}
                </div>
                <div className="text-gray-500 text-xs">Mbps</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Peak</span>
                    <span>{rfData.nr.ul.peak} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg</span>
                    <span>{rfData.nr.ul.avg} Mbps</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Cell Information Table */}
        <div className="col-span-9">
          <div className="bg-gray-900 rounded border border-gray-700 overflow-hidden">
            {/* RF Measurement Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs">📶</span>
                <span className="text-sm font-semibold">LTE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">📡</span>
                <span className="text-sm font-semibold text-red-300">5GNR</span>
              </div>
              <div className="text-sm font-semibold">RF Measurement</div>
            </div>

            {/* Cell Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">Serving PCI</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">PCell</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">SCell1</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">SCell2</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">SCell3</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">SCell4</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">SCell5</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">SCell6</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">SCell7</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">Serving PCI</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">EARFCN</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">Band</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">RSRP(dBm)</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">RSRQ(dB)</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">SINR(dB)</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">DL TP(Mbps)</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">UL TP(Mbps)</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800 bg-gray-850">
                    <td className="px-3 py-2 text-gray-300">Serving PCI</td>
                    <td className="px-3 py-2 text-red-400">{rfData.servingPCI}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">Serving Tx Beam ID</td>
                    <td className="px-3 py-2 text-red-400">{rfData.servingTxBeamId}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">NR-ARFCN(Band)</td>
                    <td className="px-3 py-2 text-red-400">{rfData.nrArfcn}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">Duplex Mode</td>
                    <td className="px-3 py-2 text-red-400">{rfData.duplexMode}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">SCS(kHz)</td>
                    <td className="px-3 py-2 text-red-400">{rfData.scs}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">SS-RSRP(dBm)</td>
                    <td className="px-3 py-2 text-red-400">{rfData.ssRsrp.toFixed(2)}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">SS-RSRQ(dB)</td>
                    <td className="px-3 py-2 text-red-400">{rfData.ssRsrq.toFixed(2)}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">SINR(dB)</td>
                    <td className="px-3 py-2 text-red-400">{rfData.sinr.toFixed(2)}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">DL TP(Mbps)</td>
                    <td className="px-3 py-2 text-red-400">{rfData.dlThroughput.toFixed(2)}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-300">UL TP(Mbps)</td>
                    <td className="px-3 py-2 text-red-400">{rfData.ulThroughput.toFixed(2)}</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Accuver Copyright */}
      <div className="mt-4 text-right">
        <span className="text-green-500 font-bold text-sm">Accuver</span>
        <span className="text-gray-500 text-xs ml-2">COPYRIGHT © 2019 INNOWIRELESS., ALL RIGHT RESERVED.</span>
      </div>
    </div>
  )
}
