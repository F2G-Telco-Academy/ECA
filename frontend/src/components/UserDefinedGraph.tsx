import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface UserDefinedGraphProps {
  deviceId: string | null
}

export default function UserDefinedGraph({ deviceId }: UserDefinedGraphProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['RSRP', 'RSRQ', 'SINR'])
  const [chartData, setChartData] = useState<any[]>([])

  const availableMetrics = [
    { id: 'RSRP', name: 'NR_Serv RSRP(Searcher)(P)', color: '#f59e0b' },
    { id: 'RSRQ', name: 'NR_Serv RSRQ(Searcher)(P)', color: '#10b981' },
    { id: 'SINR', name: 'NR_Serv SINR(Searcher)(P)', color: '#3b82f6' },
    { id: 'DL_TP', name: 'DL Throughput', color: '#8b5cf6' },
    { id: 'UL_TP', name: 'UL Throughput', color: '#ec4899' },
  ]

  useEffect(() => {
    if (!deviceId) return

    const fetchData = () => {
      fetch(`/api/kpis/session/${deviceId}`)
        .then(res => res.json())
        .then(data => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            RSRP: data.nr?.ssRsrp || 0,
            RSRQ: data.nr?.ssRsrq || 0,
            SINR: data.nr?.sinr || 0,
            DL_TP: data.throughput?.dl || 0,
            UL_TP: data.throughput?.ul || 0,
          }
          setChartData(prev => [...prev, newPoint].slice(-50))
        })
        .catch(console.error)
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [deviceId])

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    )
  }

  if (!deviceId) {
    return <div className="p-4 text-center text-gray-400">Select a device to view graphs</div>
  }

  return (
    <div className="flex h-full bg-gray-900">
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <div className="text-sm font-bold mb-4">Select Metrics</div>
        {availableMetrics.map(metric => (
          <div key={metric.id} className="mb-2">
            <label className="flex items-center cursor-pointer hover:bg-gray-700 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.id)}
                onChange={() => toggleMetric(metric.id)}
                className="mr-2"
              />
              <span className="text-sm">{metric.name}</span>
            </label>
          </div>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {selectedMetrics.map(metricId => {
          const metric = availableMetrics.find(m => m.id === metricId)
          if (!metric) return null

          return (
            <div key={metricId} className="mb-6 bg-black p-4 rounded">
              <div className="text-sm font-bold mb-2">{metric.name}</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metricId}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>
    </div>
  )
}
