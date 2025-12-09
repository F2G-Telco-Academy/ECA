import { useState, useEffect } from 'react'

interface TimelineEvent {
  timestamp: string
  type: string
  description: string
  severity: 'info' | 'warning' | 'error'
}

export default function EventTimeline({ sessionId }: { sessionId: number }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])

  useEffect(() => {
    setEvents([
      { timestamp: '10:30:15.123', type: 'RRC', description: 'RRC Connection Request', severity: 'info' },
      { timestamp: '10:30:15.234', type: 'RRC', description: 'RRC Connection Setup', severity: 'info' },
      { timestamp: '10:30:15.345', type: 'NAS', description: 'Attach Request', severity: 'info' },
      { timestamp: '10:30:16.123', type: 'NAS', description: 'Attach Accept', severity: 'info' },
      { timestamp: '10:30:20.456', type: 'HO', description: 'Handover Command', severity: 'warning' },
      { timestamp: '10:30:20.567', type: 'HO', description: 'Handover Complete', severity: 'info' },
    ])
  }, [sessionId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow h-full overflow-y-auto">
      <h3 className="font-semibold mb-4">Event Timeline</h3>
      <div className="space-y-2">
        {events.map((event, idx) => (
          <div key={idx} className="flex items-start space-x-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(event.severity)}`}></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-mono text-xs text-gray-600">{event.timestamp}</span>
                <span className="text-xs font-semibold text-gray-700">{event.type}</span>
              </div>
              <div className="text-sm">{event.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
