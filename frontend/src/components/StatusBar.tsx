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
    <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.backend === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          Backend: {status.backend}
        </div>
        <div>Device: {status.device}</div>
      </div>
    </div>
  )
}
