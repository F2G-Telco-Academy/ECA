import { useState, useEffect } from 'react'

export default function PortStatus() {
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/ports/status')
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setStatus(data)
    }

    eventSource.onerror = () => {
      console.error('Port status stream error')
    }

    return () => eventSource.close()
  }, [])

  if (!status) {
    return <div className="h-full flex items-center justify-center text-slate-500">Loading port status...</div>
  }

  return (
    <div className="h-full p-4">
      <div className="text-lg font-bold mb-4">Port Status</div>
      <div className="space-y-4">
        <div className="bg-slate-800 p-4 rounded">
          <div className="font-semibold mb-2">Scanner 1</div>
          <div className="text-sm space-y-1">
            <div><span className="text-slate-400">Port:</span> {status.scanner1?.port}</div>
            <div><span className="text-slate-400">Status:</span> <span className={status.scanner1?.connected ? 'text-green-400' : 'text-red-400'}>{status.scanner1?.status}</span></div>
            <div><span className="text-slate-400">Connected:</span> {status.scanner1?.connected ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded">
          <div className="font-semibold mb-2">Scanner 2</div>
          <div className="text-sm space-y-1">
            <div><span className="text-slate-400">Port:</span> {status.scanner2?.port}</div>
            <div><span className="text-slate-400">Status:</span> <span className={status.scanner2?.connected ? 'text-green-400' : 'text-red-400'}>{status.scanner2?.status}</span></div>
            <div><span className="text-slate-400">Connected:</span> {status.scanner2?.connected ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
