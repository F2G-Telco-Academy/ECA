import { useState, useEffect } from 'react'

interface ComprehensiveKPIPanelProps {
  sessionId: string | null
}

interface KpiData {
  successRates: Record<string, number>
  counters: Record<string, number>
  measurements: Record<string, number>
}

export default function ComprehensiveKPIPanel({ sessionId }: ComprehensiveKPIPanelProps) {
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'lte' | 'wcdma' | 'gsm' | '5g'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  useEffect(() => {
    if (!sessionId) return

    const fetchKpis = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:8080/api/kpis/session/${sessionId}/comprehensive`)
        const data = await response.json()
        setKpiData(data)
      } catch (err) {
        console.error('Failed to fetch comprehensive KPIs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKpis()
    const interval = setInterval(fetchKpis, 5000)
    return () => clearInterval(interval)
  }, [sessionId])

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-500">
        Start a capture session to view KPIs
      </div>
    )
  }

  if (loading && !kpiData) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-slate-400">Loading comprehensive KPIs...</div>
        </div>
      </div>
    )
  }

  const getKpiColor = (value: number, type: 'success_rate' | 'measurement') => {
    if (type === 'success_rate') {
      if (value >= 95) return 'text-green-400'
      if (value >= 85) return 'text-yellow-400'
      if (value >= 70) return 'text-orange-400'
      return 'text-red-400'
    } else {
      if (value >= -80) return 'text-green-400'
      if (value >= -95) return 'text-yellow-400'
      if (value >= -110) return 'text-orange-400'
      return 'text-red-400'
    }
  }

  const filterKpis = (kpis: Record<string, number>, prefix: string) => {
    return Object.entries(kpis).filter(([key]) => 
      selectedCategory === 'all' || key.toLowerCase().startsWith(prefix.toLowerCase())
    )
  }

  const renderKpiCard = (label: string, value: number, unit: string, type: 'success_rate' | 'measurement') => (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all">
      <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold font-mono ${getKpiColor(value, type)}`}>
        {value.toFixed(2)} <span className="text-sm">{unit}</span>
      </div>
    </div>
  )

  const renderKpiRow = (label: string, value: number, unit: string, type: 'success_rate' | 'measurement') => (
    <tr className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
      <td className="py-3 px-4 text-sm text-slate-300 uppercase tracking-wide">{label}</td>
      <td className={`py-3 px-4 text-right font-mono font-semibold ${getKpiColor(value, type)}`}>
        {value.toFixed(2)} {unit}
      </td>
    </tr>
  )

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded flex items-center justify-center text-sm font-bold">
            KPI
          </div>
          <div>
            <h2 className="text-lg font-semibold">Comprehensive KPI Dashboard</h2>
            <div className="text-xs text-slate-400">Network Performance Indicators</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All RATs</option>
            <option value="5g">5G NR</option>
            <option value="lte">LTE</option>
            <option value="wcdma">WCDMA</option>
            <option value="gsm">GSM</option>
          </select>

          <div className="flex bg-slate-800 rounded border border-slate-600 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm transition-all ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm transition-all ${viewMode === 'table' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!kpiData ? (
          <div className="text-center text-slate-500 py-8">No KPI data available</div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                Success Rates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filterKpis(kpiData.successRates, selectedCategory).map(([key, value]) => 
                  renderKpiCard(
                    key.replace(/_/g, ' '),
                    value,
                    '%',
                    'success_rate'
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                RF Measurements
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(kpiData.measurements).map(([key, value]) => 
                  renderKpiCard(
                    key.replace(/_/g, ' '),
                    value,
                    key.includes('rsrp') || key.includes('rsrq') || key.includes('rssi') ? 'dBm' : 'dB',
                    'measurement'
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                Event Counters
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filterKpis(kpiData.counters, selectedCategory).slice(0, 12).map(([key, value]) => (
                  <div key={key} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">{key.replace(/_/g, ' ')}</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Success Rates</h3>
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="py-2 px-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">KPI</th>
                      <th className="py-2 px-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wide">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterKpis(kpiData.successRates, selectedCategory).map(([key, value]) => 
                      renderKpiRow(
                        key.replace(/_/g, ' '),
                        value,
                        '%',
                        'success_rate'
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">RF Measurements</h3>
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="py-2 px-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">Measurement</th>
                      <th className="py-2 px-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wide">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(kpiData.measurements).map(([key, value]) => 
                      renderKpiRow(
                        key.replace(/_/g, ' '),
                        value,
                        key.includes('rsrp') || key.includes('rsrq') || key.includes('rssi') ? 'dBm' : 'dB',
                        'measurement'
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 p-4 bg-slate-800/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Success Rates</div>
            <div className="text-lg font-bold font-mono text-green-400">
              {kpiData ? Object.keys(kpiData.successRates).length : 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Measurements</div>
            <div className="text-lg font-bold font-mono text-blue-400">
              {kpiData ? Object.keys(kpiData.measurements).length : 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Event Counters</div>
            <div className="text-lg font-bold font-mono text-cyan-400">
              {kpiData ? Object.keys(kpiData.counters).length : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
