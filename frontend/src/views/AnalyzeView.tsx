"use client"
import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface AnalyzeViewProps {
  sessionId: string | null
}

export default function AnalyzeView({ sessionId }: AnalyzeViewProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(sessionId)
  const [generating, setGenerating] = useState(false)
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'kpi'>('summary')

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await api.getSessions()
        setSessions(data || [])
      } catch (err) {
        console.error('Failed to fetch sessions:', err)
      }
    }
    fetchSessions()
  }, [])

  const handleGenerateReport = async () => {
    if (!selectedSession) {
      alert('Please select a session first')
      return
    }

    setGenerating(true)
    try {
      // TODO: Implement backend report generation endpoint
      alert(`Generating ${reportType} report for session ${selectedSession}...`)
      // const blob = await api.generateReport(selectedSession, reportType)
      // Download logic here
    } catch (err: any) {
      alert('Failed to generate report: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold">Analysis & Reports</h1>
        <p className="text-sm text-gray-500">Generate comprehensive reports from captured sessions</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Session Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold mb-4">Select Session</h2>
            <select
              value={selectedSession || ''}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a session --</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  Session {session.id} - {session.deviceId} - {new Date(session.startTime).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Report Type */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold mb-4">Report Type</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="reportType"
                  value="summary"
                  checked={reportType === 'summary'}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Summary Report</div>
                  <div className="text-sm text-gray-500">Overview of key metrics, success rates, and network quality</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="reportType"
                  value="detailed"
                  checked={reportType === 'detailed'}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Detailed Report</div>
                  <div className="text-sm text-gray-500">Complete analysis with GPS traces, signaling messages, and timestamps</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="reportType"
                  value="kpi"
                  checked={reportType === 'kpi'}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">KPI Report</div>
                  <div className="text-sm text-gray-500">All KPIs with GPS coordinates and event timestamps</div>
                </div>
              </label>
            </div>
          </div>

          {/* Report Contents Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold mb-4">Report Will Include</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Network KPIs (RSRP, RSRQ, SINR, Throughput)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Success Rates (RRC, RACH, Handover, Attach)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>GPS Traces with Timestamps</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Cell Information (PCI, EARFCN, Band)</span>
              </div>
              {reportType === 'detailed' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Signaling Messages (RRC, NAS, MAC)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Anomaly Detection Results</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Charts and Visualizations</span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateReport}
              disabled={!selectedSession || generating}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Report...
                </>
              ) : (
                <>
                  📄 Generate PDF Report
                </>
              )}
            </button>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold mb-4">Recent Reports</h2>
            <div className="text-sm text-gray-500 text-center py-8">
              No reports generated yet
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
