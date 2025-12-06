import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import RFMeasurementSummary from '@/components/RFMeasurementSummary'
import SignalingMessage from '@/components/SignalingMessage'
import UserDefinedGraph from '@/components/UserDefinedGraph'
import Toolbar from '@/components/Toolbar'
import StatusBar from '@/components/StatusBar'

export default function Home() {
  const [activeTab, setActiveTab] = useState('rf-summary')
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Toolbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          selectedDevice={selectedDevice}
          onDeviceSelect={setSelectedDevice}
        />
        
        <main className="flex-1 flex flex-col">
          <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('rf-summary')}
              className={`px-4 py-2 rounded ${activeTab === 'rf-summary' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              RF Measurement Summary
            </button>
            <button
              onClick={() => setActiveTab('signaling')}
              className={`px-4 py-2 rounded ${activeTab === 'signaling' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Signaling Message
            </button>
            <button
              onClick={() => setActiveTab('graphs')}
              className={`px-4 py-2 rounded ${activeTab === 'graphs' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              User Defined Graph
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === 'rf-summary' && <RFMeasurementSummary deviceId={selectedDevice} />}
            {activeTab === 'signaling' && <SignalingMessage deviceId={selectedDevice} />}
            {activeTab === 'graphs' && <UserDefinedGraph deviceId={selectedDevice} />}
          </div>
        </main>
      </div>

      <StatusBar />
    </div>
  )
}
