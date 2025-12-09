import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

export default function ProtocolStackViewer({ pcapPath }: { pcapPath: string }) {
  const [correlation, setCorrelation] = useState<any>(null)

  useEffect(() => {
    if (!pcapPath) return
    api.correlateProtocols(pcapPath).then(setCorrelation).catch(console.error)
  }, [pcapPath])

  if (!correlation) return <div className="p-4">Loading protocol data...</div>

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Protocol Stack</h3>
      <div className="space-y-2">
        {Object.entries(correlation.protocolEvents || {}).map(([protocol, events]: [string, any]) => (
          <div key={protocol} className="border rounded p-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{protocol}</span>
              <span className="text-sm text-gray-600">{events.length} events</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded">
              <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.min(100, events.length)}%` }}></div>
            </div>
          </div>
        ))}
      </div>
      {correlation.correlations && correlation.correlations.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">Cross-Layer Correlations</div>
          <div className="text-xs text-gray-600">{correlation.correlations.length} correlations found</div>
        </div>
      )}
    </div>
  )
}
