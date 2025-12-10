import { useEffect, useRef, useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
import RealtimeAdbClusterMap from '@/components/RealtimeAdbClusterMap'
import RealtimeKpiDashboard from '@/components/RealtimeKpiDashboard'
import { useRealtimeDriveTest } from '@/hooks/useAdb'
import { api } from '@/utils/api'

export default function LiveMessagesPage(){
  const [deviceId,setDeviceId]=useState<string|null>(null)
  const [sessionId,setSessionId]=useState<number|null>(null)
  const [packets,setPackets]=useState(0)
  const [messages,setMessages]=useState<string[]>([])
  const [viewMode, setViewMode] = useState<'messages' | 'cluster' | 'kpi'>('cluster') // Auto-start on cluster view
  const streamRef = useRef<EventSource|null>(null)
  const [devices, setDevices] = useState<any[]>([])

  // ADB device integration
  const driveTestData = useRealtimeDriveTest(deviceId)

  // Auto-device detection and selection
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devicesResponse = await api.getDevices()
        setDevices(devicesResponse)

        // Auto-select first device if none selected
        if (!deviceId && devicesResponse.length > 0) {
          const firstDevice = devicesResponse[0].deviceId
          console.log('Auto-selecting device:', firstDevice)
          setDeviceId(firstDevice)
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error)
      }
    }

    fetchDevices()
    const interval = setInterval(fetchDevices, 3000)
    return () => clearInterval(interval)
  }, [deviceId])

  // Auto-start capture when device is selected
  useEffect(() => {
    if (deviceId && !sessionId) {
      console.log('Auto-starting capture for device:', deviceId)
      startCapture()
    }
  }, [deviceId, sessionId])

  useEffect(()=>{ if(sessionId){
    streamRef.current?.close();
    const es = api.createLogStream(sessionId)
    streamRef.current = es
    es.onmessage = (e)=>{ setMessages(prev=>[e.data,...prev].slice(0,1000)); setPackets(p=>p+1) }
  }},[sessionId])
  const startCapture = async ()=>{ if(!deviceId) return; try{ const s=await api.startSession(deviceId); setSessionId(s.id) }catch{} }
  const stopCapture = async ()=>{ if(sessionId){ try{ await api.stopSession(sessionId); streamRef.current?.close(); }catch{} }}
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <DeviceSelectionBar selected={deviceId} onSelect={setDeviceId} devices={devices} />
      {/* Toolbar with view mode tabs */}
      <div className="px-4 py-2 space-y-2 border-b border-gray-800 bg-black text-xs">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setViewMode('messages')}
            className={`px-3 py-1.5 rounded transition-colors ${
              viewMode === 'messages' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            📡 Signaling Messages
          </button>
          <button
            onClick={() => setViewMode('cluster')}
            className={`px-3 py-1.5 rounded transition-colors ${
              viewMode === 'cluster' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            🗺️ Cluster Map
          </button>
          <button
            onClick={() => setViewMode('kpi')}
            className={`px-3 py-1.5 rounded transition-colors ${
              viewMode === 'kpi' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            📊 Live KPIs
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs">
            {driveTestData.connected && (
              <div className="flex items-center gap-1.5 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live ADB Stream
              </div>
            )}
            {driveTestData.cellular && (
              <div className="text-gray-400">
                RSRP: <span className="text-white font-mono">{driveTestData.cellular.rsrp.toFixed(1)}</span> dBm
              </div>
            )}
          </div>
        </div>

        {/* Original toolbar for messages view */}
        {viewMode === 'messages' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-gray-400">Message Filter</label>
              <select className="bg-black border border-gray-800 rounded px-2 py-1">
                <option>None</option>
              </select>
              <button className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Filtering</button>
              <button className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Filtering 2</button>
              <button onClick={()=>streamRef.current?.close()} className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Pause</button>
              <button className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Export</button>
              <button className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Hex</button>
              <button className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Vertically</button>
              <button onClick={()=>setMessages([])} className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Clear</button>
              <button className="px-2 py-1 border border-gray-800 rounded bg-gray-900">Find</button>
              <button className="px-2 py-1 border border-gray-800 rounded bg-gray-900">String Color</button>
              <label className="ml-auto flex items-center gap-1 text-gray-400"><input type="checkbox" defaultChecked/> Detail</label>
              <label className="flex items-center gap-1 text-gray-400"><input type="checkbox" defaultChecked/> Show Elapsed</label>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-gray-400"><input type="checkbox" defaultChecked/> Show SIP</label>
              <div className="text-gray-500">Free Size: 0</div>
              <label className="flex items-center gap-1 text-gray-400"><input type="checkbox"/> Show Step1</label>
              <label className="flex items-center gap-1 text-gray-400"><input type="checkbox"/> Step2</label>
              <label className="flex items-center gap-1 text-gray-400"><input type="checkbox"/> Step3</label>
              <label className="flex items-center gap-1 text-gray-400"><input type="checkbox"/> SACH Report</label>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={startCapture} className="px-3 py-2 bg-white text-black text-xs rounded">Start</button>
                <button onClick={stopCapture} className="px-3 py-2 bg-gray-800 text-white text-xs rounded border border-gray-700">Stop & Save</button>
                <button className="px-3 py-2 bg-gray-900 text-white text-xs rounded border border-gray-700">Export</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dynamic content based on view mode */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'messages' && (
          <div className="h-full grid grid-cols-3 gap-0">
            <div className="col-span-2 border-r border-gray-800 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-black">
                  <tr className="text-gray-400">
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">UE-NET</th>
                    <th className="px-3 py-2 text-left">Channel</th>
                    <th className="px-3 py-2 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m,i)=>{
                    const dir = m.includes('UL') ? '→ UL' : '← DL'
                    const channel = m.includes('DCCH') ? 'DCCH' : m.includes('PCCH') ? 'PCCH' : m.includes('BCCH') ? 'BCCH BCH' : m.includes('5GNR') ? 'DL 5GNR' : 'RRC/NAS'
                    const chanClass = channel==='DCCH' && dir.includes('→') ? 'text-cyan-400' : channel==='DCCH' ? 'text-green-400' : channel==='PCCH' ? 'text-purple-400' : channel==='BCCH BCH' ? 'text-yellow-400' : channel==='DL 5GNR' ? 'text-pink-400' : 'text-gray-300'
                    const msgClass = m.includes('Complete') ? 'text-green-400' : m.includes('Request') ? 'text-cyan-400' : m.includes('Paging') ? 'text-purple-400' : 'text-white'
                    return (
                      <tr key={i} className="border-t border-gray-900 hover:bg-gray-900 cursor-pointer">
                        <td className="px-3 py-1 text-gray-400 font-mono">{new Date().toLocaleTimeString('en-US',{hour12:false})}</td>
                        <td className="px-3 py-1 text-gray-300">{dir}</td>
                        <td className={`px-3 py-1 font-mono ${chanClass}`}>{channel}</td>
                        <td className={`px-3 py-1 font-mono truncate ${msgClass}`}>{m}</td>
                      </tr>
                    )
                  })}
                  {messages.length===0 && (
                    <tr><td className="px-3 py-4 text-gray-500" colSpan={4}>{deviceId? 'No messages yet' : 'Select a device'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="col-span-1 p-3">
              <div className="text-xs text-gray-400 mb-2">Message Details</div>
              <pre className="h-64 border border-gray-800 rounded bg-gray-950 p-2 text-[11px] text-gray-300 overflow-auto">{messages[0]||''}</pre>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="border border-gray-800 rounded p-2 bg-gray-950"><div className="text-gray-400 text-xs">UL/DL</div><div className="text-white text-lg">{(messages[0]||'').includes('UL')?'UL':'DL'}</div></div>
                <div className="border border-gray-800 rounded p-2 bg-gray-950"><div className="text-gray-400 text-xs">Count</div><div className="text-white text-lg">{messages.length}</div></div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'cluster' && (
          <div className="h-full p-4 flex flex-col">
            {!deviceId && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <div className="text-xl text-gray-300 mb-2">Waiting for Device Connection</div>
                  <div className="text-sm text-gray-500">Connect your Android device via USB</div>
                  <div className="text-sm text-gray-500">Device will be detected automatically</div>
                </div>
              </div>
            )}
            {deviceId && !driveTestData.connected && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">⏳</div>
                  <div className="text-xl text-gray-300 mb-2">Starting Capture...</div>
                  <div className="text-sm text-gray-500">Device: {deviceId}</div>
                  <div className="text-sm text-gray-500">Initializing ADB connection...</div>
                </div>
              </div>
            )}
            {deviceId && driveTestData.connected && (
              <>
                {driveTestData.clusters && driveTestData.clusters.totalPoints === 0 && (
                  <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded flex items-center gap-3">
                    <div className="text-2xl">🗺️</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-blue-300">Collecting GPS Data</div>
                      <div className="text-xs text-gray-400">Move around to collect signal measurements. Clusters will appear after collecting 4+ points.</div>
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <RealtimeAdbClusterMap deviceId={deviceId} numClusters={4} intervalSeconds={3} />
                </div>
              </>
            )}
          </div>
        )}

        {viewMode === 'kpi' && (
          <div className="h-full p-4">
            <RealtimeKpiDashboard deviceId={deviceId} intervalSeconds={1} />
          </div>
        )}
      </div>
      <Footer packetCount={packets} deviceCount={deviceId ? 1 : 0} />
    </div>
  )
}
