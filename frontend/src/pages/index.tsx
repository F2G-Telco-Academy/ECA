import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { deviceContext } from '@/utils/deviceContext'
import { api } from '@/utils/api'

const SignalingMessageViewer = dynamic(() => import('@/components/SignalingMessageViewer'), { ssr: false })
const EnhancedTerminal = dynamic(() => import('@/components/EnhancedTerminal'), { ssr: false })

export default function LegacyHome() {
  const [currentContext, setCurrentContext] = useState(deviceContext.getCurrentContext())
  const [devices, setDevices] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('devices')
  const [openPanels, setOpenPanels] = useState<{[key: string]: boolean}>({
    mobile: true,
    scanner: false,
    gps: false,
    kpis: true
  })
  const [expandedKpis, setExpandedKpis] = useState<{[key: string]: boolean}>({})

  const [activePanelTab, setActivePanelTab] = useState('signaling')
  const [isCapturing, setIsCapturing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const unsubscribe = deviceContext.subscribe(setCurrentContext)
    
    const fetchDevices = async () => {
      try {
        const data = await api.getDevices()
        setDevices(data)
        if (data.length > 0 && !currentContext) {
          deviceContext.setDevice(data[0].deviceId, data[0].model, data[0].manufacturer)
        }
        setStatusMessage('')
      } catch (err) {
        console.error('Failed to fetch devices from backend:', err)
        // Fallback to Tauri IPC
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          const adbDevices = await invoke('list_adb_devices') as string[]
          const deviceList = adbDevices.map(id => ({
            deviceId: id,
            model: 'Unknown',
            manufacturer: 'Unknown',
            connected: true
          }))
          setDevices(deviceList)
          if (deviceList.length > 0 && !currentContext) {
            deviceContext.setDevice(deviceList[0].deviceId, 'Unknown', 'Unknown')
          }
          setStatusMessage('Using Tauri IPC (Backend offline)')
        } catch (tauriErr) {
          console.error('Tauri IPC also failed:', tauriErr)
          setStatusMessage('No backend - Start backend manually')
        }
      }
    }
    fetchDevices()
    const interval = setInterval(fetchDevices, 3000)
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  const handleStartCapture = async () => {
    if (!currentContext) {
      alert('Please select a device first')
      return
    }
    
    try {
      setStatusMessage('Starting capture...')
      const session = await api.startSession(currentContext.deviceId)
      deviceContext.startSession(currentContext.deviceId, session.id)
      setIsCapturing(true)
      setStatusMessage(`✓ Capturing - Session ${session.id}`)
      setActivePanelTab('terminal')
    } catch (err: any) {
      console.error('Failed to start capture:', err)
      alert('Failed to start capture: ' + err.message)
      setStatusMessage('✗ Capture failed')
    }
  }

  const handleStopCapture = async () => {
    if (!currentContext?.sessionId) return
    
    try {
      setStatusMessage('Stopping capture...')
      await api.stopSession(currentContext.sessionId)
      deviceContext.stopSession(currentContext.deviceId)
      setIsCapturing(false)
      setStatusMessage(`✓ Stopped - Session ${currentContext.sessionId}`)
      setActivePanelTab('signaling')
    } catch (err: any) {
      console.error('Failed to stop capture:', err)
      alert('Failed to stop capture: ' + err.message)
      setStatusMessage('✗ Stop failed')
    }
  }

  const togglePanel = (panel: string) => {
    setOpenPanels(prev => ({ ...prev, [panel]: !prev[panel] }))
  }

  const toggleKpi = (kpi: string) => {
    setExpandedKpis(prev => ({ ...prev, [kpi]: !prev[kpi] }))
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Top Menu Bar */}
      <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-2 text-xs">
        <button onClick={() => window.open('/convert', '_blank')} className="px-3 py-1 hover:bg-slate-700 rounded">File</button>
        <button onClick={() => window.open('/settings', '_blank')} className="px-3 py-1 hover:bg-slate-700 rounded">Setting</button>
        <button onClick={() => window.open('/kpi', '_blank')} className="px-3 py-1 hover:bg-slate-700 rounded">Statistics/Status</button>
        <button onClick={() => window.open('/visualize', '_blank')} className="px-3 py-1 hover:bg-slate-700 rounded">User Defined</button>
        <button onClick={() => window.open('/analysis', '_blank')} className="px-3 py-1 hover:bg-slate-700 rounded">Call Statistics</button>
        <button onClick={() => alert('Mobile Reset - Feature coming soon')} className="px-3 py-1 hover:bg-slate-700 rounded">Mobile Reset</button>
        <button onClick={() => window.open('/devices', '_blank')} className="px-3 py-1 hover:bg-slate-700 rounded">Window</button>
        <button onClick={() => window.open('/help', '_blank')} className="px-3 py-1 hover:bg-slate-700 rounded">Help</button>
      </div>

      {/* Toolbar */}
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-3 gap-2">
        <button 
          onClick={handleStartCapture}
          disabled={isCapturing || !currentContext}
          className={`px-4 py-1.5 rounded text-sm font-medium ${
            isCapturing || !currentContext
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          Start Capture
        </button>
        <button 
          disabled
          className="px-4 py-1.5 bg-gray-600 cursor-not-allowed rounded text-sm font-medium"
        >
          Pause
        </button>
        <button 
          onClick={handleStopCapture}
          disabled={!isCapturing}
          className={`px-4 py-1.5 rounded text-sm font-medium ${
            !isCapturing
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          Stop Capture
        </button>
        <div className="w-px h-8 bg-slate-600 mx-2" />
        <button 
          onClick={() => window.open('/kpi', '_blank')}
          className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          View KPIs
        </button>
        <button 
          onClick={() => window.open('/logs', '_blank')}
          className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          View Logs
        </button>
        <button 
          onClick={() => window.open('/visualize', '_blank')}
          className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          Visualize
        </button>
        <div className="flex-1" />
        <div className="text-sm">
          {statusMessage && <span className="text-yellow-400 mr-4">{statusMessage}</span>}
          <span className={devices.length > 0 ? 'text-green-400' : 'text-red-400'}>
            {devices.length > 0 ? `${devices.length} device(s) connected` : 'No devices - Check backend'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('devices')}
              className={`flex-1 px-3 py-2 text-xs font-semibold ${
                activeTab === 'devices' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-750'
              }`}
            >
              Devices List
            </button>
            <button
              onClick={() => setActiveTab('ports')}
              className={`flex-1 px-3 py-2 text-xs font-semibold ${
                activeTab === 'ports' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-750'
              }`}
            >
              Port Status
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto text-xs">
            {/* Mobile Section */}
            <div className="border-b border-slate-700">
              <button
                onClick={() => togglePanel('mobile')}
                className="w-full px-3 py-2 flex items-center text-sm font-semibold hover:bg-slate-750"
              >
                <span className="mr-2">{openPanels.mobile ? '▼' : '▶'}</span>
                Mobile
              </button>
              {openPanels.mobile && (
                <div className="px-3 py-1 space-y-1">
                  {devices.length === 0 ? (
                    <>
                      <div className="text-slate-500 px-2 py-1">Mobile 1 (SM-G991U)</div>
                      <div className="text-slate-500 px-2 py-1">Mobile 2</div>
                      <div className="text-slate-500 px-2 py-1">Mobile 3</div>
                      <div className="text-slate-500 px-2 py-1">Mobile 4</div>
                    </>
                  ) : (
                    devices.map((device, idx) => (
                      <button
                        key={device.deviceId}
                        onClick={() => deviceContext.setDevice(device.deviceId, device.model, device.manufacturer)}
                        className={`w-full text-left px-2 py-1.5 rounded ${
                          currentContext?.deviceId === device.deviceId
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        Mobile {idx + 1} ({device.deviceId})
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Scanner Section */}
            <div className="border-b border-slate-700">
              <button
                onClick={() => togglePanel('scanner')}
                className="w-full px-3 py-2 flex items-center text-sm font-semibold hover:bg-slate-750"
              >
                <span className="mr-2">{openPanels.scanner ? '▼' : '▶'}</span>
                Scanner
              </button>
              {openPanels.scanner && (
                <div className="px-3 py-1 space-y-1">
                  <div className="text-slate-400 px-2 py-1">Scanner 1</div>
                  <div className="text-slate-400 px-2 py-1">Scanner 2</div>
                </div>
              )}
            </div>

            {/* GPS Section */}
            <div className="border-b border-slate-700">
              <button
                onClick={() => togglePanel('gps')}
                className="w-full px-3 py-2 flex items-center text-sm font-semibold hover:bg-slate-750"
              >
                <span className="mr-2">{openPanels.gps ? '▼' : '▶'}</span>
                GPS
              </button>
            </div>

            {/* Supported KPIs Section */}
            <div className="border-b border-slate-700">
              <div className="px-3 py-2 text-sm font-semibold">Supported KPIs</div>
              <div className="px-3 pb-2">
                <input
                  type="text"
                  placeholder="Search Keyword"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-300 placeholder-slate-500"
                />
              </div>

              <div>
                {/* LBS Message */}
                <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                  <span className="mr-2 text-slate-500">▶</span>
                  LBS Message
                </div>

                {/* LCS Message */}
                <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                  <span className="mr-2 text-slate-500">▶</span>
                  LCS Message
                </div>

                {/* PPP Frame/Mobile Packet Message */}
                <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                  <span className="mr-2 text-slate-500">▶</span>
                  PPP Frame/Mobile Packet Message
                </div>

                {/* AirPCap Message */}
                <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                  <span className="mr-2 text-slate-500">▶</span>
                  AirPCap Message
                </div>

                {/* HTTP/SIP Message */}
                <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                  <span className="mr-2 text-slate-500">▶</span>
                  HTTP / SIP Message
                </div>

                {/* H.324m Message Viewer */}
                <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                  <span className="mr-2 text-slate-500">▶</span>
                  H.324m Message Viewer
                </div>

                {/* Layer3 KPI */}
                <div>
                  <button
                    onClick={() => toggleKpi('layer3')}
                    className="w-full px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center"
                  >
                    <span className="mr-2 text-slate-500">{expandedKpis.layer3 ? '▼' : '▶'}</span>
                    Layer3 KPI
                  </button>
                  {expandedKpis.layer3 && (
                    <div className="pl-6">
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">LTE</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">NAS</div>
                    </div>
                  )}
                </div>

                {/* RF KPI */}
                <div>
                  <button
                    onClick={() => toggleKpi('rf')}
                    className="w-full px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center"
                  >
                    <span className="mr-2 text-slate-500">{expandedKpis.rf ? '▼' : '▶'}</span>
                    RF KPI
                  </button>
                  {expandedKpis.rf && (
                    <div className="pl-6">
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">RF Measurement Summary Info</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">NRDC RF Measurement Summary Info</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR Beamforming Information</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">Benchmarking RF Summary</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">Dynamic Spectrum Sharing</div>
                    </div>
                  )}
                </div>

                {/* Qualcomm */}
                <div>
                  <button
                    onClick={() => toggleKpi('qualcomm')}
                    className="w-full px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center"
                  >
                    <span className="mr-2 text-slate-500">{expandedKpis.qualcomm ? '▼' : '▶'}</span>
                    Qualcomm
                  </button>
                  {expandedKpis.qualcomm && (
                    <div className="pl-6">
                      {/* Message */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        Message
                      </div>

                      {/* Qualcomm DM Message */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        Qualcomm DM Message
                      </div>

                      {/* Qualcomm Mobile Message */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        Qualcomm Mobile Message
                      </div>

                      {/* Qualcomm Event Report Message */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        Qualcomm Event Report Message
                      </div>

                      {/* Qualcomm QChat Message Viewer */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        Qualcomm QChat Message Viewer
                      </div>

                      {/* Qualcomm L2 RLC Messages */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        Qualcomm L2 RLC Messages
                      </div>

                      {/* Common-Q */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">Common-Q</div>

                      {/* 5GNR-Q */}
                      <button
                        onClick={() => toggleKpi('qualcomm-5gnr')}
                        className="w-full px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center"
                      >
                        <span className="mr-2 text-slate-500">{expandedKpis['qualcomm-5gnr'] ? '▼' : '▶'}</span>
                        5GNR-Q
                      </button>
                      {expandedKpis['qualcomm-5gnr'] && (
                        <div className="pl-6">
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR Information (MIB)</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR SIB Information (SIB1)</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR SigCell Information (Reconfig)</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR TDD UL DL Configuration</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR NSA RRC State</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR NSA Status Information</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR RRC State</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR SA Status Information</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR UE Capability</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR Failure Sets</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR SCG Mobility Statistics</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR EPS Fallback Statistics</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR Handover Statistics (Intra NR-HO)</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR Handover Event Information</div>
                          <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">5GNR SCell State</div>
                        </div>
                      )}

                      {/* LTE/Adv-Q Graph */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        LTE/Adv-Q Graph
                      </div>

                      {/* LTE/Adv-Q */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">LTE/Adv-Q</div>

                      {/* WCDMA Graph */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        WCDMA Graph
                      </div>

                      {/* WCDMA Statistics */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">WCDMA Statistics</div>

                      {/* WCDMA Status */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">WCDMA Status</div>

                      {/* WCDMA Layer 3 */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">WCDMA Layer 3</div>

                      {/* CDMA Graph */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                        <span className="mr-2 text-slate-500">▶</span>
                        CDMA Graph
                      </div>

                      {/* CDMA Statistics */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">CDMA Statistics</div>

                      {/* CDMA Status */}
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">CDMA Status</div>
                    </div>
                  )}
                </div>

                {/* Smart App (NO XCAL BRANDING) */}
                <div>
                  <button
                    onClick={() => toggleKpi('smartapp')}
                    className="w-full px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center"
                  >
                    <span className="mr-2 text-slate-500">{expandedKpis.smartapp ? '▼' : '▶'}</span>
                    Smart App
                  </button>
                  {expandedKpis.smartapp && (
                    <div className="pl-6">
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">Smart App Message List</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">Smart App Status</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">Smart App Bluetooth LE Status</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">Smart Standalone Mode Setting</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">WiFi Scan List</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">WCDMA RF Info</div>
                      <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer">WiFi Info</div>
                    </div>
                  )}
                </div>

                {/* Autocall KPI */}
                <div className="px-3 py-1 hover:bg-slate-750 cursor-pointer flex items-center">
                  <span className="mr-2 text-slate-500">▶</span>
                  Autocall KPI
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="border-t border-slate-700 p-2 flex gap-2">
            <button 
              onClick={() => alert('Airplane mode toggle - Feature coming soon')}
              className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
            >
              Airplane
            </button>
            <button 
              onClick={() => alert('Mobile reset - Feature coming soon')}
              className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
            >
              Mobile Reset
            </button>
          </div>
          <div className="border-t border-slate-700 p-2 flex gap-2">
            <button 
              onClick={() => setOpenPanels({mobile: true, scanner: true, gps: true, kpis: true})}
              className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
            >
              Select All
            </button>
            <button 
              onClick={() => setOpenPanels({mobile: false, scanner: false, gps: false, kpis: false})}
              className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
            >
              Unselect All
            </button>
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col bg-slate-900">
          {/* Panel Tabs */}
          <div className="flex bg-slate-800 border-b border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActivePanelTab('signaling')}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                activePanelTab === 'signaling'
                  ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Signaling Message
            </button>
            <button
              onClick={() => setActivePanelTab('rf')}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                activePanelTab === 'rf'
                  ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RF Measurement Summary Info
            </button>
            <button
              onClick={() => setActivePanelTab('5gnr-mib')}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                activePanelTab === '5gnr-mib'
                  ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              5GNR Information (MIB)
            </button>
            <button
              onClick={() => setActivePanelTab('5gnr-sib')}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                activePanelTab === '5gnr-sib'
                  ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              5GNR SIB Information (SIB1)
            </button>
            <button
              onClick={() => setActivePanelTab('5gnr-capability')}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                activePanelTab === '5gnr-capability'
                  ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              5GNR UE Capability
            </button>
            <button
              onClick={() => setActivePanelTab('user-graph')}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                activePanelTab === 'user-graph'
                  ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              User Defined Graph
            </button>
            <button
              onClick={() => setActivePanelTab('terminal')}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                activePanelTab === 'terminal'
                  ? 'bg-slate-900 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Terminal Logs
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {activePanelTab === 'signaling' && (
              <SignalingMessageViewer sessionId={currentContext?.sessionId?.toString() || null} />
            )}
            {activePanelTab === 'rf' && (
              <div className="h-full p-4 overflow-auto">
                {currentContext?.sessionId ? (
                  <iframe 
                    src={`/kpi?session=${currentContext.sessionId}`} 
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center text-slate-500">Start a capture to view RF measurements</div>
                )}
              </div>
            )}
            {activePanelTab === '5gnr-mib' && (
              <div className="h-full p-4 overflow-auto">
                {sessionId ? (
                  <iframe 
                    src={`/5gnr?session=${sessionId}`} 
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center text-slate-500">Start a capture to view 5GNR MIB data</div>
                )}
              </div>
            )}
            {activePanelTab === '5gnr-sib' && (
              <div className="h-full p-4 overflow-auto">
                {sessionId ? (
                  <iframe 
                    src={`/5gnr?session=${sessionId}&tab=sib`} 
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center text-slate-500">Start a capture to view 5GNR SIB1 data</div>
                )}
              </div>
            )}
            {activePanelTab === '5gnr-capability' && (
              <div className="h-full p-4 overflow-auto">
                {sessionId ? (
                  <iframe 
                    src={`/5gnr?session=${sessionId}&tab=capability`} 
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center text-slate-500">Start a capture to view UE Capability</div>
                )}
              </div>
            )}
            {activePanelTab === 'user-graph' && (
              <div className="h-full p-4 overflow-auto">
                {sessionId ? (
                  <iframe 
                    src={`/visualize?session=${sessionId}`} 
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center text-slate-500">Start a capture to view graphs</div>
                )}
              </div>
            )}
            {activePanelTab === 'terminal' && (
              <EnhancedTerminal sessionId={currentContext?.sessionId?.toString() || null} />
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-blue-600 text-white flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-4">
          <span className={isCapturing ? 'text-white font-bold' : 'text-red-300'}>
            {isCapturing ? `🔴 CAPTURING - Session ${currentContext?.sessionId}` : 'No Logging'}
          </span>
          <span className={currentContext ? 'text-white' : 'text-red-300'}>
            Device: {currentContext?.deviceId || 'None'}
          </span>
          <span className="text-white">{devices.length} device(s)</span>
        </div>
        <div>Extended Cellular Analyzer v0.1.0 | Backend: {devices.length > 0 ? '✓ Connected' : '✗ Disconnected'}</div>
      </div>
    </div>
  )
}
