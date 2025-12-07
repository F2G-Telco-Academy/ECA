'use client'
import { useState } from 'react'
import { api } from '@/utils/api'

interface SessionControlPanelProps {
  deviceId: string | null
  sessionId: number | null
  onSessionStart: (session: any) => void
  onSessionStop: () => void
}

export default function SessionControlPanel({ 
  deviceId, 
  sessionId, 
  onSessionStart, 
  onSessionStop 
}: SessionControlPanelProps) {
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    if (!deviceId) {
      setError('No device selected')
      return
    }

    setIsStarting(true)
    setError(null)

    try {
      const session = await api.startSession(deviceId)
      onSessionStart(session)
    } catch (err: any) {
      setError(err.message || 'Failed to start session')
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    if (!sessionId) return

    setIsStopping(true)
    setError(null)

    try {
      await api.stopSession(sessionId)
      onSessionStop()
    } catch (err: any) {
      setError(err.message || 'Failed to stop session')
    } finally {
      setIsStopping(false)
    }
  }

  const isCapturing = sessionId !== null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Capture Control</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          isCapturing ? 'bg-green-500 text-black animate-pulse' : 'bg-gray-600 text-gray-300'
        }`}>
          {isCapturing ? 'CAPTURING' : 'IDLE'}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Device:</span>
          <span className="text-white font-mono">{deviceId || 'None'}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Session ID:</span>
          <span className="text-white font-mono">{sessionId || 'N/A'}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleStart}
            disabled={!deviceId || isCapturing || isStarting}
            className={`flex-1 py-2 rounded font-semibold transition-colors ${
              !deviceId || isCapturing || isStarting
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </span>
            ) : (
              '▶ Start Capture'
            )}
          </button>

          <button
            onClick={handleStop}
            disabled={!isCapturing || isStopping}
            className={`flex-1 py-2 rounded font-semibold transition-colors ${
              !isCapturing || isStopping
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isStopping ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Stopping...
              </span>
            ) : (
              '■ Stop Capture'
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Auto-capture starts when device connects</div>
          <div>• Logs are streamed in real-time</div>
          <div>• KPIs are calculated automatically</div>
        </div>
      </div>
    </div>
  )
}
