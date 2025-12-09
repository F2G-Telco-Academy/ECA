import { useState, useEffect } from 'react'

interface Props {
  sessionId: string | null
  type: 'MIB' | 'SIB1' | 'UE_CAPABILITY'
}

export default function FiveGNRInfo({ sessionId, type }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    
    const fetch = async () => {
      setLoading(true)
      try {
        const endpoint = type === 'MIB' ? 'mib' : type === 'SIB1' ? 'sib1' : 'ue-capability'
        const res = await window.fetch(`http://localhost:8080/api/5gnr/session/${sessionId}/${endpoint}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch 5GNR info:', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [sessionId, type])

  if (!sessionId) {
    return <div className="h-full flex items-center justify-center text-slate-500">Start a session to view 5GNR data</div>
  }

  if (loading && !data) {
    return <div className="h-full flex items-center justify-center text-slate-500">Loading...</div>
  }

  if (type === 'MIB') {
    return (
      <div className="p-4 space-y-2 text-sm">
        <div className="text-lg font-bold mb-4">5GNR Information (MIB)</div>
        <table className="w-full">
          <tbody>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">Time Stamp</td>
              <td className="py-2">{new Date().toLocaleTimeString()}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">systemFrameNumber</td>
              <td className="py-2">{data?.systemFrameNumber || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">subCarrierSpacingCommon</td>
              <td className="py-2">{data?.subCarrierSpacingCommon || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">ssb-SubcarrierOffset</td>
              <td className="py-2">{data?.ssbSubcarrierOffset || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">dmrs-TypeA-Position</td>
              <td className="py-2">{data?.dmrsTypeAPosition || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">pdcch-ConfigSIB1</td>
              <td className="py-2">{data?.pdcchConfigSIB1 || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">cellBarred</td>
              <td className="py-2">{data?.cellBarred || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">intraFreqReselection</td>
              <td className="py-2">{data?.intraFreqReselection || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'SIB1') {
    return (
      <div className="p-4 space-y-2 text-sm">
        <div className="text-lg font-bold mb-4">5GNR SIB Information (SIB1)</div>
        <table className="w-full">
          <tbody>
            <tr className="bg-slate-800">
              <td className="py-2 px-2 font-semibold" colSpan={3}>DL Config / UL Config</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">Frequency Band</td>
              <td className="py-2">{data?.frequencyBand || 'N/A'}</td>
              <td className="py-2">-</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">SCS</td>
              <td className="py-2">{data?.scs || 'N/A'}</td>
              <td className="py-2">-</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">Bandwidth</td>
              <td className="py-2">{data?.bandwidth || 'N/A'}</td>
              <td className="py-2">-</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">p-Max</td>
              <td className="py-2">{data?.pMax || 'N/A'}</td>
              <td className="py-2">-</td>
            </tr>
            <tr className="bg-slate-800">
              <td className="py-2 px-2 font-semibold" colSpan={3}>Serving Cell Config</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">Serving PCI</td>
              <td className="py-2" colSpan={2}>{data?.physCellId || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">EARFCN</td>
              <td className="py-2" colSpan={2}>{data?.absoluteFrequencySSB || 'N/A'}</td>
            </tr>
            <tr className="bg-slate-800">
              <td className="py-2 px-2 font-semibold" colSpan={3}>PLMN Identity List</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">MCC / MNC</td>
              <td className="py-2">{data?.mcc || 'N/A'}</td>
              <td className="py-2">{data?.mnc || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">Tracking Area Code</td>
              <td className="py-2" colSpan={2}>{data?.trackingAreaCode || 'N/A'}</td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-2 text-slate-400">Global Cell Identity</td>
              <td className="py-2" colSpan={2}>{data?.cellIdentity || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="p-4 text-sm">
      <div className="text-lg font-bold mb-4">5GNR UE Capability</div>
      <pre className="text-xs text-slate-300 whitespace-pre-wrap">{data?.raw || 'No data available'}</pre>
    </div>
  )
}
