import { useState, useEffect } from 'react'

interface Bearer {
  bearerId: number
  qci: number
  apn: string
  status: 'active' | 'inactive'
  dlBitrate: number
  ulBitrate: number
}

export default function BearerStatusPanel({ sessionId }: { sessionId: number }) {
  const [bearers, setBearers] = useState<Bearer[]>([])

  useEffect(() => {
    setBearers([
      { bearerId: 5, qci: 9, apn: 'internet', status: 'active', dlBitrate: 150000, ulBitrate: 50000 },
      { bearerId: 6, qci: 5, apn: 'ims', status: 'active', dlBitrate: 100000, ulBitrate: 100000 }
    ])
  }, [sessionId])

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Bearer Status</h3>
      <div className="space-y-3">
        {bearers.map(bearer => (
          <div key={bearer.bearerId} className="border rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Bearer {bearer.bearerId}</span>
              <span className={`px-2 py-1 rounded text-xs ${bearer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {bearer.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">QCI:</span> {bearer.qci}
              </div>
              <div>
                <span className="text-gray-600">APN:</span> {bearer.apn}
              </div>
              <div>
                <span className="text-gray-600">DL:</span> {(bearer.dlBitrate / 1000).toFixed(0)} kbps
              </div>
              <div>
                <span className="text-gray-600">UL:</span> {(bearer.ulBitrate / 1000).toFixed(0)} kbps
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
