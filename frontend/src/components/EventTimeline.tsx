import { useState, useEffect } from 'react'

interface EventDetail {
  frameNumber: number
  timestamp: number
}

interface TimelineEvent {
  timestamp: string
  type: string
  description: string
  severity: 'info' | 'warning' | 'error'
  frameNumber: number
}

const EVENT_TYPES = [
  { key: 'lte_rrc_req', label: 'RRC Request', type: 'RRC', severity: 'info' as const },
  { key: 'lte_rrc_setup', label: 'RRC Setup', type: 'RRC', severity: 'info' as const },
  { key: 'lte_attach_req', label: 'Attach Request', type: 'NAS', severity: 'info' as const },
  { key: 'lte_attach_acc', label: 'Attach Accept', type: 'NAS', severity: 'info' as const },
  { key: 'lte_tau_req', label: 'TAU Request', type: 'NAS', severity: 'info' as const },
  { key: 'lte_tau_acc', label: 'TAU Accept', type: 'NAS', severity: 'info' as const },
  { key: 'lte_ho_cmd', label: 'Handover Command', type: 'HO', severity: 'warning' as const },
  { key: 'lte_ho_complete', label: 'Handover Complete', type: 'HO', severity: 'info' as const },
  { key: 'wcdma_rrc_req', label: '3G RRC Request', type: 'RRC', severity: 'info' as const },
  { key: 'wcdma_rrc_setup', label: '3G RRC Setup', type: 'RRC', severity: 'info' as const },
]

export default function EventTimeline({ sessionId }: { sessionId: number }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const fetchEvents = async () => {
      setLoading(true)
      setError(null)
      const allEvents: TimelineEvent[] = []

      try {
        // Fetch events for each type
        for (const eventType of EVENT_TYPES) {
          const response = await fetch(
            `http://localhost:8080/api/kpis/session/${sessionId}/events/${eventType.key}`
          )
          
          if (response.ok) {
            const data: EventDetail[] = await response.json()
            
            // Convert to timeline events
            data.forEach(detail => {
              allEvents.push({
                timestamp: new Date(detail.timestamp * 1000).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  fractionalSecondDigits: 3
                }),
                type: eventType.type,
                description: eventType.label,
                severity: eventType.severity,
                frameNumber: detail.frameNumber
              })
            })
          }
        }

        // Sort by timestamp
        allEvents.sort((a, b) => a.frameNumber - b.frameNumber)
        setEvents(allEvents)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [sessionId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Loading events...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded shadow h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-sm">Failed to load events</div>
          <div className="text-xs text-gray-500 mt-1">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded shadow h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Event Timeline</h3>
        <span className="text-xs text-gray-500">{events.length} events</span>
      </div>
      
      {events.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">
          No events found for this session
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event, idx) => (
            <div key={idx} className="flex items-start space-x-3 hover:bg-gray-50 p-2 rounded transition-colors">
              <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(event.severity)}`}></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs text-gray-600">{event.timestamp}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">{event.type}</span>
                    <span className="text-xs text-gray-400">#{event.frameNumber}</span>
                  </div>
                </div>
                <div className="text-sm mt-0.5">{event.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
