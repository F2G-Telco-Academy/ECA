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
  const [networkType, setNetworkType] = useState<'5G' | 'LTE' | 'WCDMA' | 'GSM'>('5G')

  useEffect(() => {
    if (!sessionId) return
    const fetchData = async () => {
      try {
        const kpiData = await api.getKpiAggregates(sessionId)
        setData(kpiData)
        // Detect network type from data
        if (kpiData.rat) {
          if (kpiData.rat.includes('NR') || kpiData.rat.includes('5G')) setNetworkType('5G')
          else if (kpiData.rat.includes('LTE') || kpiData.rat.includes('4G')) setNetworkType('LTE')
          else if (kpiData.rat.includes('WCDMA') || kpiData.rat.includes('UMTS')) setNetworkType('WCDMA')
          else if (kpiData.rat.includes('GSM')) setNetworkType('GSM')
        }
        setTimestamp(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }))
      } catch (err) {
        console.error('Failed to fetch KPI data:', err)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [sessionId, kpiType])

  const renderHandoverStats = () => (
    <div className="h-full overflow-auto bg-gray-900 text-white">
      <div className="bg-gray-800 p-2 border-b border-gray-700 flex gap-2">
        {['M1 [M2]', 'M2 [M3]', 'M3 [M4]', 'M4 [M4]'].map(tab => (
          <button key={tab} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">{tab}</button>
        ))}
      </div>
      <table className="w-full text-xs">
        <tbody>
          {[
            { section: `Intra ${networkType === '5G' ? 'NR' : networkType}-HO(Total)`, rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Intra Frequency HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Inter Frequency HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: 'Unknown Frequency HO', rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: `Intra Frequency - Intra ${networkType === '5G' ? 'gNB' : 'eNB'} HO`, rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] },
            { section: `Intra Frequency - Inter ${networkType === '5G' ? 'gNB' : 'eNB'} HO`, rows: [{ label: 'Count' }, { label: 'Rate(%)' }, { label: 'Duration(avg)(ms)' }] }
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

  const renderUECapability = () => (
    <div className="h-full flex flex-col overflow-hidden bg-gray-900 text-white">
      <div className="bg-gray-800 p-2 border-b border-gray-700 flex gap-2">
        {networkType === '5G' ? 
          ['ENDC', 'NR-only', 'NRDC'].map(tab => (
            <button key={tab} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">{tab}</button>
          )) :
          ['Supported Bands', 'CA Combinations', 'Features'].map(tab => (
            <button key={tab} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">{tab}</button>
          ))
        }
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">
            {networkType === '5G' ? 'IMS-Parameters' : networkType === 'LTE' ? 'LTE UE Category' : 'UE Capabilities'}
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead className="bg-blue-900 sticky top-0">
                <tr>
                  <th className="p-2 border border-gray-700">No</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">Feature/Band</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">Supported</th>
                  <th className="p-2 border border-gray-700 whitespace-nowrap">Configuration</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                    <td className="p-2 border border-gray-700 text-center">{idx + 1}</td>
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

  const renderSystemInfo = () => (
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
            <td className="p-2 border border-gray-700 text-center">{networkType === '5G' ? '25' : networkType === 'LTE' ? '7' : '1'}</td>
            <td className="p-2 border border-gray-700 font-semibold">Frequency Band</td>
            <td className="p-2 border border-gray-700 text-center">{networkType === '5G' ? '25' : networkType === 'LTE' ? '7' : '1'}</td>
            <td className="p-2 border border-gray-700 text-center">-</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 font-semibold">{networkType === '5G' ? 'SCS' : 'Bandwidth'}</td>
            <td className="p-2 border border-gray-700 text-center">{networkType === '5G' ? '15kHz' : networkType === 'LTE' ? '20MHz' : '5MHz'}</td>
            <td className="p-2 border border-gray-700 font-semibold">{networkType === '5G' ? 'SCS' : 'Bandwidth'}</td>
            <td className="p-2 border border-gray-700 text-center">{networkType === '5G' ? '15kHz' : networkType === 'LTE' ? '20MHz' : '5MHz'}</td>
            <td className="p-2 border border-gray-700 text-center">-</td>
          </tr>
          <tr className="bg-gray-900">
            <td className="p-2 border border-gray-700 font-semibold">Bandwidth</td>
            <td className="p-2 border border-gray-700 text-center">{networkType === '5G' ? '20MHz(106)' : '20MHz'}</td>
            <td className="p-2 border border-gray-700 font-semibold">Bandwidth</td>
            <td className="p-2 border border-gray-700 text-center">{networkType === '5G' ? '20MHz(106)' : '20MHz'}</td>
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
          <tr className="bg-blue-900">
            <td className="p-2 border border-gray-700 font-semibold">Tracking Area Code</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={5}>8180480</td>
          </tr>
          <tr className="bg-gray-800">
            <td className="p-2 border border-gray-700 font-semibold">Global Cell Identity ({networkType === '5G' ? 'gNB' : 'eNB'} / Cell ID)</td>
            <td className="p-2 border border-gray-700 text-center" colSpan={5}>6504808472 (397022 / 24)</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const renderMIB = () => (
    <div className="h-full bg-gray-900 text-white overflow-auto">
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">Time Stamp</div>
        <div className="text-lg font-mono">{timestamp}</div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {networkType === '5G' ? [
            { param: 'systemFrameNumber', value: '254', color: 'cyan' },
            { param: 'subCarrierSpacingCommon', value: 'scs15', color: 'yellow' },
            { param: 'ssb-SubcarrierOffset', value: '2', color: 'cyan' },
            { param: 'dmrs-TypeA-Position', value: 'pos3', color: 'yellow' },
            { param: 'pdcch-ConfigSIB1', value: '116', color: 'cyan' },
            { param: 'cellBarred', value: 'notBarred', color: 'yellow' },
            { param: 'intraFreqReselection', value: 'allowed', color: 'cyan' }
          ] : networkType === 'LTE' ? [
            { param: 'dl-Bandwidth', value: 'n100', color: 'cyan' },
            { param: 'phich-Duration', value: 'normal', color: 'yellow' },
            { param: 'phich-Resource', value: 'one', color: 'cyan' },
            { param: 'systemFrameNumber', value: '254', color: 'yellow' },
            { param: 'schedulingInfoSIB1-BR', value: '0', color: 'cyan' }
          ] : [
            { param: 'PLMN-Identity', value: '310-260', color: 'cyan' },
            { param: 'LAC', value: '1234', color: 'yellow' },
            { param: 'Cell-Identity', value: '12345', color: 'cyan' },
            { param: 'NCC-Permitted', value: '255', color: 'yellow' }
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

  // Route to appropriate renderer based on KPI type
  if (kpiType.includes('Handover Statistics')) {
    return renderHandoverStats()
  } else if (kpiType.includes('UE Capability') || kpiType.includes('Feature Sets')) {
    return renderUECapability()
  } else if (kpiType.includes('SA Information') || kpiType.includes('System Information')) {
    return renderSystemInfo()
  } else {
    return renderMIB()
  }
}
