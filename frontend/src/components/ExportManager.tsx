import { useState } from 'react'
import { api } from '@/utils/api'

export default function ExportManager({ sessionId }: { sessionId: number }) {
  const [exporting, setExporting] = useState(false)

  const handleExportHtml = async () => {
    setExporting(true)
    try {
      const blob = await api.generateHtmlReport(sessionId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `session-${sessionId}-report.html`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleExportCsv = async () => {
    console.log('CSV export not yet implemented')
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Export Data</h3>
      <div className="space-y-2">
        <button
          onClick={handleExportHtml}
          disabled={exporting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {exporting ? 'Generating...' : 'Export HTML Report'}
        </button>
        <button
          onClick={handleExportCsv}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export CSV Data
        </button>
      </div>
    </div>
  )
}
