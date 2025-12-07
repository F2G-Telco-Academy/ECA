import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

interface Graph {
  id: string
  name: string
  color: string
  data: number[]
  currentValue: number
}

export default function MultiGraphView({ sessionId }: { sessionId: string | null }) {
  const [graphs, setGraphs] = useState<Graph[]>([
    { id: '1', name: 'NR_ARFCN[Searcher][P]', color: '#00ff00', data: [], currentValue: 396970 },
    { id: '2', name: 'NR_Serv PCI[Searcher][P]', color: '#ff00ff', data: [], currentValue: 82 },
    { id: '3', name: 'NR_Serv Filtered RSRP[Searcher][P]', color: '#00ffff', data: [], currentValue: -104.27 },
    { id: '4', name: 'NR_Tput Merg Filtered RSRP[Searcher][P]', color: '#ffff00', data: [], currentValue: 57 }
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setGraphs(prev => prev.map(g => ({
        ...g,
        data: [...g.data, Math.random() * 100].slice(-50),
        currentValue: g.currentValue + (Math.random() - 0.5) * 10
      })))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex bg-black text-white">
      {/* Graph Selection Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
        <div className="p-2 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search graphs..."
            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs"
          />
        </div>
        <div className="p-2">
          {['NR_ARFCN', 'NR_Serv PCI', 'NR_Rx Path', 'NR_Tx Path', 'RSRP Rx Path', 'RSRQ Rx Path'].map(item => (
            <div key={item} className="py-1 px-2 hover:bg-gray-800 cursor-pointer text-xs">
              {item}[Searcher][P]
            </div>
          ))}
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col">
        {/* Color Legend */}
        <div className="flex gap-2 p-2 bg-gray-900 border-b border-gray-700 text-xs overflow-x-auto">
          <span className="px-2 py-1 bg-green-600 rounded">Green</span>
          <span className="px-2 py-1 bg-pink-600 rounded">Panda</span>
          <span className="px-2 py-1 bg-purple-600 rounded">Magenta</span>
          <span className="px-2 py-1 bg-cyan-600 rounded">Athena</span>
          <span className="px-2 py-1 bg-cyan-400 rounded">Cyan</span>
          <span className="px-2 py-1 bg-red-600 rounded">Red</span>
          <span className="px-2 py-1 bg-blue-600 rounded">Blue</span>
          <span className="px-2 py-1 bg-yellow-600 rounded">PLTE</span>
        </div>

        {/* Graphs with Value Indicators */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {graphs.map(graph => (
              <div key={graph.id} className="h-48 border-b border-gray-800">
                <div className="px-2 py-1 text-xs text-gray-400">{graph.name}</div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={graph.data.map((v, i) => ({ value: v, index: i }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="index" stroke="#666" hide />
                    <YAxis stroke="#666" />
                    <Line type="monotone" dataKey="value" stroke={graph.color} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>

          {/* Value Indicators on Right */}
          <div className="w-24 bg-gray-900 border-l border-gray-700">
            {graphs.map(graph => (
              <div key={graph.id} className="h-48 border-b border-gray-800 flex flex-col justify-center items-center">
                <div className="w-16 bg-orange-500 text-center py-1 rounded text-xs font-bold">
                  {typeof graph.currentValue === 'number' ? graph.currentValue.toFixed(2) : graph.currentValue}
                </div>
                <div className="text-xs text-gray-500 mt-1">Value</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
