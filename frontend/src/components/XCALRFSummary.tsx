import { useEffect, useState } from 'react'
import { api } from '@/utils/api'

interface RFData {
  ueState: string
  throughput: { dl: number; ul: number }
  lte: {
    pcell: CellData
    scells: CellData[]
  }
  nr: {
    pcell: CellData
    scells: CellData[]
  }
}

interface CellData {
  servingPCI: number | null
  earfcn: number | null
  band: number | null
  rsrp: number | null
  rsrq: number | null
  sinr: number | null
  dlTp: number | null
  ulTp: number | null
  servingTxBeamId?: number | null
  nrArfcn?: number | null
  duplexMode?: string
  scs?: number | null
}

export default function XCALRFSummary({ sessionId }: { sessionId: string | null }) {
  const [rfData, setRfData] = useState<RFData>({
    ueState: 'None',
    throughput: { dl: 0, ul: 0 },
    lte: {
      pcell: {} as CellData,
      scells: Array(7).fill({} as CellData)
    },
    nr: {
      pcell: {} as CellData,
      scells: Array(7).fill({} as CellData)
    }
  })

  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const kpis = await api.getKpis(sessionId)
        // Update RF data from KPIs
        setRfData(prev => ({
          ...prev,
          throughput: kpis.throughput || prev.throughput,
          lte: {
            pcell: {
              ...prev.lte.pcell,
              rsrp: kpis.rsrp ?? prev.lte.pcell.rsrp,
              rsrq: kpis.rsrq ?? prev.lte.pcell.rsrq,
              sinr: kpis.sinr ?? prev.lte.pcell.sinr
            },
            scells: prev.lte.scells
          }
        }))
      } catch (err) {
        console.error('Failed to fetch RF data:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId])

  const formatValue = (value: number | null | undefined, unit: string = '') => {
    if (value === null || value === undefined) return '-'
    return `${value}${unit}`
  }

  const getRsrpColor = (rsrp: number | null) => {
    if (!rsrp) return 'text-gray-500'
    if (rsrp >= -80) return 'text-green-400'
    if (rsrp >= -90) return 'text-yellow-400'
    if (rsrp >= -100) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="h-full bg-black text-white flex">
      {/* Left Panel - UE State & Gauges */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 space-y-4">
        {/* UE State */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">UE State</div>
          <div className="text-lg font-bold">{rfData.ueState}</div>
        </div>

        {/* Current Throughput */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-2">Current Throughput</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs">Mbps</span>
            <span className="text-xs">Gbps</span>
          </div>
          
          {/* Total Gauge */}
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Total</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-xs text-gray-400">DL</div>
                <div className="text-2xl font-bold text-green-400">
                  {rfData.throughput.dl.toFixed(1)}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400">UL</div>
                <div className="text-2xl font-bold text-blue-400">
                  {rfData.throughput.ul.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LTE Section */}
        <div className="bg-gray-800 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-green-400">📶</div>
            <div className="text-sm font-bold">LTE</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">DL</div>
              <div className="text-lg font-bold">0</div>
              <div className="text-gray-500">Mbps</div>
            </div>
            <div>
              <div className="text-gray-400">UL</div>
              <div className="text-lg font-bold">0</div>
              <div className="text-gray-500">Mbps</div>
            </div>
          </div>
        </div>

        {/* 5GNR Section */}
        <div className="bg-gray-800 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-red-400">📡</div>
            <div className="text-sm font-bold">5GNR</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">DL</div>
              <div className="text-lg font-bold">0</div>
              <div className="text-gray-500">Mbps</div>
            </div>
            <div>
              <div className="text-gray-400">UL</div>
              <div className="text-lg font-bold">0</div>
              <div className="text-gray-500">Mbps</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <h2 className="text-2xl font-bold">RF Measurement Summary</h2>
          </div>

          {/* LTE Table */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-green-400 text-xl">📶</div>
              <h3 className="text-lg font-bold">LTE</h3>
            </div>
            
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="text-left p-3 text-green-400 font-semibold">RF Measurement</th>
                    <th className="text-center p-3 font-semibold">PCell</th>
                    <th className="text-center p-3 font-semibold">SCell1</th>
                    <th className="text-center p-3 font-semibold">SCell2</th>
                    <th className="text-center p-3 font-semibold">SCell3</th>
                    <th className="text-center p-3 font-semibold">SCell4</th>
                    <th className="text-center p-3 font-semibold">SCell5</th>
                    <th className="text-center p-3 font-semibold">SCell6</th>
                    <th className="text-center p-3 font-semibold">SCell7</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">Serving PCI</td>
                    <td className="p-3 text-center">{formatValue(rfData.lte.pcell.servingPCI)}</td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.servingPCI)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">EARFCN</td>
                    <td className="p-3 text-center">{formatValue(rfData.lte.pcell.earfcn)}</td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.earfcn)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">Band</td>
                    <td className="p-3 text-center">{formatValue(rfData.lte.pcell.band)}</td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.band)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">RSRP(dBm)</td>
                    <td className={`p-3 text-center font-bold ${getRsrpColor(rfData.lte.pcell.rsrp)}`}>
                      {formatValue(rfData.lte.pcell.rsrp)}
                    </td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.rsrp)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">RSRQ(dB)</td>
                    <td className="p-3 text-center">{formatValue(rfData.lte.pcell.rsrq)}</td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.rsrq)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">SINR(dB)</td>
                    <td className="p-3 text-center">{formatValue(rfData.lte.pcell.sinr)}</td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.sinr)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">DL TP(Mbps)</td>
                    <td className="p-3 text-center">{formatValue(rfData.lte.pcell.dlTp)}</td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.dlTp)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-400">UL TP(Mbps)</td>
                    <td className="p-3 text-center">{formatValue(rfData.lte.pcell.ulTp)}</td>
                    {rfData.lte.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.ulTp)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5GNR Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-red-400 text-xl">📡</div>
              <h3 className="text-lg font-bold">5GNR</h3>
            </div>
            
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="text-left p-3 text-green-400 font-semibold">RF Measurement</th>
                    <th className="text-center p-3 font-semibold">PCell</th>
                    <th className="text-center p-3 font-semibold">SCell1</th>
                    <th className="text-center p-3 font-semibold">SCell2</th>
                    <th className="text-center p-3 font-semibold">SCell3</th>
                    <th className="text-center p-3 font-semibold">SCell4</th>
                    <th className="text-center p-3 font-semibold">SCell5</th>
                    <th className="text-center p-3 font-semibold">SCell6</th>
                    <th className="text-center p-3 font-semibold">SCell7</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">Serving PCI</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.servingPCI)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.servingPCI)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">Serving Tx Beam ID</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.servingTxBeamId)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.servingTxBeamId)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">NR-ARFCN(Band)</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.nrArfcn)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.nrArfcn)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">Duplex Mode</td>
                    <td className="p-3 text-center">{rfData.nr.pcell.duplexMode || '-'}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{cell.duplexMode || '-'}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">SCS(kHz)</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.scs)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.scs)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">SS-RSRP(dBm)</td>
                    <td className={`p-3 text-center font-bold ${getRsrpColor(rfData.nr.pcell.rsrp)}`}>
                      {formatValue(rfData.nr.pcell.rsrp)}
                    </td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.rsrp)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">SS-RSRQ(dB)</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.rsrq)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.rsrq)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">SINR(dB)</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.sinr)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.sinr)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="p-3 text-gray-400">DL TP(Mbps)</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.dlTp)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.dlTp)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-400">UL TP(Mbps)</td>
                    <td className="p-3 text-center">{formatValue(rfData.nr.pcell.ulTp)}</td>
                    {rfData.nr.scells.map((cell, i) => (
                      <td key={i} className="p-3 text-center text-gray-600">{formatValue(cell.ulTp)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 text-right">
            <span className="text-green-500 font-bold">Accuver</span>
            <span className="text-gray-500 text-xs ml-2">COPYRIGHT © 2019 INNOWIRELESS., ALL RIGHT RESERVED.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
