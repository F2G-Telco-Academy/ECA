import { useState, useEffect } from 'react'

export default function SystemStatusBar() {
  const [status, setStatus] = useState({
    gps: false,
    logging: false,
    cpu: 0,
    memory: 0,
    timestamp: new Date()
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        timestamp: new Date()
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-6 bg-blue-600 text-white flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-4">
        <div className={status.gps ? 'text-green-300' : 'text-red-300'}>
          {status.gps ? '📍 GPS' : 'No GPS'}
        </div>
        <div className={status.logging ? 'text-green-300' : 'text-red-300'}>
          {status.logging ? '📝 Logging' : 'No Logging'}
        </div>
        <div>CPU {status.cpu.toFixed(1)}%</div>
        <div>Memory {status.memory.toFixed(1)}%</div>
      </div>
      <div>
        sires 2025-11-28 12:37, 3 hours left, AMD: 2025-05-1
      </div>
    </div>
  )
}
