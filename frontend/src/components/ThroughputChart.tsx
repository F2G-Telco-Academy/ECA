import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

export default function ThroughputChart({ pcapPath }: { pcapPath: string }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!pcapPath) return
    api.analyzeDetailedThroughput(pcapPath).then(setData).catch(console.error)
  }, [pcapPath])

  if (!data) return <div className="p-4">Loading throughput data...</div>

  const dlMbps = data.downlinkBytes ? (data.downlinkBytes * 8 / 1_000_000).toFixed(2) : 0
  const ulMbps = data.uplinkBytes ? (data.uplinkBytes * 8 / 1_000_000).toFixed(2) : 0

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Throughput Analysis</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Downlink</span>
            <span className="text-sm font-medium">{dlMbps} Mbps</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${Math.min(100, parseFloat(dlMbps))}%` }}></div>
          </div>
          <div className="text-xs text-gray-600 mt-1">{data.downlinkPackets} packets</div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Uplink</span>
            <span className="text-sm font-medium">{ulMbps} Mbps</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-green-600 h-4 rounded-full" style={{ width: `${Math.min(100, parseFloat(ulMbps))}%` }}></div>
          </div>
          <div className="text-xs text-gray-600 mt-1">{data.uplinkPackets} packets</div>
        </div>
      </div>
    </div>
  )
}
