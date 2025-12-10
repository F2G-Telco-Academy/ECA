import { useState, useEffect } from 'react'

export default function StatusBar() {
  const [status, setStatus] = useState({ backend: 'disconnected', device: 'none' })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:8080/actuator/health')
        if (res.ok) setStatus(prev => ({ ...prev, backend: 'connected' }))
      } catch {
        setStatus(prev => ({ ...prev, backend: 'disconnected' }))
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-7 bg-white border-t border-gray-200 flex items-center px-4 text-[11px] text-gray-600">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.backend === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>Backend: {status.backend}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          <span>Device: {status.device}</span>
        </div>
      </div>
      <div className="ml-auto text-gray-500">Status OK</div>
    </div>
  )
}
