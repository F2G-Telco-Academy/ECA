import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
  checked?: boolean
}

interface TableColumn {
  key: string
  label: string
  width?: number
}

export default function UserDefinedTable({ sessionId }: { sessionId: string | null }) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [tableData, setTableData] = useState<any[]>([])
  const [timestamp, setTimestamp] = useState('')

  useEffect(() => {
    // Initialize tree structure matching xcal
    const initialTree: TreeNode[] = [
      {
        id: 'qualcomm',
        label: 'Qualcomm',
        checked: false,
        children: [
          {
            id: '5gnr-q',
            label: '5GNR-Q',
            checked: false,
            children: [
              { id: 'pcell', label: 'PCell', checked: false },
              { id: 'nr_arfcn_searcher', label: 'NR_ARFCN(Searcher)', checked: false },
              { id: 'nr_raster_freq_searcher', label: 'NR_Raster Freq(Searcher)', checked: false },
              { id: 'nr_serving_cell_beam_info', label: 'NR_Serving Cell Beam Info', checked: false },
              { id: 'nr_ml1_searcher_measure', label: 'NR_ML1 Searcher Measure', checked: false }
            ]
          },
          {
            id: 'serving-cell',
            label: 'Serving Cell',
            checked: false,
            children: [
              { id: 'nr_serv_pcell', label: 'NR_Serv PCell(Searcher)', checked: false },
              { id: 'nr_serv_ssb_beam', label: 'NR_Serv SSB Beam Info', checked: false },
              { id: 'nr_serv_rx_beam', label: 'NR_Serv Rx Beam Info', checked: false },
              { id: 'nr_serv_rx_beam_1', label: 'NR_Serv Rx Beam Info 1', checked: false },
              { id: 'nr_serv_instant_bf', label: 'NR_Serv Instant BF', checked: false },
              { id: 'nr_serv_instant_bf_1', label: 'NR_Serv Instant BF 1', checked: false },
              { id: 'nr_serv_filtered_bf', label: 'NR_Serv Filtered BF', checked: false },
              { id: 'nr_serv_filtered_bf_1', label: 'NR_Serv Filtered BF 1', checked: false },
              { id: 'nr_serv_filtered_sa', label: 'NR_Serv Filtered SA', checked: false }
            ]
          },
          {
            id: 'detected-tx-beams',
            label: 'Detected Tx Beams',
            checked: false
          },
          {
            id: 'neighbor-cell',
            label: 'Neighbor Cell',
            checked: false,
            children: [
              { id: 'scell1', label: 'SCell1', checked: false },
              { id: 'scell2', label: 'SCell2', checked: false },
              { id: 'scell3', label: 'SCell3', checked: false },
              { id: 'scell4', label: 'SCell4', checked: false },
              { id: 'scell5', label: 'SCell5', checked: false },
              { id: 'scell6', label: 'SCell6', checked: false },
              { id: 'scell7', label: 'SCell7', checked: false }
            ]
          },
          {
            id: 'scs-pcell',
            label: 'SCS PCell',
            checked: false
          },
          {
            id: 'scs-scell',
            label: 'SCS SCell',
            checked: false,
            children: [
              { id: 'scs_scell1', label: 'SCS SCell1', checked: false },
              { id: 'scs_scell2', label: 'SCS SCell2', checked: false },
              { id: 'scs_scell3', label: 'SCS SCell3', checked: false },
              { id: 'scs_scell4', label: 'SCS SCell4', checked: false },
              { id: 'scs_scell5', label: 'SCS SCell5', checked: false },
              { id: 'scs_scell6', label: 'SCS SCell6', checked: false },
              { id: 'scs_scell7', label: 'SCS SCell7', checked: false }
            ]
          }
        ]
      },
      {
        id: 'pcell',
        label: 'PCell',
        checked: false
      },
      {
        id: '5gcell',
        label: '5GCell',
        checked: false
      },
      {
        id: '5gcell2',
        label: '5GCell2',
        checked: false
      },
      {
        id: '5gcell3',
        label: '5GCell3',
        checked: false
      },
      {
        id: '5gcell4',
        label: '5GCell4',
        checked: false
      },
      {
        id: '5gcell5',
        label: '5GCell5',
        checked: false
      },
      {
        id: '5gcell6',
        label: '5GCell6',
        checked: false
      },
      {
        id: '5gcell7',
        label: '5GCell7',
        checked: false
      },
      {
        id: 'nr_ml1_afc_services',
        label: 'NR_ML1 AFC Services',
        checked: false
      },
      {
        id: 'nr_ll1_serving_freq_track',
        label: 'NR_LL1 Serving Freq Track',
        checked: false
      }
    ]
    
    setTreeData(initialTree)
    setExpandedNodes(new Set(['qualcomm', '5gnr-q']))
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const fetchTableData = async () => {
      try {
        const data = await api.getRecords(sessionId, { page: 0, size: 50 })
        setTableData(data.content || [])
        setTimestamp(new Date().toLocaleTimeString())
      } catch (err) {
        console.error('Failed to fetch table data:', err)
      }
    }

    fetchTableData()
    const interval = setInterval(fetchTableData, 2000)
    return () => clearInterval(interval)
  }, [sessionId, selectedColumns])

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const toggleCheck = (nodeId: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(nodeId)) {
        return prev.filter(id => id !== nodeId)
      } else {
        return [...prev, nodeId]
      }
    })
  }

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.id)
      const hasChildren = node.children && node.children.length > 0
      const isChecked = selectedColumns.includes(node.id)

      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 py-1 px-2 hover:bg-gray-700 cursor-pointer"
            style={{ paddingLeft: `${8 + level * 16}px` }}
          >
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="w-4 h-4 flex items-center justify-center text-xs"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleCheck(node.id)}
              className="w-4 h-4"
            />
            <span className="text-sm">{node.label}</span>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderTree(node.children!, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  const columns: TableColumn[] = [
    { key: 'time', label: 'Time', width: 120 },
    { key: 'nr_arfcn', label: 'NR_ARFCN(Searcher)(P)', width: 150 },
    { key: 'nr_serv_pcell', label: 'NR_Serv PCell(Searcher)(P)', width: 180 },
    { key: 'nr_serv_filtered_bf', label: 'NR_Serv Filtered BF(Searcher)(P)', width: 200 }
  ]

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Left Tree Panel */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-3 bg-gray-700 border-b border-gray-600">
          <div className="text-sm font-semibold mb-2">Message Filter</div>
          <div className="flex gap-2 mb-2">
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">
              Filtering
            </button>
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">
              Filtering 2
            </button>
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">
              Pause
            </button>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">
              Export
            </button>
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">
              Hex
            </button>
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">
              Vertically
            </button>
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2">
          <div className="mb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" />
              <span>Show SIP</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" />
              <span>Free Size</span>
            </label>
          </div>
          {renderTree(treeData)}
        </div>

        <div className="p-2 bg-gray-700 border-t border-gray-600 flex gap-2">
          <button className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">
            Add/Edit
          </button>
          <button className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs">
            Del
          </button>
        </div>
      </div>

      {/* Right Table Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-400">Time: </span>
            <span className="font-mono">{timestamp}</span>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              Find
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">
              String Color Setting
            </button>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" className="w-4 h-4" />
              <span>Detail</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" className="w-4 h-4" />
              <span>Show Clipped Time</span>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-700 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="text-left p-2 border-r border-gray-600 font-semibold"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-gray-800 hover:bg-gray-750 ${
                    idx % 2 === 0 ? 'bg-gray-850' : 'bg-gray-900'
                  }`}
                >
                  <td className="p-2 border-r border-gray-800 font-mono text-xs">
                    {row.timestamp || '09:04:20'}
                  </td>
                  <td className="p-2 border-r border-gray-800">{row.arfcn || '396370'}</td>
                  <td className="p-2 border-r border-gray-800">{row.pcell || '62'}</td>
                  <td className="p-2">{row.filtered || '-104.44'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
