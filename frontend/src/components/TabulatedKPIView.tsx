import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface TabulatedKPIViewProps {
  sessionId: string
  kpiType: string
}

export default function TabulatedKPIView({ sessionId, kpiType }: TabulatedKPIViewProps) {
  const [data, setData] = useState<any>({})
  const [timestamp, setTimestamp] = useState('')

  useEffect(() => {
    if (!sessionId) return
    const fetchData = async () => {
      try {
        const kpiData = await api.getKpiAggregates(sessionId)
        setData(kpiData)
        setTimestamp(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2 }))
      } catch (err) {
        console.error('Failed to fetch KPI data:', err)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [sessionId, kpiType])

  // Render based on KPI type
  if (kpiType.includes('5GNR Information (MIB)')) {
    return (
      <div className="h-full bg-gray-900 text-white overflow-auto">
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">Time Stamp</div>
          <div className="text-lg font-mono">{timestamp}</div>
        </div>
        <table className="w-full">
          <tbody>
            {[
              { param: 'systemFrameNumber', value: '254' },
              { param: 'subCarrierSpacingCommon', value: 'scs15' },
              { param: 'ssb-SubcarrierOffset', value: '2' },
              { param: 'dmrs-TypeA-Position', value: 'pos3' },
              { param: 'pdcch-ConfigSIB1', value: '116' },
              { param: 'pdcch-ConfigSIB1_controlResourceSetZero', value: '7' },
              { param: 'pdcch-ConfigSIB1_SearchSpaceZero', value: '4' },
              { param: 'cellBarred', value: 'notBarred' },
              { param: 'intraFreqReselection', value: 'allowed' }
            ].map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
                <td className="px-4 py-3 border-b border-gray-700 w-1/2 text-gray-300">{row.param}</td>
                <td className="px-4 py-3 border-b border-gray-700 w-1/2 font-mono">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (kpiType.includes('5GNR SA Information (SIB1)')) {
    return (
      <div className="h-full bg-gray-900 text-white overflow-auto">
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Time</div>
            <div className="text-lg font-mono">{timestamp}</div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-blue-900 sticky top-0">
            <tr>
              <th className="text-left p-3 border-r border-gray-700"></th>
              <th className="text-center p-3 border-r border-gray-700">DL Config</th>
              <th className="text-center p-3 border-r border-gray-700">UL Config</th>
              <th className="text-center p-3">SUL Config</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-800">
              <td className="p-3 border-r border-gray-700 text-gray-300">Frequency Band</td>
              <td className="p-3 text-center border-r border-gray-700">25</td>
              <td className="p-3 text-center border-r border-gray-700">25</td>
              <td className="p-3 text-center">-</td>
            </tr>
            <tr className="bg-gray-850">
              <td className="p-3 border-r border-gray-700 text-gray-300">SCS</td>
              <td className="p-3 text-center border-r border-gray-700">15kHz</td>
              <td className="p-3 text-center border-r border-gray-700">15kHz</td>
              <td className="p-3 text-center">-</td>
            </tr>
            <tr className="bg-gray-800">
              <td className="p-3 border-r border-gray-700 text-gray-300">Bandwidth</td>
              <td className="p-3 text-center border-r border-gray-700">20MHz(106)</td>
              <td className="p-3 text-center border-r border-gray-700">20MHz(106)</td>
              <td className="p-3 text-center">-</td>
            </tr>
            <tr className="bg-gray-850">
              <td className="p-3 border-r border-gray-700 text-gray-300">p-Max</td>
              <td className="p-3 text-center border-r border-gray-700">-</td>
              <td className="p-3 text-center border-r border-gray-700">27</td>
              <td className="p-3 text-center">-</td>
            </tr>
          </tbody>
        </table>
        <div className="bg-blue-900 px-4 py-2 font-semibold text-sm mt-4">Serving Cell Config</div>
        <table className="w-full text-sm">
          <tbody>
            {[
              { param: 'n-TimingAdvanceOffset', value: 'n39936' },
              { param: 'SSB-Periodicity', value: 'ms20' },
              { param: 'SSB-PositionInBurst', value: '10000000' }
            ].map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
                <td className="px-4 py-3 border-b border-gray-700 w-1/2 text-gray-300">{row.param}</td>
                <td className="px-4 py-3 border-b border-gray-700 w-1/2 font-mono">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-blue-900 px-4 py-2 font-semibold text-sm mt-4">Cell Selection Info</div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="bg-gray-800">
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 text-gray-300">q-RxLevMin</td>
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 font-mono">-61 (-122 dBm)</td>
            </tr>
            <tr className="bg-gray-850">
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 text-gray-300">q-RxLevMinOffset</td>
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 font-mono">-</td>
            </tr>
            <tr className="bg-gray-800">
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 text-gray-300">q-RxLevMinSUL</td>
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 font-mono">-</td>
            </tr>
          </tbody>
        </table>
        <div className="bg-blue-900 px-4 py-2 font-semibold text-sm mt-4">PLMN Identity List</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-center p-3 border-r border-gray-700">MCC</th>
              <th className="text-center p-3 border-r border-gray-700">MNC</th>
              <th className="text-center p-3">Operator Use</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-850">
              <td className="p-3 text-center border-r border-gray-700">310(USA)</td>
              <td className="p-3 text-center border-r border-gray-700">260(T-Mobile)</td>
              <td className="p-3 text-center">notReserved</td>
            </tr>
          </tbody>
        </table>
        <table className="w-full text-sm mt-4">
          <tbody>
            <tr className="bg-gray-800">
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 text-gray-300">Tracking Area Code</td>
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 font-mono">8180480</td>
            </tr>
            <tr className="bg-gray-850">
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 text-gray-300">Global Cell Identity (gNB / Cell ID)</td>
              <td className="px-4 py-3 border-b border-gray-700 w-1/2 font-mono">6504808472 (397022 / 24)</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (kpiType.includes('Handover Statistics')) {
    return (
      <div className="h-full bg-gray-900 text-white overflow-auto">
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
          <div className="text-lg font-semibold">5GNR Handover Statistics (intra NR-HO)</div>
          <div className="text-sm text-gray-400">Time: {timestamp}</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-700 sticky top-0">
            <tr>
              <th className="text-left p-3 border-r border-gray-600" rowSpan={2}>Time</th>
              <th className="text-center p-3 border-r border-gray-600" colSpan={3}>Attempt</th>
              <th className="text-center p-3 border-r border-gray-600" colSpan={3}>Success</th>
              <th className="text-center p-3" colSpan={3}>Failure</th>
            </tr>
            <tr className="border-t border-gray-600">
              <th className="text-center p-2 text-xs border-r border-gray-600">Count</th>
              <th className="text-center p-2 text-xs border-r border-gray-600">Rate(%)</th>
              <th className="text-center p-2 text-xs border-r border-gray-600">Duration(avg)(ms)</th>
              <th className="text-center p-2 text-xs border-r border-gray-600">Count</th>
              <th className="text-center p-2 text-xs border-r border-gray-600">Rate(%)</th>
              <th className="text-center p-2 text-xs border-r border-gray-600">Duration(avg)(ms)</th>
              <th className="text-center p-2 text-xs border-r border-gray-600">Count</th>
              <th className="text-center p-2 text-xs border-r border-gray-600">Rate(%)</th>
              <th className="text-center p-2 text-xs">Duration(avg)(ms)</th>
            </tr>
          </thead>
          <tbody>
            {[
              'Intra NR-HO(Total)',
              'Intra Frequency HO',
              'Inter Frequency HO',
              'UnKnown Frequency HO',
              'Intra / Inter gNB HO',
              'Intra Frequency - Intra gNB HO',
              'Intra Frequency - Inter gNB HO'
            ].map((category, idx) => (
              <tr key={idx} className={`border-t border-gray-700 ${idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}>
                <td className="p-3 border-r border-gray-700 font-semibold text-blue-400">{category}</td>
                <td className="p-3 text-center border-r border-gray-700">-</td>
                <td className="p-3 text-center border-r border-gray-700">-</td>
                <td className="p-3 text-center border-r border-gray-700">-</td>
                <td className="p-3 text-center border-r border-gray-700 text-green-400">-</td>
                <td className="p-3 text-center border-r border-gray-700">-</td>
                <td className="p-3 text-center border-r border-gray-700">-</td>
                <td className="p-3 text-center border-r border-gray-700 text-red-400">-</td>
                <td className="p-3 text-center border-r border-gray-700">-</td>
                <td className="p-3 text-center">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Default view
  return (
    <div className="h-full bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl mb-2">{kpiType}</div>
        <div className="text-gray-400">No data available</div>
      </div>
    </div>
  )
}
