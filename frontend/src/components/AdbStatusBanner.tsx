import { useEffect, useState } from 'react'

interface AdbStatus {
  installed: boolean
  inPath: boolean
  autoInstalled: boolean
  path: string
  version: string
  message?: string
}

export default function AdbStatusBanner() {
  const [status, setStatus] = useState<AdbStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAdbStatus()
  }, [])

  const checkAdbStatus = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/adb/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to check ADB status:', error)
    } finally {
      setChecking(false)
    }
  }

  if (checking || dismissed || !status) {
    return null
  }

  // Only show banner if ADB was auto-installed or there's an issue
  if (status.installed && !status.autoInstalled) {
    return null
  }

  return (
    <div className={`${
      status.installed 
        ? 'bg-green-900/20 border-green-700' 
        : 'bg-red-900/20 border-red-700'
    } border-b px-4 py-2`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status.installed ? (
            <>
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="text-sm">
                <span className="text-green-400 font-semibold">ADB Ready</span>
                <span className="text-slate-300 ml-2">
                  Android Debug Bridge was automatically installed and configured
                </span>
                <span className="text-slate-400 ml-2">
                  (v{status.version})
                </span>
              </div>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <span className="text-red-400 font-semibold">ADB Setup Failed</span>
                <span className="text-slate-300 ml-2">
                  {status.message || 'Unable to install Android Debug Bridge automatically'}
                </span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
