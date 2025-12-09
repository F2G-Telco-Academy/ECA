import { Session } from '@/types'

interface Props {
  sessions: Session[]
  currentSession: Session | null
  onSwitch: (session: Session) => void
}

export default function DeviceSessionSwitcher({ sessions, currentSession, onSwitch }: Props) {
  if (!sessions || sessions.length === 0) return null

  const activeSessions = sessions.filter(s => s.status === 'ACTIVE')
  if (activeSessions.length === 0) return null

  return (
    <div className="bg-slate-800 border-b border-slate-700 p-2">
      <div className="text-xs text-slate-400 mb-1">Active Sessions</div>
      <div className="flex gap-2 overflow-x-auto">
        {activeSessions.map(session => (
          <button
            key={session.id}
            onClick={() => onSwitch(session)}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              currentSession?.id === session.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {session.deviceId} ({session.id})
          </button>
        ))}
      </div>
    </div>
  )
}
