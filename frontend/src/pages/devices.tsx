import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import { api } from '@/utils/api'

export default function DevicesPage(){
  const [devices, setDevices] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<string|null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [devs, sess] = await Promise.all([
          api.getDevices(),
          api.getRecentSessions(20)
        ])
        setDevices(devs)
        setSessions(sess)
      } catch (err) {
        console.error('Failed to load devices:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6 space-y-6">
        {/* Connected Devices */}
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-lg font-semibold mb-4">Connected Devices</div>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading devices...</div>
          ) : devices.length === 0 ? (
            <div className="text-gray-500 text-sm">No devices connected. Please connect a device via USB and enable diagnostic mode.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((device) => (
                <div 
                  key={device.id}
                  onClick={() => setSelectedDevice(device.id)}
                  className={`border rounded p-3 cursor-pointer transition ${
                    selectedDevice === device.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{device.id}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Model: {device.model || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Status: <span className="text-green-400">Connected</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-lg font-semibold mb-4">Recent Sessions</div>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-gray-500 text-sm">No sessions yet. Start a capture to create a session.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Session ID</th>
                  <th className="px-3 py-2 text-left">Device</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Started</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t border-gray-900 hover:bg-gray-900">
                    <td className="px-3 py-2 text-white">{session.id}</td>
                    <td className="px-3 py-2 text-gray-300">{session.deviceId}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        session.status === 'CAPTURING' ? 'bg-green-900/30 text-green-400' :
                        session.status === 'COMPLETED' ? 'bg-blue-900/30 text-blue-400' :
                        session.status === 'FAILED' ? 'bg-red-900/30 text-red-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {new Date(session.startTime).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button 
                        onClick={() => window.open(`/?session=${session.id}`, '_blank')}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
