"use client"
import { useState } from 'react'
import { api } from '@/utils/api'
import { platformApi } from '@/utils/tauri-api'

interface ConvertViewProps {
  theme?: 'light' | 'dark'
  onSessionCreated?: (sessionIds: string[]) => void
}

export default function ConvertView({ theme = 'light', onSessionCreated }: ConvertViewProps) {
  const [mode, setMode] = useState<'convert' | 'analyze'>('convert')
  
  // Convert mode state
  const [file, setFile] = useState<File | null>(null)
  const [detectedFormat, setDetectedFormat] = useState<string>('')
  const [converting, setConverting] = useState(false)
  const [convertResult, setConvertResult] = useState<any>(null)
  
  // Analyze mode state
  const [pcapFiles, setPcapFiles] = useState<File[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<any>(null)
  
  const [error, setError] = useState<string|null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const bgMain = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
  const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'

  const detectFormat = (filename: string): string => {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.qmdl')) return 'Qualcomm QMDL'
    if (lower.endsWith('.qmdl2')) return 'Qualcomm QMDL2'
    if (lower.endsWith('.sdm')) return 'Samsung SDM'
    if (lower.endsWith('.lpd')) return 'HiSilicon LPD'
    return 'Unknown'
  }

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setDetectedFormat(detectFormat(selectedFile.name))
    setConvertResult(null)
    setError(null)
  }

  const handleConvert = async () => {
    if (!file) { alert('Please select a file'); return }
    setConverting(true)
    setError(null)
    setConvertResult(null)
    
    try {
      const res = await api.convertOfflineLog(file)
      setConvertResult(res)
      
      if (!res?.success) {
        setError(res?.message || 'Conversion failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConverting(false)
    }
  }

  const handleDownloadPcap = async () => {
    if (!convertResult?.pcapPath) return
    
    try {
      const filename = convertResult.pcapPath.split(/[\\/]/).pop() || 'converted.pcap'
      
      // Browser download
      const blob = await api.downloadConvertedFile(convertResult.pcapPath)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      alert(`💾 Downloaded: ${filename}`)
    } catch (err: any) {
      alert('❌ Download failed: ' + err.message)
    }
  }

  const handleAnalyzePcap = async (pcapPath?: string) => {
    const filesToAnalyze = pcapPath ? [new File([], pcapPath)] : pcapFiles
    if (filesToAnalyze.length === 0) { alert('Please select PCAP file(s)'); return }
    
    setAnalyzing(true)
    setError(null)
    try {
      const res = await api.uploadPcapForAnalysis(filesToAnalyze[0])
      setAnalyzeResult(res)
      if (res?.success && res?.sessionId) {
        onSessionCreated?.([res.sessionId])
        alert(`✅ Analysis complete!\n${res.kpisAvailable?.length || 0} KPIs extracted\n\n👈 Use sidebar to view data`)
      } else {
        setError(res?.message || 'Analysis failed')
      }
    } catch (err: any) {
      setError(err.message)
      alert('❌ Analysis failed: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className={`flex flex-col h-full ${bgMain}`}>
      {/* Header with mode toggle */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Convert & Analyze</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setMode('convert'); setError(null) }}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${mode === 'convert' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              📁 Convert Logs
            </button>
            <button
              onClick={() => { setMode('analyze'); setError(null) }}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${mode === 'analyze' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              📊 Analyze PCAP
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          {mode === 'convert' ? 'Convert baseband logs to PCAP with GSMTAP layers' : 'Upload PCAP files for KPI extraction and analysis'}
        </p>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        {mode === 'convert' ? (
          /* CONVERT MODE */
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Upload area */}
            <div
              className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600'} rounded-lg p-8 flex flex-col items-center cursor-pointer transition-colors`}
              onClick={() => document.getElementById('fileInput')?.click()}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) handleFileSelect(f)
              }}
            >
              <div className="text-5xl mb-4">📁</div>
              <div className="text-base font-medium mb-2">Drop baseband log here or click to upload</div>
              <div className="text-sm text-gray-400 mb-4">Auto-detects: .qmdl, .qmdl2, .sdm, .lpd</div>
              <input 
                id="fileInput" 
                type="file" 
                accept=".qmdl,.qmdl2,.sdm,.lpd" 
                className="hidden" 
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }} 
              />
              
              {file && (
                <div className={`mt-4 p-4 ${cardBg} border rounded-lg w-full`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-400 mb-1">Selected File</div>
                      <div className="font-mono text-blue-400 text-sm mb-1">{file.name}</div>
                      <div className="text-xs text-gray-500">{(file.size/1024/1024).toFixed(2)} MB</div>
                      {detectedFormat && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-700 rounded text-xs text-green-300">
                          <span>✓</span>
                          <span>Detected: {detectedFormat}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setFile(null); 
                        setDetectedFormat('');
                        setConvertResult(null);
                      }}
                      className="ml-4 px-3 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Convert button */}
            <div className="flex justify-center">
              <button
                onClick={handleConvert}
                disabled={!file || converting}
                className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 font-medium transition-colors"
              >
                {converting ? '⏳ Converting...' : '🔄 Convert to PCAP'}
              </button>
            </div>

            {/* Progress indicator */}
            {converting && (
              <div className={`p-4 ${cardBg} border rounded-lg`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  <span className="text-sm font-medium">Converting {file?.name}...</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Estimated time: {file ? Math.ceil(file.size / 1024 / 1024 * 3) : 15} seconds
                  <br/>
                  Processing with SCAT + extracting KPIs...
                </div>
              </div>
            )}

            {/* Convert result */}
            {convertResult?.success && (
              <div className={`p-4 ${cardBg} border rounded-lg`}>
                <div className="text-green-400 font-medium mb-3 flex items-center gap-2">
                  <span>✅</span>
                  <span>Conversion Complete</span>
                </div>
                <div className="text-sm text-gray-300 mb-4">
                  <div className="mb-1">Output: <span className="font-mono text-blue-400">{convertResult.pcapPath.split(/[\\/]/).pop()}</span></div>
                  <div className="text-xs text-gray-500">Full path: {convertResult.pcapPath}</div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadPcap}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
                  >
                    💾 Download PCAP
                  </button>
                  <button
                    onClick={() => handleAnalyzePcap(convertResult.pcapPath)}
                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-sm font-medium transition-colors"
                  >
                    📊 Analyze KPIs
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ANALYZE MODE */
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* PCAP upload area */}
            <div
              className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600'} rounded-lg p-8 flex flex-col items-center cursor-pointer transition-colors`}
              onClick={() => document.getElementById('pcapInput')?.click()}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const files = Array.from(e.dataTransfer.files || []) as File[]
                setPcapFiles(files.filter(f => f.name.endsWith('.pcap') || f.name.endsWith('.pcapng')))
              }}
            >
              <div className="text-5xl mb-4">📊</div>
              <div className="text-base font-medium mb-2">Drop PCAP file(s) here or click to upload</div>
              <div className="text-sm text-gray-400 mb-4">Supports .pcap, .pcapng</div>
              <input
                id="pcapInput"
                type="file"
                accept=".pcap,.pcapng"
                multiple
                className="hidden"
                onChange={(e) => setPcapFiles(Array.from(e.target.files || []))}
              />
              {pcapFiles.length > 0 && (
                <div className={`mt-4 p-4 ${cardBg} border rounded-lg w-full`}>
                  <div className="text-sm text-gray-400 mb-2">Selected Files ({pcapFiles.length})</div>
                  <div className="space-y-2">
                    {pcapFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex-1">
                          <span className="font-mono text-blue-400">{f.name}</span>
                          <span className="text-gray-500 ml-2">({(f.size/1024/1024).toFixed(2)} MB)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analyze button */}
            <div className="flex justify-center">
              <button
                onClick={() => handleAnalyzePcap()}
                disabled={pcapFiles.length === 0 || analyzing}
                className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 font-medium transition-colors"
              >
                {analyzing ? '⏳ Analyzing PCAP...' : '🔍 Extract KPIs'}
              </button>
            </div>

            {/* Analyze result */}
            {analyzeResult?.success && (
              <div className={`p-4 ${cardBg} border rounded-lg`}>
                <div className="text-green-400 font-medium mb-3 flex items-center gap-2">
                  <span>✅</span>
                  <span>Analysis Complete</span>
                </div>
                <div className="text-sm text-gray-300 space-y-2 mb-4">
                  <div>Session ID: <span className="font-mono text-blue-400">{analyzeResult.sessionId}</span></div>
                  <div>KPIs Extracted: <span className="font-mono text-blue-400">{analyzeResult.kpisAvailable?.length || 0}</span></div>
                  {analyzeResult.kpisAvailable && analyzeResult.kpisAvailable.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 mb-2">Available KPIs:</div>
                      <div className="flex flex-wrap gap-1">
                        {analyzeResult.kpisAvailable.slice(0, 10).map((kpi: string) => (
                          <span key={kpi} className="px-2 py-1 bg-gray-700 rounded text-xs">{kpi}</span>
                        ))}
                        {analyzeResult.kpisAvailable.length > 10 && (
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs">+{analyzeResult.kpisAvailable.length - 10} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-700 rounded text-sm text-blue-300">
                  <span>👈</span>
                  <span>Use the sidebar to view extracted KPIs (LTE RRC, NAS, RF, etc.)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-300 max-w-3xl mx-auto">
            <div className="font-medium mb-1">❌ Error</div>
            <div>{error}</div>
          </div>
        )}
      </div>
    </div>
  )
}
