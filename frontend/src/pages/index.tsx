import { useState, useEffect } from 'react'
import MenuBar from '@/components/MenuBar'
import IconToolbar from '@/components/IconToolbar'
import EnhancedSidebar from '@/components/EnhancedSidebar'
import ModularDashboard from '@/components/ModularDashboard'
import ProfessionalRFSummary from '@/components/ProfessionalRFSummary'
import SignalingMessageViewer from '@/components/SignalingMessageViewer'
import EnhancedTerminal from '@/components/EnhancedTerminal'
import ProfessionalKPICharts from '@/components/ProfessionalKPICharts'
import MapView from '@/components/MapView'
import DetailedConfigTables from '@/components/DetailedConfigTables'
import MultiGraphView from '@/components/MultiGraphView'
import SystemStatusBar from '@/components/SystemStatusBar'
import AlertNotification from '@/components/AlertNotification'
import SessionControlPanel from '@/components/SessionControlPanel'
import { api } from '@/utils/api'

export default function Home() {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [devices, setDevices] = useState<any[]>([])

  // Poll for devices every 3 seconds
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devs = await api.getDevices()
        setDevices(devs)
      } catch (err) {
        console.error('Failed to fetch devices:', err)
      }
    }

    fetchDevices()
    const interval = setInterval(fetchDevices, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSessionStart = (session: any) => {
    setCurrentSession(session)
  }

  const handleSessionStop = () => {
    setCurrentSession(null)
  }

  const sessionId = currentSession?.id?.toString() || selectedDevices[0]

  const availableComponents = {
    'rf-summary': <ProfessionalRFSummary deviceId={selectedDevices[0]} />,
    'signaling': <SignalingMessageViewer sessionId={sessionId} />,
    'terminal': <EnhancedTerminal sessionId={sessionId} />,
    'graphs': <MultiGraphView sessionId={sessionId} />,
    'config': <DetailedConfigTables sessionId={sessionId} />,
    'map': <MapView sessionId={sessionId} />,
    'kpi-charts': <ProfessionalKPICharts sessionId={sessionId} />,
    'session-control': (
      <SessionControlPanel
        deviceId={selectedDevices[0] || null}
        sessionId={currentSession?.id || null}
        onSessionStart={handleSessionStart}
        onSessionStop={handleSessionStop}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <MenuBar />
      <IconToolbar />
      
      <div className="flex flex-1 overflow-hidden">
        <EnhancedSidebar 
          onDeviceSelect={setSelectedDevices}
          onKpiSelect={(kpi) => console.log('KPI selected:', kpi)}
        />
        
        <main className="flex-1 overflow-hidden">
          <ModularDashboard 
            sessionId={sessionId}
            availableComponents={availableComponents}
          />
        </main>
      </div>

      <SystemStatusBar />
      <AlertNotification />
    </div>
  )
}


