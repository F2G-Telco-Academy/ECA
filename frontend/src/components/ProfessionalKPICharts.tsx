'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ProfessionalKPICharts({ sessionId }: { sessionId: string | null }) {
  const [data, setData] = useState<any[]>([])
  const [metric, setMetric] = useState('RSRP')
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')

  useEffect(() => {
    if (!sessionId) return
    const interval = setInterval(() => {
      fetch(`http://localhost:8080/api/kpis/session/${sessionId}`)
        .then(res => res.json())
        .then(d => setData(d.slice(-100)))
        .catch(console.error)
    }, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const metrics = ['RSRP', 'RSRQ', 'SINR', 'Throughput DL', 'Throughput UL', 'CQI', 'MCS', 'BLER']

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-gray-900 border border-gray-600 p-2 rounded shadow-lg">
        <p className="text-xs text-gray-400">{payload[0].payload.timestamp}</p>
        <p className="text-sm text-white font-bold">{payload[0].value.toFixed(2)} dBm</p>
      </div>
    )
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff00" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#00ff00" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="timestamp" stroke="#666" tick={{ fontSize: 10 }} />
          <YAxis stroke="#666" tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="avgValue" stroke="#00ff00" fillOpacity={1} fill="url(#colorValue)" name={metric} />
        </AreaChart>
      )
    }

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="timestamp" stroke="#666" tick={{ fontSize: 10 }} />
          <YAxis stroke="#666" tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="avgValue" fill="#00ff00" name={metric} />
        </BarChart>
      )
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="timestamp" stroke="#666" tick={{ fontSize: 10 }} />
        <YAxis stroke="#666" tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="avgValue" stroke="#00ff00" strokeWidth={2} dot={false} name={metric} />
        <Line type="monotone" dataKey="minValue" stroke="#ff0000" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Min" />
        <Line type="monotone" dataKey="maxValue" stroke="#0000ff" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Max" />
      </LineChart>
    )
  }

  return (
    <div className="h-full bg-black text-white flex flex-col">
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
        <div className="flex gap-2">
          {metrics.map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 rounded text-xs ${metric === m ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setChartType('line')} className={`px-2 py-1 rounded text-xs ${chartType === 'line' ? 'bg-blue-600' : 'bg-gray-700'}`}>Line</button>
          <button onClick={() => setChartType('area')} className={`px-2 py-1 rounded text-xs ${chartType === 'area' ? 'bg-blue-600' : 'bg-gray-700'}`}>Area</button>
          <button onClick={() => setChartType('bar')} className={`px-2 py-1 rounded text-xs ${chartType === 'bar' ? 'bg-blue-600' : 'bg-gray-700'}`}>Bar</button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-900 border-t border-gray-700">
        <div className="text-center">
          <div className="text-xs text-gray-400">Current</div>
          <div className="text-2xl font-bold text-green-400">{data[data.length - 1]?.avgValue?.toFixed(2) || 'N/A'}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Min</div>
          <div className="text-2xl font-bold text-red-400">{Math.min(...data.map(d => d.minValue || 0)).toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Avg</div>
          <div className="text-2xl font-bold text-yellow-400">{(data.reduce((a, b) => a + (b.avgValue || 0), 0) / data.length).toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Max</div>
          <div className="text-2xl font-bold text-blue-400">{Math.max(...data.map(d => d.maxValue || 0)).toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}
