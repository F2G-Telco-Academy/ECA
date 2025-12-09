import { KpiData } from '@/types'

interface RFWidgetProps {
  kpiData: KpiData | null
}

export default function RFWidget({ kpiData }: RFWidgetProps) {
  if (!kpiData) return null

  return (
    <div className="bg-slate-800 border border-slate-700 text-xs">
      <div className="bg-slate-700 px-2 py-1 font-semibold">RF Measurement</div>
      
      <div className="p-2 space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-400">UE State</span>
          <span className="text-green-400">{kpiData.ueState || 'N/A'}</span>
        </div>
        
        <div className="bg-slate-900 p-2 rounded">
          <div className="text-slate-400 mb-1">Current Throughput</div>
          <div className="flex justify-between text-xs">
            <div>
              <div className="text-slate-500">DL</div>
              <div className="text-cyan-400">{kpiData.throughput?.dl?.toFixed(1) || '0'}</div>
            </div>
            <div>
              <div className="text-slate-500">UL</div>
              <div className="text-purple-400">{kpiData.throughput?.ul?.toFixed(1) || '0'}</div>
            </div>
          </div>
        </div>

        {kpiData.rat === 'LTE' && (
          <div className="bg-slate-900 p-2 rounded">
            <div className="text-green-400 mb-1">LTE</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">RSRP</span>
                <span>{kpiData.rsrp?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RSRQ</span>
                <span>{kpiData.rsrq?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SINR</span>
                <span>{kpiData.sinr?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {kpiData.rat === 'NR' && (
          <div className="bg-slate-900 p-2 rounded">
            <div className="text-red-400 mb-1">5GNR</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">SS-RSRP</span>
                <span>{kpiData.rsrp?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SS-RSRQ</span>
                <span>{kpiData.rsrq?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SINR</span>
                <span>{kpiData.sinr?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
