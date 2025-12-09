import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface AnalyticsData {
  throughput?: any
  latency?: any
  handover?: any
  rach?: any
  procedures?: any
}

export default function AnalyticsDashboard({ pcapPath }: { pcapPath: string }) {
  const [data, setData] = useState<AnalyticsData>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pcapPath) return
    
    setLoading(true)
    Promise.all([
      api.analyzeThroughput(pcapPath).catch(() => null),
      api.analyzeLatency(pcapPath).catch(() => null),
      api.analyzeHandovers(pcapPath).catch(() => null),
      api.analyzeRach(pcapPath).catch(() => null),
      api.analyzeProcedures(pcapPath).catch(() => null)
    ]).then(([throughput, latency, handover, rach, procedures]) => {
      setData({ throughput, latency, handover, rach, procedures })
      setLoading(false)
    })
  }, [pcapPath])

  if (loading) return <div className="p-4">Loading analytics...</div>

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Advanced Analytics</h2>
      
      {data.throughput && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Throughput Analysis</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Avg Throughput</div>
              <div className="text-2xl font-bold">{data.throughput.avgThroughputMbps?.toFixed(2)} Mbps</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Bytes</div>
              <div className="text-2xl font-bold">{(data.throughput.totalBytes / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Duration</div>
              <div className="text-2xl font-bold">{data.throughput.duration?.toFixed(1)} s</div>
            </div>
          </div>
        </div>
      )}

      {data.latency && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Latency Analysis</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Min</div>
              <div className="text-lg font-bold">{data.latency.minLatency?.toFixed(2)} ms</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Avg</div>
              <div className="text-lg font-bold">{data.latency.avgLatency?.toFixed(2)} ms</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">P95</div>
              <div className="text-lg font-bold">{data.latency.p95Latency?.toFixed(2)} ms</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Max</div>
              <div className="text-lg font-bold">{data.latency.maxLatency?.toFixed(2)} ms</div>
            </div>
          </div>
        </div>
      )}

      {data.handover && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Handover Analysis</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Commands</div>
              <div className="text-lg font-bold">{data.handover.hoCommands}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Completes</div>
              <div className="text-lg font-bold text-green-600">{data.handover.hoCompletes}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Failures</div>
              <div className="text-lg font-bold text-red-600">{data.handover.hoFailures}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-lg font-bold">{data.handover.successRate?.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {data.rach && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">RACH Analysis</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Attempts</div>
              <div className="text-lg font-bold">{data.rach.rachAttempts}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Success</div>
              <div className="text-lg font-bold text-green-600">{data.rach.rachSuccess}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Failures</div>
              <div className="text-lg font-bold text-red-600">{data.rach.rachFailures}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-lg font-bold">{data.rach.successRate?.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {data.procedures && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Procedure Analysis</h3>
          <div className="space-y-3">
            {data.procedures.attach && (
              <div className="border-l-4 border-blue-500 pl-3">
                <div className="font-medium">Attach Procedure</div>
                <div className="text-sm text-gray-600">
                  Requests: {data.procedures.attach.requests} | 
                  Success: {data.procedures.attach.completes} | 
                  Rate: {data.procedures.attach.successRate?.toFixed(1)}%
                </div>
              </div>
            )}
            {data.procedures.tau && (
              <div className="border-l-4 border-green-500 pl-3">
                <div className="font-medium">TAU Procedure</div>
                <div className="text-sm text-gray-600">
                  Requests: {data.procedures.tau.requests} | 
                  Accepts: {data.procedures.tau.accepts} | 
                  Rate: {data.procedures.tau.successRate?.toFixed(1)}%
                </div>
              </div>
            )}
            {data.procedures.serviceRequest && (
              <div className="border-l-4 border-purple-500 pl-3">
                <div className="font-medium">Service Request</div>
                <div className="text-sm text-gray-600">
                  Requests: {data.procedures.serviceRequest.requests} | 
                  Accepts: {data.procedures.serviceRequest.accepts} | 
                  Rate: {data.procedures.serviceRequest.successRate?.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
