import { useState, useEffect } from 'react'

interface Props {
  sessionId: number | null
}

export default function UserDefinedGraphs({ sessionId }: Props) {
  const [graphs, setGraphs] = useState([
    { id: 1, title: 'NR_ARFCN Searcher[P]', value: 396970, color: 'orange' },
    { id: 2, title: 'NR_Serv PCI Searcher[P]', value: 82, color: 'orange' },
    { id: 3, title: 'NR_Serv Filtered RSRP Searcher[P]', value: -104.27, color: 'orange' },
    { id: 4, title: 'NR_Tput Avg PCI Searcher[P]', value: 57, color: 'orange' }
  ])

  return (
    <div className="h-full bg-black text-white flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
        <div className="flex gap-1">
          <button className="px-2 py-1 bg-green-600 text-xs">Normal</button>
          <button className="px-2 py-1 bg-purple-600 text-xs">Pending</button>
          <button className="px-2 py-1 bg-pink-600 text-xs">Magenta</button>
          <button className="px-2 py-1 bg-blue-600 text-xs">Athena</button>
          <button className="px-2 py-1 bg-cyan-600 text-xs">Cyan</button>
          <button className="px-2 py-1 bg-red-600 text-xs">Red</button>
          <button className="px-2 py-1 bg-yellow-600 text-xs">Duo</button>
          <button className="px-2 py-1 bg-gray-600 text-xs">PLTE</button>
        </div>
      </div>

      {/* Graph Grid */}
      <div className="flex-1 grid grid-rows-4 gap-px bg-gray-800">
        {graphs.map((graph, idx) => (
          <div key={graph.id} className="bg-gray-900 flex">
            {/* Graph Area */}
            <div className="flex-1 relative">
              <svg className="w-full h-full">
                {/* Grid lines */}
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#333" strokeWidth="1" />
                <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#333" strokeWidth="1" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#333" strokeWidth="1" />
                <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#333" strokeWidth="1" />
                
                {/* Sample data line */}
                <polyline
                  points="0,80 100,70 200,60 300,65 400,55 500,50 600,45 700,50 800,55 900,60 1000,65"
                  fill="none"
                  stroke={graph.color}
                  strokeWidth="2"
                />
              </svg>
              
              {/* Graph Title */}
              <div className="absolute top-2 left-2 text-xs text-gray-400">
                {graph.title}
              </div>
            </div>

            {/* Value Display */}
            <div className="w-24 bg-orange-600 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs text-white opacity-75">Value</div>
                <div className="text-lg font-bold">{graph.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
