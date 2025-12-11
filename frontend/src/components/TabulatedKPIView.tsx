import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import React from 'react'

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
        setTimestamp(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }))
      } catch (err) {
        console.error('Failed to fetch KPI data:', err)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [sessionId, kpiType])

  const render5GNRHandoverStatsDetailed = () => (
    <div className="h-full overflow-auto bg-gray-900 text-white">
      <div className="bg-gray-800 p-2 border-b border-gray-700 flex gap-2">
        {['M1 [M2]', 'M2 [M3]', 'M3 [M4]', 'M4 [M4]'].map(tab => (
          <button key={tab} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">{tab}</button>
        ))}
      </div>
      <table className="w-full text-xs">
        <tbody>
          {[
            { section: 'Intra NR-HO(Total)', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Intra Frequency HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Inter Frequency HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Unknown Frequency HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Intra Frequency - Intra gNB HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Intra Frequency - Inter gNB HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] }
          ].map((section, idx) => (
            <React.Fragment key={idx}>
              <tr className="bg-blue-900">
                <td colSpan={4} className="p-2 font-semibold border border-gray-700">{section.section}</td>
              </tr>
              {section.rows.map((row, ridx) => (
                <tr key={ridx} className={ridx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                  <td className="p-2 border border-gray-700 bg-blue-800 w-48">{row.label}</td>
                  <td className="p-2 border border-gray-700 text-center">-</td>
                  <td className="p-2 border border-gray-700 text-center">-</td>
                  <td className="p-2 border border-gray-700 text-center">-</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )

  const render5GNRUECapability = () => (
    <div className="h-full flex flex-col overflow-hidden bg-gray-900 text-white">
      <div className="bg-gray-800 p-2 border-b border-gray-700 flex gap-2">
        {['ENDC', 'NR-only', 'NRDC'].map(tab => (
          <button key={tab} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">{tab}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">IMS-Parameters</div>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead className="bg-blue-900 sticky top-0">
                <tr>
                  <th className="p-2 border border-gray-700">No</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">FeatureSetCombination(DL,UE1)</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">CA Bandwidth Class(1)</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">CA Bandwidth Class(DL)</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">FeatureSetCombination ID</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">Band Combination Set</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">NR DL Feature Set(supportedBandwidthDL)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                    <td className="p-2 border border-gray-700 text-center">{idx + 1}</td>
                    <td className="p-2 border border-gray-700">-</td>
                    <td className="p-2 border border-gray-700">-</td>
                    <td className="p-2 border border-gray-700">-</td>
                    <td className="p-2 border border-gray-700">-</td>
                    <td className="p-2 border border-gray-700">-</td>
                    <td className="p-2 border border-gray-700">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  const render5GNRSAInfoDetailed = () => (
    <div className="h-full overflow-auto bg-gray-900 text-white">
      <div className="bg-gray-800 p-3 border-b border-gray-700">
        <div className="text-right text-sm">
          <span className="font-semibold">Time</span>
          <span className="ml-4 font-mono">{timestamp || '08:57:02.913'}</span>
        </div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr className="bg-blue-900">
            <td className="p-2 border border-gray-700 font-semibold w-48" rowSpan={4}></td>
            <td className="p-2 border border-gray-700 text-center font-semibold" colSpan={2}>DL Config</td>
            <td className="p-2 border border-gray-700 text-center font-semibold" colSpan={2}>UL Config</td>
            <td className="p-2 border border-gray-700 text-center font-semibold">SUL Config</td>
          </tr>
          <tr className="bg-blue-900">
            <td className="p-2 border border-gray-700 font-semibold">Frequency Band</td>
            <td className="p-2 border border-gray-700 text-center">25</td>
            <td className="p-2 border border-gray-700 font-semibold">Frequency Band</td>
            <td className="p-2 border border-gray-700 text-center">25</td>
            <td className="p-2 border border-gray-700 text-center">-</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 font-semibold">SCS</td>
            <td className="p-2 border border-gray-700 text-center">15kHz</td>
            <td className="p-2 border border-gray-700 font-semibold">SCS</td>
            <td className="p-2 border border-gray-700 text-center">15kHz</td>
            <td className="p-2 border border-gray-700 text-center">-</td>
          </tr>
          <tr className="bg-gray-900">
            <td className="p-2 border border-gray-700 font-semibold">Bandwidth</td>
            <td className="p-2 border border-gray-700 text-center">20MHz(106)</td>
            <td className="p-2 border border-gray-700 font-semibold">Bandwidth</td>
            <td className="p-2 border border-gray-700 text-center">20MHz(106)</td>
            <td className="p-2 border border-gray-700 text-center">-</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 font-semibold">p-Max</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>-</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>27</td>
            <td className="p-2 border border-gray-700 text-center">-</td>
          </tr>
          <tr className="bg-blue-900">
            <td className="p-2 border border-gray-700 font-semibold" colSpan={3}>Serving Cell Config</td>
            <td className="p-2 border border-gray-700 font-semibold" colSpan={3}>Cell Selection Info</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 font-semibold">n-TimingAdvanceOffset</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>n39936</td>
            <td className="p-2 border border-gray-700 font-semibold">q-RxLevMin</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>-61 (-122 dBm)</td>
          </tr>
          <tr className="bg-gray-900">
            <td className="p-2 border border-gray-700 font-semibold">SSB-Periodicity</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>ms20</td>
            <td className="p-2 border border-gray-700 font-semibold">q-RxLevMinOffset</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>-</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 font-semibold">SSB-PositionInBurst</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>10000000</td>
            <td className="p-2 border border-gray-700 font-semibold">q-RxLevMinSUL</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>-</td>
          </tr>
          <tr className="bg-blue-900">
            <td className="p-2 border border-gray-700 font-semibold text-center" colSpan={6}>PLMN Identity List</td>
          </tr>
          <tr className="bg-blue-800">
            <td className="p-2 border border-gray-700 font-semibold text-center" colSpan={2}>MCC</td>
            <td className="p-2 border border-gray-700 font-semibold text-center" colSpan={2}>MNC</td>
            <td className="p-2 border border-gray-700 font-semibold text-center" colSpan={2}>Operator Use</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>310(USA)</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>260(T-Mobile)</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={2}>notReserved</td>
          </tr>
          <tr className="bg-gray-900">
            <td className="p-2 border border-gray-700 font-semibold">PLMN ID</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={5}>-</td>
          </tr>
          <tr className="bg-blue-900">
            <td className="p-2 border border-gray-700 font-semibold">Tracking Area Code</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={5}>8180480</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 font-semibold">Global Cell Identity (gNB / Cell ID)</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={5}>6504808472 (397022 / 24)</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const render5GNRInfoMIB = () => (
    <div className="h-full bg-gray-900 text-white overflow-auto">
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">Time Stamp</div>
        <div className="text-lg font-mono">{timestamp}</div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {[
            { param: 'systemFrameNumber', value: '254', color: 'cyan' },
            { param: 'subCarrierSpacingCommon', value: 'scs15', color: 'yellow' },
            { param: 'ssb-SubcarrierOffset', value: '2', color: 'cyan' },
            { param: 'dmrs-TypeA-Position', value: 'pos3', color: 'yellow' },
            { param: 'pdcch-ConfigSIB1', value: '116', color: 'cyan' },
            { param: 'pdcch-ConfigSIB1_controlResourceSetZero', value: '7', color: 'yellow' },
            { param: 'pdcch-ConfigSIB1_SearchSpaceZero', value: '4', color: 'cyan' },
            { param: 'cellBarred', value: 'notBarred', color: 'yellow' },
            { param: 'intraFreqReselection', value: 'allowed', color: 'cyan' }
          ].map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
              <td className="p-3 border-b border-gray-700 font-semibold w-1/2">{row.param}</td>
              <td className={`p-3 border-b border-gray-700 text-${row.color}-400`}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // Route to appropriate renderer
  if (kpiType.includes('Handover Statistics')) {
    return render5GNRHandoverStatsDetailed()
  } else if (kpiType.includes('UE Capability') || kpiType.includes('Feature Sets')) {
    return render5GNRUECapability()
  } else if (kpiType.includes('SA Information (SIB1)')) {
    return render5GNRSAInfoDetailed()
  } else {
    return render5GNRInfoMIB()
  }
}
