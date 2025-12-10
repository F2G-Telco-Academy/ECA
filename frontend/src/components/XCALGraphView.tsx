import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/utils/api'

interface GraphConfig {
  id: string
  title: string
  metric: string
  color: string
  unit: string
  yAxisDomain: [number, number]
}

export default function XCALGraphView({ sessionId }: { sessionId: string | null }) {
  const [graphData, setGraphData] = useState<Record<string, any[]>>({})
  const [selectedGraphs, setSelectedGraphs] = useState<string[]>([
    'rsrp', 'rsrq', 'sinr', 'throughput'
  ])

  const availableGraphs: GraphConfig[] = [
    { id: 'rsrp', title: 'NR_Serv Filtered RSRP(Searcher)[P]', metric: 'RSRP', color: '#ff9900', unit: 'dBm', yAxisDomain: [-140, -40] },
    { id: 'rsrq', title: 'NR_Serv PCI(Searcher)[P]', metric: 'RSRQ', color: '#00ff00', unit: 'dB', yAxisDomain: [-20, 0] },
    { id: 'sinr', title: 'NR_ARFCN(Searcher)[P]', metric: 'SINR', color: '#00aaff', unit: 'dB', yAxisDomain: [-10, 30] },
    { id: 'throughput', title: 'NR_Tput Serv PCI(Searcher)[P]', metric: 'Throughput', color: '#ff00ff', unit: 'Mbps', yAxisDomain: [0, 500] },
    { id: 'cqi', title: 'NR_CQI(Searcher)[P]', metric: 'CQI', color: '#ffff00', unit: '', yAxisDomain: [0, 15] },
    { id: 'mcs', title: 'NR_MCS(Searcher)[P]', metric: 'MCS', color: '#ff0000', unit: '', yAxisDomain: [0, 28] },
    { id: 'bler', title: 'NR_BLER(Searcher)[P]', metric: 'BLER', color: '#00ffff', unit: '%', yAxisDomain: [0, 100] },
    { id: 'pci', title: 'NR_PCI(Searcher)[P]', metric: 'PCI', color: '#ff6600', unit: '', yAxisDomain: [0, 1007] }
  ]

  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const kpis = await api.getKpis(sessionId)
        const timestamp = new Date().toLocaleTimeString()
        
        setGraphData(prev => {
          const newData = { ...prev }
          selectedGraphs.forEach(graphId => {
            if (!newData[graphId]) newData[graphId] = []
            
            let value = 0
            switch (graphId) {
              case 'rsrp': value = kpis.rsrp || -100; break
              case 'rsrq': value = kpis.rsrq || -10; break
              case 'sinr': value = kpis.sinr || 0; break
              case 'throughput': value = kpis.throughput?.dl || 0; break
              case 'cqi': value = (kpis as any).cqi || 0; break
              case 'mcs': value = (kpis as any).mcs || 0; break
              case 'bler': value = (kpis as any).bler || 0; break
              default: value = 0
            }
            
            newData[graphId] = [...newData[graphId], { timestamp, value }].slice(-100)
          })
          return newData
        })
      } catch (err) {
        console.error('Failed to fetch graph data:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, selectedGraphs])

  const getCurrentValue = (graphId: string) => {
    const data = graphData[graphId]
    return data && data.length > 0 ? data[data.length - 1].value : 0
  }

  const toggleGraph = (graphId: string) => {
    setSelectedGraphs(prev =>
      prev.includes(graphId)
        ? prev.filter(id => id !== graphId)
        : [...prev, graphId]
    )
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Legend Bar */}
      <div className="flex items-center gap-1 px-4 py-2 bg-gray-800 border-b border-gray-700 overflow-x-auto">
        {availableGraphs.map(graph => (
          <button
            key={graph.id}
            onClick={() => toggleGraph(graph.id)}
            className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-all ${
              selectedGraphs.includes(graph.id)
                ? 'opacity-100'
                : 'opacity-40 hover:opacity-60'
            }`}
            style={{
              backgroundColor: selectedGraphs.includes(graph.id) ? graph.color : '#4a5568',
              color: '#000'
            }}
          >
            {graph.metric}
          </button>
        ))}
      </div>

      {/* Graphs Container */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Graphs */}
          <div className="flex-1">
            {selectedGraphs.map(graphId => {
              const config = availableGraphs.find(g => g.id === graphId)
              if (!config) return null

              return (
                <div key={graphId} className="border-b border-gray-800" style={{ height: '200px' }}>
                  <div className="h-full bg-black p-2">
                    <div className="text-xs text-gray-400 mb-1">{config.title}</div>
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={graphData[graphId] || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                          dataKey="timestamp"
                          stroke="#666"
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#666"
                          tick={{ fontSize: 10 }}
                          domain={config.yAxisDomain}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #444',
                            borderRadius: '4px'
                          }}
                          labelStyle={{ color: '#aaa' }}
                          itemStyle={{ color: config.color }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={config.color}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Value Indicators */}
          <div className="w-20 bg-gray-800 border-l border-gray-700">
            {selectedGraphs.map(graphId => {
              const config = availableGraphs.find(g => g.id === graphId)
              if (!config) return null
              const value = getCurrentValue(graphId)

              return (
                <div
                  key={graphId}
                  className="flex items-center justify-center text-white font-bold border-b border-gray-700"
                  style={{
                    height: '200px',
                    backgroundColor: config.color,
                    color: '#000'
                  }}
                >
                  <div className="text-center">
                    <div className="text-xs opacity-70">Value</div>
                    <div className="text-lg">{value.toFixed(2)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center gap-2">
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
          Add Graph
        </button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
          Remove Graph
        </button>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
          Export Data
        </button>
        <div className="ml-auto text-xs text-gray-400">
          {selectedGraphs.length} graph(s) active
        </div>
      </div>
    </div>
  )
}
