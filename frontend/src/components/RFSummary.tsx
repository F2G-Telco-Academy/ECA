import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

export default function RFSummary({ sessionId }: { sessionId: string | null }) {
  const [data, setData] = useState<any>({})
  const [activeTab, setActiveTab] = useState<'LTE' | '5GNR'>('5GNR')

  useEffect(() => {
    if (!sessionId) return
    const fetchData = async () => {
      try {
        const kpis = await api.getKpis(sessionId)
        setData(kpis)
      } catch (err) {
        console.error('Failed to fetch RF data:', err)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [sessionId])

  const cells = ['PCell', 'SCell1', 'SCell2', 'SCell3', 'SCell4', 'SCell5', 'SCell6', 'SCell7']

  return (
    <div className="h-full flex bg-black text-white">
      {/* Left Panel - UE State & Throughput */}
      <div className="w-64 border-r border-gray-700 p-4">
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-1">UE State</div>
          <div className="text-2xl font-bold text-green-400">{activeTab}</div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Current Throughput</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs">Mbps</span>
            <span className="text-xs">Gbps</span>
            <span className="ml-auto">⟳</span>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-800 rounded p-3 mb-3">
          <div className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
            <span>Total</span>
            <span className="text-green-400">↑</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">DL</div>
              <div className="text-2xl font-bold text-green-400">0</div>
              <div className="text-gray-400">Mbps</div>
            </div>
            <div>
              <div className="text-gray-400">UL</div>
              <div className="text-2xl font-bold text-green-400">0</div>
              <div className="text-gray-400">Mbps</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div>
              <div className="text-gray-400">Peak</div>
              <div>0 Mbps</div>
            </div>
            <div>
              <div className="text-gray-400">Peak</div>
              <div>0 Mbps</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
            <div>
              <div className="text-gray-400">Avg</div>
              <div>0 Mbps</div>
            </div>
            <div>
              <div className="text-gray-400">Avg</div>
              <div>0 Mbps</div>
            </div>
          </div>
        </div>

        {/* LTE */}
        <div className="bg-gray-800 rounded p-3 mb-3">
          <div className="text-blue-400 font-bold mb-2 flex items-center gap-2">
            <span>LTE</span>
            <span className="text-blue-300">📶</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">DL</div>
              <div className="text-xl font-bold">0</div>
              <div className="text-gray-400">Mbps</div>
            </div>
            <div>
              <div className="text-gray-400">UL</div>
              <div className="text-xl font-bold">0</div>
              <div className="text-gray-400">Mbps</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div><span className="text-gray-400">Peak</span> 0 Mbps</div>
            <div><span className="text-gray-400">Peak</span> 0 Mbps</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
            <div><span className="text-gray-400">Avg</span> 0 Mbps</div>
            <div><span className="text-gray-400">Avg</span> 0 Mbps</div>
          </div>
        </div>

        {/* 5GNR */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-red-400 font-bold mb-2 flex items-center gap-2">
            <span>5GNR</span>
            <span className="text-red-300">📡</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">DL</div>
              <div className="text-xl font-bold">0</div>
              <div className="text-gray-400">Mbps</div>
            </div>
            <div>
              <div className="text-gray-400">UL</div>
              <div className="text-xl font-bold">0</div>
              <div className="text-gray-400">Mbps</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div><span className="text-gray-400">Peak</span> 0 Mbps</div>
            <div><span className="text-gray-400">Peak</span> 0 Mbps</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
            <div><span className="text-gray-400">Avg</span> 0 Mbps</div>
            <div><span className="text-gray-400">Avg</span> 0 Mbps</div>
          </div>
        </div>
      </div>

      {/* Right Panel - RF Measurements */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xl">ⓘ</div>
              <h2 className="text-2xl font-bold">RF Measurement Summary</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold">RF Measurement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">Battery Temperature:</span>
              <span className="text-white">31.46 (°C)</span>
              <span className="text-white">88.52 (°F)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Thermal Status:</span>
              <span className="text-white">NONE</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button onClick={() => setActiveTab('LTE')} className={`px-6 py-2 font-semibold ${activeTab === 'LTE' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            <span className="flex items-center gap-2">
              <span className="text-blue-300">📶</span>
              <span>LTE</span>
            </span>
          </button>
          <button onClick={() => setActiveTab('5GNR')} className={`px-6 py-2 font-semibold ${activeTab === '5GNR' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            <span className="flex items-center gap-2">
              <span className="text-red-300">📡</span>
              <span>5GNR</span>
            </span>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="text-left p-3 border-r border-gray-700 w-48"></th>
                {cells.map(cell => (
                  <th key={cell} className="text-center p-3 border-r border-gray-700 font-semibold">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Serving PCI', values: ['82', '', '', '', '', '', '', ''] },
                { label: 'EARFCN', values: ['', '', '', '', '', '', '', ''] },
                { label: 'Band', values: ['', '', '', '', '', '', '', ''] },
                { label: 'RSRP(dBm)', values: ['', '', '', '', '', '', '', ''] },
                { label: 'RSRQ(dB)', values: ['', '', '', '', '', '', '', ''] },
                { label: 'SINR(dB)', values: ['', '', '', '', '', '', '', ''] },
                { label: 'DL TP(Mbps)', values: ['', '', '', '', '', '', '', ''] },
                { label: 'UL TP(Mbps)', values: ['', '', '', '', '', '', '', ''] },
                { label: 'Serving PCI', values: ['82', '', '', '', '', '', '', ''], section: true },
                { label: 'Serving Tx Beam ID', values: ['0', '', '', '', '', '', '', ''] },
                { label: 'NR-ARFCN(Band)', values: ['396970(25)', '', '', '', '', '', '', ''], color: 'text-red-400' },
                { label: 'Duplex Mode', values: ['FDD', '', '', '', '', '', '', ''] },
                { label: 'SCS(kHz)', values: ['15kHz', '', '', '', '', '', '', ''] },
                { label: 'SS-RSRP(dBm)', values: ['-102.42', '', '', '', '', '', '', ''], color: 'text-red-400' },
                { label: 'SS-RSRQ(dB)', values: ['-12.63', '', '', '', '', '', '', ''], color: 'text-red-400' },
                { label: 'SINR(dB)', values: ['2.23', '', '', '', '', '', '', ''], color: 'text-yellow-400' },
                { label: 'DL TP(Mbps)', values: ['0.01', '', '', '', '', '', '', ''], color: 'text-red-400' },
                { label: 'UL TP(Mbps)', values: ['0.09', '', '', '', '', '', '', ''], color: 'text-red-400' }
              ].map((row, idx) => (
                <tr key={idx} className={`border-b border-gray-800 ${row.section ? 'bg-gray-850' : idx % 2 === 0 ? 'bg-gray-900' : 'bg-black'}`}>
                  <td className={`p-3 border-r border-gray-700 font-semibold ${row.color || 'text-gray-300'}`}>{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className={`p-3 text-center border-r border-gray-700 ${row.color || ''}`}>{val || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
