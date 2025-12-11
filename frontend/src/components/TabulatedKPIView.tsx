import { useEffect, useState } from 'react'
import { api } from '@/utils/api'

interface KPITableData {
  category: string
  metrics: {
    attempt: { count: number; rate: number; duration: number }
    success: { count: number; rate: number; duration: number }
    failure: { count: number; rate: number; duration: number }
  }
}

export default function TabulatedKPIView({ sessionId }: { sessionId: string | null }) {
  const [kpiData, setKpiData] = useState<KPITableData[]>([])
  const [selectedCategory, setSelectedCategory] = useState('handover')
  const [timestamp, setTimestamp] = useState('')

  useEffect(() => {
    if (!sessionId) return

    const fetchKPIData = async () => {
      try {
        const data = await api.getKpisByCategory(sessionId, selectedCategory)
        setTimestamp(new Date().toLocaleTimeString())
        
        // Transform data into table format
        const tableData: KPITableData[] = [
          {
            category: 'Intra NR-HO(Total)',
            metrics: {
              attempt: { count: 0, rate: 0, duration: 0 },
              success: { count: 0, rate: 0, duration: 0 },
              failure: { count: 0, rate: 0, duration: 0 }
            }
          },
          {
            category: 'Intra Frequency HO',
            metrics: {
              attempt: { count: 0, rate: 0, duration: 0 },
              success: { count: 0, rate: 0, duration: 0 },
              failure: { count: 0, rate: 0, duration: 0 }
            }
          },
          {
            category: 'Inter Frequency HO',
            metrics: {
              attempt: { count: 0, rate: 0, duration: 0 },
              success: { count: 0, rate: 0, duration: 0 },
              failure: { count: 0, rate: 0, duration: 0 }
            }
          },
          {
            category: 'UnKnown Frequency HO',
            metrics: {
              attempt: { count: 0, rate: 0, duration: 0 },
              success: { count: 0, rate: 0, duration: 0 },
              failure: { count: 0, rate: 0, duration: 0 }
            }
          },
          {
            category: 'Intra / Inter gNB HO',
            metrics: {
              attempt: { count: 0, rate: 0, duration: 0 },
              success: { count: 0, rate: 0, duration: 0 },
              failure: { count: 0, rate: 0, duration: 0 }
            }
          },
          {
            category: 'Intra Frequency - Intra gNB HO',
            metrics: {
              attempt: { count: 0, rate: 0, duration: 0 },
              success: { count: 0, rate: 0, duration: 0 },
              failure: { count: 0, rate: 0, duration: 0 }
            }
          },
          {
            category: 'Intra Frequency - Inter gNB HO',
            metrics: {
              attempt: { count: 0, rate: 0, duration: 0 },
              success: { count: 0, rate: 0, duration: 0 },
              failure: { count: 0, rate: 0, duration: 0 }
            }
          }
        ]
        
        setKpiData(tableData)
      } catch (err) {
        console.error('Failed to fetch KPI data:', err)
      }
    }

    fetchKPIData()
    const interval = setInterval(fetchKPIData, 2000)
    return () => clearInterval(interval)
  }, [sessionId, selectedCategory])

  return (
    <div className="h-full bg-gray-900 text-white overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">5GNR Handover Statistics (intra NR-HO)</h2>
            <div className="text-sm text-gray-400">Time: {timestamp}</div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700">
                <th className="text-left p-4 font-semibold border-r border-gray-600" rowSpan={2}>
                  Time
                </th>
                <th className="text-center p-4 font-semibold border-r border-gray-600" colSpan={3}>
                  Attempt
                </th>
                <th className="text-center p-4 font-semibold border-r border-gray-600" colSpan={3}>
                  Success
                </th>
                <th className="text-center p-4 font-semibold" colSpan={3}>
                  Failure
                </th>
              </tr>
              <tr className="bg-gray-700 border-t border-gray-600">
                <th className="text-center p-2 text-xs border-r border-gray-600">Count</th>
                <th className="text-center p-2 text-xs border-r border-gray-600">Rate(%)</th>
                <th className="text-center p-2 text-xs border-r border-gray-600">Duration(avg)(ms)</th>
                <th className="text-center p-2 text-xs border-r border-gray-600">Count</th>
                <th className="text-center p-2 text-xs border-r border-gray-600">Rate(%)</th>
                <th className="text-center p-2 text-xs border-r border-gray-600">Duration(avg)(ms)</th>
                <th className="text-center p-2 text-xs border-r border-gray-600">Count</th>
                <th className="text-center p-2 text-xs border-r border-gray-600">Rate(%)</th>
                <th className="text-center p-2 text-xs">Duration(avg)(ms)</th>
              </tr>
            </thead>
            <tbody>
              {kpiData.map((row, idx) => (
                <tr key={idx} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-3 border-r border-gray-700">
                    <div className="font-semibold text-blue-400">{row.category}</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-700">{row.metrics.attempt.count || '-'}</td>
                  <td className="p-3 text-center border-r border-gray-700">{row.metrics.attempt.rate || '-'}</td>
                  <td className="p-3 text-center border-r border-gray-700">{row.metrics.attempt.duration || '-'}</td>
                  <td className="p-3 text-center border-r border-gray-700 text-green-400 font-semibold">
                    {row.metrics.success.count || '-'}
                  </td>
                  <td className="p-3 text-center border-r border-gray-700">{row.metrics.success.rate || '-'}</td>
                  <td className="p-3 text-center border-r border-gray-700">{row.metrics.success.duration || '-'}</td>
                  <td className="p-3 text-center border-r border-gray-700 text-red-400 font-semibold">
                    {row.metrics.failure.count || '-'}
                  </td>
                  <td className="p-3 text-center border-r border-gray-700">{row.metrics.failure.rate || '-'}</td>
                  <td className="p-3 text-center">{row.metrics.failure.duration || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Category Tabs */}
        <div className="mt-6 flex gap-2">
          {['M1 (M1)', 'M2 (M2)', 'M3 (M3)', 'M4 (M4)'].map((tab) => (
            <button
              key={tab}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
