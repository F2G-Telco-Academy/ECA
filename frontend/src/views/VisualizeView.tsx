"use client"
import { useState } from 'react'
import { api } from '@/utils/api'
import dynamic from 'next/dynamic'

const SignalingViewer = dynamic(() => import('@/components/SignalingViewer'), { ssr: false })
const TerminalViewer = dynamic(() => import('@/components/TerminalViewer'), { ssr: false })
const RFSummary = dynamic(() => import('@/components/RFSummary'), { ssr: false })
const QualcommViewer = dynamic(() => import('@/components/QualcommViewer'), { ssr: false })
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })
const TabulatedKPIView = dynamic(() => import('@/components/TabulatedKPIView'), { ssr: false })
const UserDefinedTable = dynamic(() => import('@/components/UserDefinedTable'), { ssr: false })
const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false })

interface VisualizeViewProps {
  selectedView?: string
}

export default function VisualizeView({ selectedView = 'RF Measurement Summary Info' }: VisualizeViewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kpisAvailable, setKpisAvailable] = useState<string[]>([])

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a PCAP file first')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const result = await api.uploadPcapForAnalysis(file)
      
      if (result.success) {
        setSessionId(result.sessionId)
        setKpisAvailable(result.kpisAvailable || [])
      } else {
        setError(result.message || 'Failed to process PCAP')
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const renderView = () => {
    if (!sessionId) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg mb-2">No PCAP Loaded</div>
            <div className="text-sm">Upload a PCAP file to start offline analysis</div>
          </div>
        </div>
      )
    }

    // Check if selected KPI is available in the PCAP
    const isAvailable = kpisAvailable.length === 0 || kpisAvailable.some(kpi => 
      selectedView.toLowerCase().includes(kpi.toLowerCase()) || 
      kpi.toLowerCase().includes(selectedView.toLowerCase())
    )

    if (!isAvailable) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400 bg-white">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-xl font-semibold mb-2 text-gray-700">KPI Not Available</div>
            <div className="text-sm mb-4 text-gray-600">
              <span className="font-medium">"{selectedView}"</span> was not found in this PCAP file
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
              <div className="font-medium mb-2">Available KPIs in this PCAP:</div>
              {kpisAvailable.length > 0 ? (
                <div className="space-y-1">
                  {kpisAvailable.map(kpi => (
                    <div key={kpi} className="text-green-600">✓ {kpi}</div>
                  ))}
                </div>
              ) : (
                <div>Processing KPIs...</div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Map view names to components
    const viewComponentMap: Record<string, () => JSX.Element> = {
      'Signaling Message': () => <SignalingViewer sessionId={sessionId} />,
      'Terminal Logs': () => <TerminalViewer sessionId={sessionId} />,
      'RF Measurement Summary Info': () => <RFSummary sessionId={sessionId} />,
      'NRDC RF Measurement Summary Info': () => <RFSummary sessionId={sessionId} />,
      'Qualcomm DM Message': () => <QualcommViewer sessionId={sessionId} />,
      'Qualcomm Mobile Message': () => <QualcommViewer sessionId={sessionId} />,
      'User Defined Table': () => <UserDefinedTable sessionId={sessionId} />,
      'User Defined Graph': () => <GraphView sessionId={sessionId} />,
      'Map View': () => <MapView sessionId={sessionId} />,
    }

    // Check for Layer3 KPI views (5GNR, LTE, etc.)
    if (selectedView.includes('5GNR') || selectedView.includes('LTE') || selectedView.includes('NAS')) {
      return <TabulatedKPIView sessionId={sessionId} kpiType={selectedView} />
    }

    const ViewComponent = viewComponentMap[selectedView]
    if (ViewComponent) {
      return ViewComponent()
    }

    // Default fallback
    return <RFSummary sessionId={sessionId} />
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Upload Section - shown when no PCAP loaded */}
      {!sessionId ? (
        <>
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <h1 className="text-lg font-semibold">Offline PCAP Analysis</h1>
            <p className="text-sm text-gray-500">Upload PCAP files to extract and visualize KPIs</p>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
                <div className="text-center">
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-lg font-medium mb-2">Upload PCAP File</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Select a PCAP file from your baseband log conversion
                  </p>
                  
                  <input
                    type="file"
                    accept=".pcap,.pcapng"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="pcapInput"
                  />
                  
                  <label
                    htmlFor="pcapInput"
                    className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer mb-4"
                  >
                    Choose PCAP File
                  </label>

                  {file && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900">
                        Selected: {file.name}
                      </div>
                      <div className="text-xs text-blue-700">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Processing...' : 'Analyze PCAP'}
                  </button>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Analysis View - PCAP loaded, show selected KPI */
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      )}
    </div>
  )
}
