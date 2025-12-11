import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
  checked?: boolean
  color?: string
}

export default function XCALGraphView({ sessionId }: { sessionId: string | null }) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['qualcomm', '5gnr-q', 'serving-cell']))
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['nr_serv_filtered_bf'])
  const [graphData, setGraphData] = useState<Record<string, any[]>>({})
  const [maxValue, setMaxValue] = useState(420000)
  const [minValue, setMinValue] = useState(196000)

  useEffect(() => {
    const initialTree: TreeNode[] = [
      {
        id: 'qualcomm', label: 'Qualcomm', checked: false,
        children: [
          {
            id: '5gnr-q', label: '5GNR-Q', checked: false,
            children: [
              { id: 'pcell', label: 'PCell', checked: false },
              { id: 'nr_arfcn_searcher', label: 'NR_ARFCN(Searcher)(P)', checked: false, color: '#00ff00' },
              { id: 'nr_raster_freq', label: 'NR_Raster Freq(Searcher)', checked: false },
              { id: 'nr_gscn', label: 'NR_GSCN(Searcher)(P)', checked: false }
            ]
          },
          {
            id: 'serving-cell', label: 'Serving Cell', checked: false,
            children: [
              { id: 'nr_serv_pcell', label: 'NR_Serv PCell(Searcher)', checked: false, color: '#ff00ff' },
              { id: 'nr_serv_ssb_beam', label: 'NR_Serv SSB Beam Info', checked: false },
              { id: 'nr_serv_rx_beam', label: 'NR_Serv Rx Beam Info', checked: false },
              { id: 'nr_serv_instant_bf', label: 'NR_Serv Instant BF(Searcher)(P)', checked: false, color: '#00ffff' },
              { id: 'nr_serv_filtered_bf', label: 'NR_Serv Filtered BF(Searcher)(P)', checked: true, color: '#ff8800' }
            ]
          },
          { id: 'detected_tx', label: 'Detected Tx Beams', checked: false },
          {
            id: 'neighbor-cell', label: 'Neighbor Cell', checked: false,
            children: Array.from({ length: 7 }, (_, i) => ({ id: `scell${i + 1}`, label: `SCell${i + 1}`, checked: false }))
          }
        ]
      }
    ]
    setTreeData(initialTree)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    const fetchData = async () => {
      const newData: Record<string, any[]> = {}
      selectedMetrics.forEach(metric => {
        newData[metric] = Array.from({ length: 150 }, (_, i) => ({
          x: i,
          value: metric === 'nr_serv_filtered_bf' ? 380000 + Math.sin(i / 10) * 15000 : 62 + Math.random() * 2
        }))
      })
      setGraphData(newData)
    }
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [sessionId, selectedMetrics])

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId)
      return next
    })
  }

  const toggleCheck = (node: TreeNode) => {
    setSelectedMetrics(prev => 
      prev.includes(node.id) ? prev.filter(m => m !== node.id) : [...prev, node.id]
    )
  }

  const renderTree = (nodes: TreeNode[], level = 0): any => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.id)
      const hasChildren = node.children && node.children.length > 0
      const isChecked = selectedMetrics.includes(node.id)

      return (
        <div key={node.id}>
          <div className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-700 cursor-pointer ${isChecked ? 'bg-blue-900' : ''}`} style={{ paddingLeft: `${8 + level * 16}px` }}>
            {hasChildren ? (
              <button onClick={() => toggleNode(node.id)} className="w-4 h-4 flex items-center justify-center text-xs">{isExpanded ? '▼' : '▶'}</button>
            ) : <div className="w-4" />}
            <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(node)} className="w-4 h-4" />
            <span className="text-sm">{node.label}</span>
          </div>
          {hasChildren && isExpanded && <div>{renderTree(node.children!, level + 1)}</div>}
        </div>
      )
    })
  }

  const getNodeColor = (nodeId: string): string => {
    const colors: Record<string, string> = {
      nr_serv_filtered_bf: '#ff8800',
      nr_serv_pcell: '#ff00ff',
      nr_arfcn_searcher: '#00ff00',
      nr_serv_instant_bf: '#00ffff'
    }
    return colors[nodeId] || '#ffffff'
  }

  return (
    <div className="h-full flex bg-gray-900 text-white">
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-3 bg-gray-700 border-b border-gray-600 flex gap-2">
          <button className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs">Resume</button>
          <button className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs">Pause</button>
          <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">Clear</button>
        </div>
        <div className="flex-1 overflow-auto p-2">{renderTree(treeData)}</div>
        <div className="p-2 bg-gray-700 border-t border-gray-600">
          <div className="text-xs">
            <label className="block mb-1 font-semibold">NR_Serv Filtered BF(Searcher)</label>
            <div className="flex gap-2 items-center mb-1">
              <span className="w-16">Maximum</span>
              <input type="number" value={maxValue} onChange={(e) => setMaxValue(Number(e.target.value))} className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-xs" />
              <button className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">Auto</button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="w-16">Minimum</span>
              <input type="number" value={minValue} onChange={(e) => setMinValue(Number(e.target.value))} className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-xs" />
              <button className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">Apply</button>
            </div>
          </div>
        </div>
        <div className="p-2 bg-gray-700 border-t border-gray-600 flex gap-2">
          <button className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">Add/Edit</button>
          <button className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs">Del</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        <div className="p-2 bg-gray-800 border-b border-gray-700 flex gap-1 items-center flex-wrap">
          {['Resume', 'Pause', 'Clear', 'Hex', 'Vertically', 'Clear'].map(btn => (
            <button key={btn} className="px-2 py-1 text-xs" style={{ backgroundColor: btn === 'Resume' ? '#00ff00' : btn === 'Pause' ? '#ff00ff' : btn === 'Clear' ? '#ffff00' : '#808080' }}>{btn}</button>
          ))}
        </div>
        <div className="flex-1 relative">
          {selectedMetrics.map(metric => {
            const data = graphData[metric] || []
            const color = getNodeColor(metric)
            return (
              <div key={metric} className="absolute inset-0">
                <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="0" y2="400" stroke="#444" strokeWidth="1" />
                  <line x1="0" y1="400" x2="1200" y2="400" stroke="#444" strokeWidth="1" />
                  {data.length > 1 && (
                    <polyline
                      points={data.map((p, i) => {
                        const x = (i / data.length) * 1200
                        const y = 400 - ((p.value - minValue) / (maxValue - minValue)) * 380
                        return `${x},${y}`
                      }).join(' ')}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}
                </svg>
              </div>
            )
          })}
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 p-2 text-xs">
            <div className="font-mono">Value: {selectedMetrics.length > 0 && graphData[selectedMetrics[0]]?.[graphData[selectedMetrics[0]].length - 1]?.value.toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
