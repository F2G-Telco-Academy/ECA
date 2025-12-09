import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import type { KpiAggregate } from '@/types'

interface Props {
  sessionId: string | null
}

export default function UserDefinedTable({ sessionId }: Props) {
  const [aggregates, setAggregates] = useState<KpiAggregate[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['RSRP', 'RSRQ', 'SINR'])

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

  if (!sessionId) {
    return <div className="h-full flex items-center justify-center text-slate-500">Start a session</div>
  }

  const timeWindows = Array.from(new Set(aggregates.map(a => a.windowStart))).sort().reverse().slice(0, 20)

  return (
    <div className="h-full flex">
      <div className="w-48 bg-slate-800 border-r border-slate-700 overflow-auto text-xs p-2">
        <div className="font-semibold mb-2">Metrics</div>
        {['RSRP', 'RSRQ', 'SINR', 'THROUGHPUT_DL', 'THROUGHPUT_UL'].map(m => (
          <label key={m} className="flex items-center gap-1 mb-1">
            <input
              type="checkbox"
              checked={selectedMetrics.includes(m)}
              onChange={() => {
                setSelectedMetrics(prev =>
                  prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                )
              }}
            />
            <span>{m}</span>
          </label>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-800">
            <tr>
              <th className="px-2 py-1 text-left">Time</th>
              {selectedMetrics.map(m => (
                <th key={m} className="px-2 py-1 text-right">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeWindows.map(time => {
              const row = aggregates.filter(a => a.windowStart === time)
              return (
                <tr key={time} className="border-b border-slate-700">
                  <td className="px-2 py-1">{new Date(time).toLocaleTimeString()}</td>
                  {selectedMetrics.map(m => {
                    const val = row.find(r => r.metric === m)?.avgValue
                    return (
                      <td key={m} className="px-2 py-1 text-right">
                        {val?.toFixed(2) || '-'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
