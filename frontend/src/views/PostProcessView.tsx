"use client"
import { useState } from 'react'
import { api } from '@/utils/api'

interface PostProcessViewProps {
  onSessionCreated: (sessionIds: string[]) => void
}

export default function PostProcessView({ onSessionCreated }: PostProcessViewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleAnalyze = async () => {
    if (!file) {
      alert('Please select a PCAP file first')
      return
    }

    setAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const res = await api.uploadPcapForAnalysis(file)
      setResult(res)

      if (res?.success && res?.sessionId) {
        // Notify parent that session was created
        onSessionCreated([res.sessionId])
        alert(`Analysis complete! ${res.kpisAvailable?.length || 0} KPIs extracted. Use sidebar to view data.`)
      } else {
        setError(res?.message || 'Analysis failed')
        alert('Analysis failed: ' + (res?.message || 'Unknown error'))
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed')
      alert('Analysis failed: ' + (err?.message || 'Unknown error'))
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="px-6 py-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold">Post-Process PCAP</h1>
        <p className="text-sm text-gray-400">Upload PCAP file to extract KPIs and analyze network data</p>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-4 overflow-auto">
        {/* Upload area */}
        <div
          className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600'} rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors`}
          onClick={() => document.getElementById('pcapInput')?.click()}
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const files = Array.from(e.dataTransfer.files || []) as File[]
            const pcap = files.find(f => f.name.toLowerCase().endsWith('.pcap') || f.name.toLowerCase().endsWith('.pcapng'))
            if (pcap) setFile(pcap)
          }}
        >
          <div className={`w-16 h-16 mb-4 rounded-full border-2 flex items-center justify-center text-3xl ${isDragging ? 'border-blue-500 text-blue-500' : 'border-gray-500 text-gray-500'}`}>
            📊
          </div>
          <div className="text-lg font-medium mb-2">Drop PCAP file here or click to upload</div>
          <div className="text-sm text-gray-400 mb-6">Supports .pcap and .pcapng files</div>
          <label
            htmlFor="pcapInput"
            className="inline-flex items-center px-6 py-2 rounded-lg border border-gray-600 bg-gray-800 text-sm font-medium hover:bg-gray-700 cursor-pointer"
          >
            Browse Files
          </label>
          <input
            id="pcapInput"
            type="file"
            accept=".pcap,.pcapng"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="mt-4 text-sm text-gray-300 flex items-center gap-2">
              <span>Selected: <span className="font-mono text-blue-400">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              <button
                type="button"
                className="ml-2 px-2 py-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Analyze button */}
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 font-medium transition-colors"
          >
            {analyzing ? '⏳ Analyzing...' : '🔍 Analyze PCAP'}
          </button>
        </div>

        {/* Results */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-300">
            ❌ Error: {error}
          </div>
        )}

        {result && result.success && (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="text-green-300 font-medium mb-2">✅ Analysis Complete</div>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Session ID: <span className="font-mono text-blue-400">{result.sessionId}</span></div>
              <div>KPIs Extracted: <span className="font-mono text-blue-400">{result.kpisAvailable?.length || 0}</span></div>
              {result.kpisAvailable && result.kpisAvailable.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-400 mb-1">Available KPIs:</div>
                  <div className="flex flex-wrap gap-1">
                    {result.kpisAvailable.map((kpi: string) => (
                      <span key={kpi} className="px-2 py-1 bg-gray-800 rounded text-xs">{kpi}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-400">
              👈 Use the sidebar to view extracted data
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
