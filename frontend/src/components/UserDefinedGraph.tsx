import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import type { KpiAggregate } from '@/types'

interface Props {
  sessionId: string | null
}

export default function UserDefinedGraph({ sessionId }: Props) {
  const [aggregates, setAggregates] = useState<KpiAggregate[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['RSRP', 'RSRQ', 'SINR'])
  const [expandedNodes, setExpandedNodes] = useState<{[key: string]: boolean}>({ qualcomm: true, '5gnr': true, pcell: true })

  useEffect(() => {
    if (!sessionId) return
    
    const fetch = async () => {
      try {
        const data = await api.getKpiAggregates(sessionId)
        setAggregates(data)
      } catch (err) {
        console.error('Failed to fetch aggregates:', err)
      }
    }

    fetch()
    const interval = setInterval(fetch, 3000)
    return () => clearInterval(interval)
  }, [sessionId])

  const metrics = [
    { id: 'RSRP', name: 'NR_Serv Cell RSRP(dBm)', color: '#f97316' },
    { id: 'RSRQ', name: 'NR_Serv Cell RSRQ(dB)', color: '#3b82f6' },
    { id: 'SINR', name: 'NR_Serv Cell SINR(dB)', color: '#10b981' },
    { id: 'THROUGHPUT_DL', name: 'NR_DL Throughput(Mbps)', color: '#06b6d4' },
    { id: 'THROUGHPUT_UL', name: 'NR_UL Throughput(Mbps)', color: '#8b5cf6' }
  ]

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    )
  }

  const getMetricData = (metric: string) => {
    return aggregates
      .filter(a => a.metric === metric)
      .map(a => ({ time: new Date(a.windowStart).getTime(), value: a.avgValue }))
      .sort((a, b) => a.time - b.time)
  }

  const renderChart = (metric: string, color: string) => {
    const data = getMetricData(metric)
    if (data.length === 0) return null

    const maxVal = Math.max(...data.map(d => d.value))
    const minVal = Math.min(...data.map(d => d.value))
    const range = maxVal - minVal || 1

    return (
      <div key={metric} className="bg-slate-900 border border-slate-700 h-32">
        <div className="bg-slate-800 px-2 py-1 text-xs font-semibold flex justify-between">
          <span>{metrics.find(m => m.id === metric)?.name}</span>
          <span style={{ color }}>{data[data.length - 1]?.value.toFixed(2)}</span>
        </div>
        <div className="relative h-24 p-2">
          <svg className="w-full h-full">
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100
                const y = 100 - ((d.value - minVal) / range) * 100
                return `${x}%,${y}%`
              }).join(' ')}
            />
          </svg>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return <div className="h-full flex items-center justify-center text-slate-500">Start a session to view graphs</div>
  }

  return (
    <div className="h-full flex">
      <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-auto text-xs">
        <div className="p-2 space-y-1">
          <div className="font-semibold mb-2">Select Metrics</div>
          <div className="pl-2">
            <div className="font-semibold text-slate-400">Qualcomm</div>
            <div className="pl-2">
              <div className="font-semibold text-slate-400">5GNR-Q</div>
              <div className="pl-2">
                <div className="font-semibold text-slate-400">PCell</div>
                <div className="pl-2">
                  <div className="font-semibold text-slate-400">Serving Cell</div>
                  <div className="pl-2 space-y-1">
                    {metrics.map(m => (
                      <label key={m.id} className="flex items-center gap-1 cursor-pointer hover:bg-slate-700 px-1">
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(m.id)}
                          onChange={() => toggleMetric(m.id)}
                        />
                        <span>{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-2 border-t border-slate-700 flex gap-2">
          <button className="flex-1 px-2 py-1 bg-blue-600 rounded text-xs">Add/Edit</button>
          <button className="flex-1 px-2 py-1 bg-slate-700 rounded text-xs">Delete</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {selectedMetrics.map(metric => {
          const m = metrics.find(x => x.id === metric)
          return m ? renderChart(metric, m.color) : null
        })}
      </div>
    </div>
  )
}
