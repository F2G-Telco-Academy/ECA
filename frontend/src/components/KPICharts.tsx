'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface KPIChartsProps {
  sessionId: string | null
}

export default function KPICharts({ sessionId }: KPIChartsProps) {
  const [kpiData, setKpiData] = useState<any[]>([])
  const [selectedMetric, setSelectedMetric] = useState('RSRP')

  useEffect(() => {
    if (!sessionId) return

    const fetchKpis = () => {
      fetch(`http://localhost:8080/api/kpis/session/${sessionId}`)
        .then(res => res.json())
        .then(data => setKpiData(data))
        .catch(console.error)
    }

    fetchKpis()
    const interval = setInterval(fetchKpis, 3000)
    return () => clearInterval(interval)
  }, [sessionId])

  if (!sessionId) {
    return <div className="p-4 text-center text-gray-400">Select a session to view KPIs</div>
  }

  const metrics = ['RSRP', 'RSRQ', 'SINR', 'Throughput']

  return (
    <div className="h-full bg-gray-900 p-4">
      <div className="mb-4 flex gap-2">
        {metrics.map(metric => (
          <button
            key={metric}
            onClick={() => setSelectedMetric(metric)}
            className={`px-3 py-1 rounded text-sm ${
              selectedMetric === metric ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {metric}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={kpiData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="timestamp" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }} />
          <Legend />
          <Line type="monotone" dataKey="avgValue" stroke="#00ff00" name={selectedMetric} />
          <Line type="monotone" dataKey="minValue" stroke="#ff0000" name="Min" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="maxValue" stroke="#0000ff" name="Max" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Min</div>
          <div className="text-xl font-bold text-red-400">
            {kpiData[0]?.minValue || 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Avg</div>
          <div className="text-xl font-bold text-green-400">
            {kpiData[0]?.avgValue || 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Max</div>
          <div className="text-xl font-bold text-blue-400">
            {kpiData[0]?.maxValue || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}
