import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

export default function MeasurementReportViewer({ pcapPath }: { pcapPath: string }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!pcapPath) return
    api.analyzeMeasurementReports(pcapPath).then(setData).catch(console.error)
  }, [pcapPath])

  if (!data) return <div className="p-4">Loading measurement reports...</div>

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Measurement Reports</h3>
      <div className="mb-4">
        <div className="text-sm text-gray-600">Total Reports: {data.totalReports}</div>
        <div className="text-sm text-gray-600">Avg Interval: {data.avgReportInterval?.toFixed(2)}s</div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              <th className="text-left py-2 px-2">Frame</th>
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-right py-2 px-2">RSRP</th>
              <th className="text-right py-2 px-2">RSRQ</th>
            </tr>
          </thead>
          <tbody>
            {data.reports?.slice(0, 20).map((report: any, idx: number) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="py-1 px-2 font-mono text-xs">{report.frameNumber}</td>
                <td className="py-1 px-2 font-mono text-xs">{parseFloat(report.timestamp).toFixed(3)}</td>
                <td className="py-1 px-2 text-right font-mono text-xs">{report.rsrp || 'N/A'}</td>
                <td className="py-1 px-2 text-right font-mono text-xs">{report.rsrq || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
