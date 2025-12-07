'use client'
import { useState } from 'react'

interface Alert {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error'
}

export default function AlertNotification() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      title: 'Alarm',
      message: "No Rx message from the Mobile(1)'s Smart App\nCheck the Smart App Status",
      type: 'warning'
    }
  ])

  const closeAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id))
  }

  return (
    <>
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="fixed top-4 right-4 bg-white border-2 border-blue-500 shadow-lg rounded p-4 min-w-[300px] z-50"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-blue-600">{alert.title}</h3>
            <button
              onClick={() => closeAlert(alert.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line mb-4">{alert.message}</p>
          <button
            onClick={() => closeAlert(alert.id)}
            className="px-4 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            OK
          </button>
        </div>
      ))}
    </>
  )
}
