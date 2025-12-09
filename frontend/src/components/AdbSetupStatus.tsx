import { useEffect, useState } from 'react'

interface AdbStatus {
  installed: boolean
  inPath: boolean
  autoInstalled: boolean
  path: string
  version: string
  message?: string
}

export default function AdbSetupStatus() {
  const [status, setStatus] = useState<AdbStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    checkAdbStatus()
  }, [])

  const checkAdbStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8080/api/adb/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to check ADB status:', error)
    } finally {
      setLoading(false)
    }
  }

  const installAdb = async () => {
    setInstalling(true)
    try {
      const response = await fetch('http://localhost:8080/api/adb/install', {
        method: 'POST'
      })
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to install ADB:', error)
    } finally {
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm text-slate-300">Checking ADB status...</span>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="bg-red-900/20 rounded-lg p-4 border border-red-700">
        <div className="text-sm text-red-400">Failed to check ADB status</div>
        <button
          onClick={checkAdbStatus}
          className="mt-2 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`rounded-lg p-4 border ${
      status.installed 
        ? 'bg-green-900/20 border-green-700' 
        : 'bg-yellow-900/20 border-yellow-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {status.installed ? (
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <h3 className="font-semibold text-white">ADB Status</h3>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Installed:</span>
              <span className={status.installed ? 'text-green-400' : 'text-red-400'}>
                {status.installed ? 'Yes' : 'No'}
              </span>
            </div>

            {status.installed && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">In PATH:</span>
                  <span className={status.inPath ? 'text-green-400' : 'text-yellow-400'}>
                    {status.inPath ? 'Yes' : 'No (using local)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Version:</span>
                  <span className="text-white font-mono text-xs">{status.version}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-slate-400">Path:</span>
                  <span className="text-white font-mono text-xs break-all">{status.path}</span>
                </div>

                {status.autoInstalled && (
                  <div className="mt-2 p-2 bg-blue-900/30 rounded border border-blue-700">
                    <div className="flex items-center gap-2 text-xs text-blue-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>ADB was automatically installed by ECA</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={checkAdbStatus}
            disabled={loading}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50"
          >
            Refresh
          </button>

          {!status.installed && (
            <button
              onClick={installAdb}
              disabled={installing}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 flex items-center gap-1"
            >
              {installing && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              )}
              {installing ? 'Installing...' : 'Install ADB'}
            </button>
          )}
        </div>
      </div>

      {!status.installed && (
        <div className="mt-3 p-3 bg-yellow-900/30 rounded border border-yellow-700">
          <div className="text-xs text-yellow-300">
            <div className="font-semibold mb-1">ADB is required for device communication</div>
            <div>Click "Install ADB" to automatically download and install Android Debug Bridge.</div>
            <div className="mt-2 text-yellow-400">
              Installation location: {navigator.platform.includes('Win') ? '%USERPROFILE%\\.eca\\tools' : '~/.eca/tools'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
