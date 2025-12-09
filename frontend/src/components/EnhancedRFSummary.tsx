import { useEffect, useState } from 'react'

interface EnhancedRFSummaryProps {
  sessionId: string | null
}

interface ThroughputData {
  dl: number
  ul: number
  peakDl: number
  peakUl: number
  avgDl: number
  avgUl: number
}

interface CellData {
  servingPci?: number
  earfcn?: number
  band?: string
  rsrp?: number
  rsrq?: number
  sinr?: number
  dlTp?: number
  ulTp?: number
  servingTxBeamId?: number
  nrArfcn?: string
  duplexMode?: string
  scs?: number
  ssRsrp?: number
  ssRsrq?: number
}

interface RFSummaryData {
  ueState: '5GNR' | 'LTE' | 'None'
  batteryTemp: number
  thermalStatus: string
  throughput: {
    total: ThroughputData
    lte: ThroughputData
    nr: ThroughputData
  }
  pcell: CellData
  scells: CellData[]
}

export default function EnhancedRFSummary({ sessionId }: EnhancedRFSummaryProps) {
  const [data, setData] = useState<RFSummaryData>({
    ueState: 'None',
    batteryTemp: 0,
    thermalStatus: 'NONE',
    throughput: {
      total: { dl: 0, ul: 0, peakDl: 0, peakUl: 0, avgDl: 0, avgUl: 0 },
      lte: { dl: 0, ul: 0, peakDl: 0, peakUl: 0, avgDl: 0, avgUl: 0 },
      nr: { dl: 0, ul: 0, peakDl: 0, peakUl: 0, avgDl: 0, avgUl: 0 }
    },
    pcell: {},
    scells: []
  })

  useEffect(() => {
    if (!sessionId) return

    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/kpis/session/${sessionId}`)
        if (response.ok) {
          const kpiData = await response.json()
          // Transform API data to component format
          setData(transformKpiData(kpiData))
        }
      } catch (error) {
        console.error('Failed to fetch RF summary:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [sessionId])

  const transformKpiData = (apiData: any): RFSummaryData => {
    return {
      ueState: apiData.rat === '5GNR' ? '5GNR' : apiData.rat === 'LTE' ? 'LTE' : 'None',
      batteryTemp: apiData.batteryTemp || 0,
      thermalStatus: apiData.thermalStatus || 'NONE',
      throughput: {
        total: {
          dl: apiData.dlThroughput || 0,
          ul: apiData.ulThroughput || 0,
          peakDl: apiData.peakDlThroughput || 0,
          peakUl: apiData.peakUlThroughput || 0,
          avgDl: apiData.avgDlThroughput || 0,
          avgUl: apiData.avgUlThroughput || 0
        },
        lte: {
          dl: apiData.lteDlThroughput || 0,
          ul: apiData.lteUlThroughput || 0,
          peakDl: apiData.ltePeakDlThroughput || 0,
          peakUl: apiData.ltePeakUlThroughput || 0,
          avgDl: apiData.lteAvgDlThroughput || 0,
          avgUl: apiData.lteAvgUlThroughput || 0
        },
        nr: {
          dl: apiData.nrDlThroughput || 0,
          ul: apiData.nrUlThroughput || 0,
          peakDl: apiData.nrPeakDlThroughput || 0,
          peakUl: apiData.nrPeakUlThroughput || 0,
          avgDl: apiData.nrAvgDlThroughput || 0,
          avgUl: apiData.nrAvgUlThroughput || 0
        }
      },
      pcell: {
        servingPci: apiData.pci,
        earfcn: apiData.earfcn,
        band: apiData.band,
        rsrp: apiData.rsrp,
        rsrq: apiData.rsrq,
        sinr: apiData.sinr,
        dlTp: apiData.dlThroughput,
        ulTp: apiData.ulThroughput
      },
      scells: apiData.scells || []
    }
  }

  const ThroughputWidget = ({ title, data, icon }: { title: string; data: ThroughputData; icon: string }) => (
    <div className="bg-slate-800 rounded p-3 border border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-slate-400">DL</div>
          <div className="text-white font-mono">{data.dl.toFixed(2)} Mbps</div>
        </div>
        <div>
          <div className="text-slate-400">UL</div>
          <div className="text-white font-mono">{data.ul.toFixed(2)} Mbps</div>
        </div>
        <div>
          <div className="text-slate-400">Peak</div>
          <div className="text-white font-mono text-xs">{data.peakDl.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-slate-400">Peak</div>
          <div className="text-white font-mono text-xs">{data.peakUl.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-slate-400">Avg</div>
          <div className="text-white font-mono text-xs">{data.avgDl.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-slate-400">Avg</div>
          <div className="text-white font-mono text-xs">{data.avgUl.toFixed(1)}</div>
        </div>
      </div>
    </div>
  )

  const getRsrpColor = (rsrp?: number) => {
    if (!rsrp) return 'text-slate-500'
    if (rsrp >= -80) return 'text-green-400'
    if (rsrp >= -95) return 'text-blue-400'
    if (rsrp >= -110) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="h-full flex bg-slate-900 text-white">
      <div className="w-80 bg-slate-800 border-r border-slate-700 p-4 space-y-4">
        <div className="bg-slate-700 rounded p-3">
          <div className="text-xs text-slate-400 mb-1">UE State</div>
          <div className="text-lg font-bold">{data.ueState}</div>
        </div>

        <div className="bg-slate-700 rounded p-3">
          <div className="text-xs text-slate-400 mb-2">Battery Temperature</div>
          <div className="text-2xl font-bold">{data.batteryTemp.toFixed(1)}°C</div>
          <div className="text-xs text-slate-400 mt-1">
            {(data.batteryTemp * 9/5 + 32).toFixed(1)}°F
          </div>
        </div>

        <div className="bg-slate-700 rounded p-3">
          <div className="text-xs text-slate-400 mb-1">Thermal Status</div>
          <div className="text-sm font-semibold">{data.thermalStatus}</div>
        </div>

        <ThroughputWidget title="Total" data={data.throughput.total} icon="📊" />
        <ThroughputWidget title="LTE" data={data.throughput.lte} icon="📡" />
        <ThroughputWidget title="5GNR" data={data.throughput.nr} icon="🔥" />
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">RF Measurement Summary</h2>
          <div className="flex gap-4 text-sm">
            <div>Battery Temperature: <span className="font-mono">{data.batteryTemp.toFixed(1)}°C</span></div>
            <div>Thermal Status: <span className="font-semibold">{data.thermalStatus}</span></div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700">
                <th className="p-2 text-left">RF Measurement</th>
                <th className="p-2 text-center">PCell</th>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <th key={i} className="p-2 text-center">SCell{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-700">
                <td colSpan={9} className="p-2 bg-slate-750">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">📡</span>
                    <span className="font-semibold">LTE</span>
                  </div>
                </td>
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">Serving PCI</td>
                <td className="p-2 text-center font-mono">{data.pcell.servingPci || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.servingPci || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">EARFCN</td>
                <td className="p-2 text-center font-mono">{data.pcell.earfcn || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.earfcn || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">Band</td>
                <td className="p-2 text-center font-mono">{data.pcell.band || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.band || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">RSRP(dBm)</td>
                <td className={`p-2 text-center font-mono ${getRsrpColor(data.pcell.rsrp)}`}>
                  {data.pcell.rsrp?.toFixed(1) || '-'}
                </td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className={`p-2 text-center font-mono ${getRsrpColor(cell.rsrp)}`}>
                    {cell.rsrp?.toFixed(1) || '-'}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">RSRQ(dB)</td>
                <td className="p-2 text-center font-mono">{data.pcell.rsrq?.toFixed(1) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.rsrq?.toFixed(1) || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">SINR(dB)</td>
                <td className="p-2 text-center font-mono">{data.pcell.sinr?.toFixed(1) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.sinr?.toFixed(1) || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">DL TP(Mbps)</td>
                <td className="p-2 text-center font-mono">{data.pcell.dlTp?.toFixed(2) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.dlTp?.toFixed(2) || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">UL TP(Mbps)</td>
                <td className="p-2 text-center font-mono">{data.pcell.ulTp?.toFixed(2) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.ulTp?.toFixed(2) || '-'}</td>
                ))}
              </tr>

              <tr className="border-t border-slate-700">
                <td colSpan={9} className="p-2 bg-slate-750">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">🔥</span>
                    <span className="font-semibold">5GNR</span>
                  </div>
                </td>
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">Serving PCI</td>
                <td className="p-2 text-center font-mono">{data.pcell.servingPci || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.servingPci || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">Serving Tx Beam ID</td>
                <td className="p-2 text-center font-mono">{data.pcell.servingTxBeamId || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.servingTxBeamId || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">NR-ARFCN(Band)</td>
                <td className="p-2 text-center font-mono">{data.pcell.nrArfcn || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.nrArfcn || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">Duplex Mode</td>
                <td className="p-2 text-center font-mono">{data.pcell.duplexMode || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.duplexMode || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">SCS(kHz)</td>
                <td className="p-2 text-center font-mono">{data.pcell.scs || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.scs || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">SS-RSRP(dBm)</td>
                <td className={`p-2 text-center font-mono ${getRsrpColor(data.pcell.ssRsrp)}`}>
                  {data.pcell.ssRsrp?.toFixed(1) || '-'}
                </td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className={`p-2 text-center font-mono ${getRsrpColor(cell.ssRsrp)}`}>
                    {cell.ssRsrp?.toFixed(1) || '-'}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">SS-RSRQ(dB)</td>
                <td className="p-2 text-center font-mono">{data.pcell.ssRsrq?.toFixed(1) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.ssRsrq?.toFixed(1) || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">SINR(dB)</td>
                <td className="p-2 text-center font-mono">{data.pcell.sinr?.toFixed(1) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.sinr?.toFixed(1) || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">DL TP(Mbps)</td>
                <td className="p-2 text-center font-mono">{data.pcell.dlTp?.toFixed(2) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.dlTp?.toFixed(2) || '-'}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-700">
                <td className="p-2">UL TP(Mbps)</td>
                <td className="p-2 text-center font-mono">{data.pcell.ulTp?.toFixed(2) || '-'}</td>
                {data.scells.slice(0, 7).map((cell, i) => (
                  <td key={i} className="p-2 text-center font-mono">{cell.ulTp?.toFixed(2) || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
