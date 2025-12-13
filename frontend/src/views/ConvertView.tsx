"use client"
import { useState } from 'react'
import { api } from '@/utils/api'

interface ConvertViewProps {
  theme?: 'light' | 'dark'
  onSessionCreated?: (sessionIds: string[]) => void
}

export default function ConvertView({ theme = 'light', onSessionCreated }: ConvertViewProps) {
  const [mode, setMode] = useState<'convert' | 'analyze'>('convert')
  
  // Convert mode state
  const [file, setFile] = useState<File | null>(null)
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

  const handleConvert = async () => {
    if (!file) { alert('Please select a file'); return }
    setConverting(true)
    setError(null)
    try {
      const res = await api.convertOfflineLog(file)
      setConvertResult(res)
      if (res?.success) {
        alert(`Conversion successful! PCAP: ${res.pcapPath}`)
      } else {
        setError(res?.message || 'Conversion failed')
      }
    } catch (err: any) {
      setError(err.message)
      alert('Conversion failed: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  const handleAnalyzePcap = async (pcapPath?: string) => {
    const filesToAnalyze = pcapPath ? [new File([], pcapPath)] : pcapFiles
    if (filesToAnalyze.length === 0) { alert('Please select PCAP file(s)'); return }
    
    setAnalyzing(true)
    setError(null)
    try {
      // Analyze first file (can extend to multiple later)
      const res = await api.uploadPcapForAnalysis(filesToAnalyze[0])
      setAnalyzeResult(res)
      if (res?.success && res?.sessionId) {
        onSessionCreated?.([res.sessionId])
        alert(`Analysis complete! ${res.kpisAvailable?.length || 0} KPIs extracted. Use sidebar to view.`)
      } else {
        setError(res?.message || 'Analysis failed')
      }
    } catch (err: any) {
      setError(err.message)
      alert('Analysis failed: ' + err.message)
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
              onClick={() => setMode('convert')}
              className={`px-4 py-1.5 rounded text-sm ${mode === 'convert' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Convert Logs
            </button>
            <button
              onClick={() => setMode('analyze')}
              className={`px-4 py-1.5 rounded text-sm ${mode === 'analyze' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Analyze PCAP
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          {mode === 'convert' ? 'Convert baseband logs to PCAP format' : 'Upload PCAP files for KPI analysis'}
        </p>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        {mode === 'convert' ? (
          /* CONVERT MODE */
          <div className="space-y-4">
            {/* Upload area */}
            <div
              className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600'} rounded-lg p-8 flex flex-col items-center cursor-pointer`}
              onClick={() => document.getElementById('fileInput')?.click()}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) setFile(f)
              }}
            >
              <div className="text-4xl mb-3">📁</div>
              <div className="text-sm font-medium mb-1">Drop baseband log here or click to upload</div>
              <div className="text-xs text-gray-400 mb-4">Auto-detects: .qmdl, .qmdl2, .sdm</div>
              <input id="fileInput" type="file" accept=".qmdl,.qmdl2,.sdm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file && (
                <div className="mt-3 text-sm flex items-center gap-2">
                  <span className="font-mono text-blue-400">{file.name}</span>
                  <span className="text-gray-500">({(file.size/1024/1024).toFixed(2)} MB)</span>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-red-400 hover:text-red-300">✕</button>
                </div>
              )}
            </div>

            {/* Convert button */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleConvert}
                disabled={!file || converting}
                className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500"
              >
                {converting ? '⏳ Converting...' : '🔄 Convert to PCAP'}
              </button>
            </div>

            {/* Convert result */}
            {convertResult?.success && (
              <div className={`p-4 ${cardBg} border rounded-lg`}>
                <div className="text-green-400 font-medium mb-2">✅ Conversion Complete</div>
                <div className="text-sm text-gray-300 mb-3">
                  PCAP: <span className="font-mono text-blue-400">{convertResult.pcapPath}</span>
                </div>
                <button
                  onClick={() => handleAnalyzePcap(convertResult.pcapPath)}
                  className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-sm"
                >
                  📊 Analyze this PCAP
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ANALYZE MODE */
          <div className="space-y-4">
            {/* PCAP upload area */}
            <div
              className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600'} rounded-lg p-8 flex flex-col items-center cursor-pointer`}
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
              <div className="text-4xl mb-3">📊</div>
              <div className="text-sm font-medium mb-1">Drop PCAP file(s) here or click to upload</div>
              <div className="text-xs text-gray-400 mb-4">Supports .pcap, .pcapng</div>
              <input
                id="pcapInput"
                type="file"
                accept=".pcap,.pcapng"
                multiple
                className="hidden"
                onChange={(e) => setPcapFiles(Array.from(e.target.files || []))}
              />
              {pcapFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  {pcapFiles.map((f, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <span className="font-mono text-blue-400">{f.name}</span>
                      <span className="text-gray-500">({(f.size/1024/1024).toFixed(2)} MB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analyze button */}
            <div className="flex justify-center">
              <button
                onClick={() => handleAnalyzePcap()}
                disabled={pcapFiles.length === 0 || analyzing}
                className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500"
              >
                {analyzing ? '⏳ Analyzing...' : '🔍 Analyze PCAP'}
              </button>
            </div>

            {/* Analyze result */}
            {analyzeResult?.success && (
              <div className={`p-4 ${cardBg} border rounded-lg`}>
                <div className="text-green-400 font-medium mb-2">✅ Analysis Complete</div>
                <div className="text-sm text-gray-300 space-y-1 mb-3">
                  <div>Session: <span className="font-mono text-blue-400">{analyzeResult.sessionId}</span></div>
                  <div>KPIs: <span className="font-mono text-blue-400">{analyzeResult.kpisAvailable?.length || 0}</span></div>
                </div>
                <div className="text-sm text-gray-400">👈 Use sidebar to view extracted KPIs</div>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  )
}
  const [file, setFile] = useState<File | null>(null)
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string|null>(null)
  const [queue, setQueue] = useState<{name:string; size:number; type:string; status:string; progress:number}[]>([])
  const [inputFormat, setInputFormat] = useState<string>('')
  const [outputFormat, setOutputFormat] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [lastPcapPath, setLastPcapPath] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Background/card styles derived from theme
  const bgMain = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
  const cardBg = theme === 'dark' ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-200'

  const handleConvert = async () => {
    if (!file) { alert('Please select a file first'); return }
    if (!inputFormat) { alert('Please choose an input format'); return }
    if (!outputFormat) { alert('Please choose an output format'); return }

    setConverting(true); setError(null); setResult(null)
    setQueue(prev => [{ name: file.name, size: file.size, type: inputFormat.toUpperCase(), status: 'Converting', progress: 15 }, ...prev])
    try {
      const res = await api.convertOfflineLog(file)
      setResult(res)

      // Capture PCAP path whenever backend returns one
      if (res?.pcapPath) {
        setLastPcapPath(res.pcapPath)
      }

      // Only treat as logical success in the UI if backend says success
      if (!res?.success) {
        setError(res?.message || 'Conversion failed')
        setQueue(prev => prev.map(it => it.name===file.name ? { ...it, status: 'Failed', progress: 0 } : it))
        alert('Conversion failed: ' + (res?.message || 'Unknown error'))
      } else {
        setQueue(prev => prev.map(it => it.name===file.name ? { ...it, status: 'Completed', progress: 100 } : it))
        alert(`Conversion successful! PCAP saved to: ${res.pcapPath}`)
      }
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
      setQueue(prev => prev.map(it => it.name===file?.name ? { ...it, status: 'Failed', progress: 0 } : it))
      alert('Conversion failed: ' + (err?.message || 'Unknown error'))
    } finally { setConverting(false) }
  }

  const handleSave = async () => {
    if (!lastPcapPath) return
    try {
      // Always provide a direct download to local storage
      const blob = await api.downloadConvertedFile(lastPcapPath)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = lastPcapPath.split(/[\\/]/).pop() || 'converted.pcap'
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      // Optional: additionally open the folder in Tauri environment
      if (platformApi) {
        try {
          await platformApi.openFileLocation(lastPcapPath)
          setSaveMessage(`Opened folder: ${filename}`)
          setTimeout(() => setSaveMessage(null), 3500)
        } catch {}
      }
      // If no platform open was attempted, still show a saved/downloaded confirmation
      setSaveMessage(`Saved: ${filename}`)
      setTimeout(() => setSaveMessage(null), 3500)
    } catch (e: any) {
      alert('Failed to open converted file location: ' + (e?.message || 'Unknown error'))
    }
  }

  // Helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderQueueRow = (it: any, idx: number) => {
    return (
      <tr key={`${it.name}-${idx}`} className="border-b">
        <td className="px-3 py-2">{it.name}</td>
        <td className="px-3 py-2">{it.type}</td>
        <td className="px-3 py-2 text-right">{formatBytes(it.size)}</td>
        <td className="px-3 py-2">{it.status}</td>
        <td className="px-3 py-2 w-48">
          <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
            <div
              className={`${it.status === 'Failed' ? 'bg-red-500' : it.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'} h-2`}
              style={{ width: `${Math.max(0, Math.min(100, it.progress || 0))}%` }}
            />
          </div>
        </td>
      </tr>
    )
  }

  const handleRemove = () => {
    if (file) {
      setFile(null)
      setInputFormat('')
      setOutputFormat('')
      return
    }

    setQueue((q) => q.slice(1))
  }

  return (
    <div className={`flex flex-col h-full pb-16 md:pb-0 ${bgMain}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Convert Capture Files</h1>
        <p className="text-sm text-gray-500">Convert network capture files between different formats</p>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-2 border-b border-gray-200 bg-gray-50 text-sm flex items-center gap-2">
        <button
          className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400 disabled:opacity-50"
          onClick={() => {
            // In browser: trigger file input (like Add)
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.click();
            // In Tauri: you could use dialog.open with a default path if needed
          }}
        >
          📂 Open
        </button>
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400" onClick={()=>document.getElementById('fileInput')?.click()}>➕ Add</button>
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400" onClick={() => handleRemove()}>➖ Remove</button>
        <span className="mx-2 w-px h-5 bg-gray-200"/>
        <button
          className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400 disabled:opacity-50"
          onClick={handleConvert}
          disabled={!file || !inputFormat || !outputFormat || converting}
        >
          {converting ? '⏳ Converting' : '▶️ Start'}
        </button>
        <button
          className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400 disabled:opacity-50"
          disabled={!file || !inputFormat || !outputFormat}
        >
          ⏹ Stop
        </button>
        <span className="mx-2 w-px h-5 bg-gray-200"/>
        <button
          className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400 disabled:opacity-50"
          disabled={!lastPcapPath}
          onClick={handleSave}
        >
          💾 Save
        </button>
          {saveMessage && (
            <div className="ml-3 px-3 py-1 rounded text-xs text-green-700 bg-green-50 border border-green-100">
              {saveMessage}
            </div>
          )}
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col gap-4 overflow-auto">
        {/* Conversion Settings */}
        <div className="border border-gray-200 rounded bg-white p-4">
          <div className="text-sm font-semibold mb-4">Conversion Settings</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-1">Input Format</div>
              <select
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select input format</option>
                <option value="qmdl">.qmdl</option>
                <option value="qmdl2">.qmdl2</option>
                <option value="sdm">.sdm</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Output Format</div>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select output format</option>
                <option value="pcap">.pcap</option>
                <option value="txt">.txt</option>
                <option value="csv">.csv</option>
                <option value="json">.json</option>
              </select>
            </div>
          </div>
        </div>

        {/* Upload area with drag & drop */}
        <div
          className={`border border-dashed border-gray-300 rounded ${isDragging ? 'bg-white' : 'bg-gray-50'} p-6 flex flex-col items-center justify-center text-center cursor-pointer`}
          onClick={() => document.getElementById('fileInput')?.click()}
          onDragEnter={(e: any) => { e.preventDefault(); setIsDragging(true) }}
          onDragOver={(e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragging(true) }}
          onDragLeave={(e: any) => { e.preventDefault(); setIsDragging(false) }}
          onDrop={(e: any) => {
            e.preventDefault();
            setIsDragging(false)
            const files = Array.from(e.dataTransfer.files || []) as File[]
            const valid = files.find(f => f.name.toLowerCase().endsWith('.qmdl') || f.name.toLowerCase().endsWith('.qmdl2') || f.name.toLowerCase().endsWith('.sdm'))
            if (valid) {
              setFile(valid)
            }
          }}
        >
          <div className={`w-10 h-10 mb-3 rounded-full border flex items-center justify-center ${isDragging ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-400'}`}>
            ↓
          </div>
          <div className="text-sm font-medium text-gray-700 mb-1">Drop files here or click to upload</div>
          <div className="text-xs text-gray-500 mb-4">Supports .qmdl, .qmdl2, .sdm</div>
          <label
            htmlFor="fileInput"
            className="inline-flex items-center px-4 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Browse Files
          </label>
          <input
            id="fileInput"
            type="file"
            accept=".qmdl,.qmdl2,.sdm"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="mt-3 text-xs text-gray-600 flex items-center justify-center gap-2">
              <span>
                Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
              <button
                type="button"
                className="ml-2 px-2 py-0.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                aria-label="Remove selected file"
                onClick={() => { setFile(null); setInputFormat(''); setOutputFormat(''); }}
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className={`border rounded-lg ${cardBg}`}>
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">Conversion Queue</div>
          <div className="max-h-[55vh] overflow-auto">
            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr className="text-gray-600">
                    <th className="text-left px-3 py-2 w-1/2">File</th>
                    <th className="text-left px-3 py-2 w-24">Type</th>
                    <th className="text-right px-3 py-2 w-24">Size</th>
                    <th className="text-left px-3 py-2 w-28">Status</th>
                    <th className="text-left px-3 py-2 w-48">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                      No items in queue
                    </td>
                  </tr>
                )}
                  {queue.map(renderQueueRow)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {error && (<div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">Error: {error}</div>)}
        {result && result.success && result.pcapPath && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            Conversion Successful – PCAP: <span className="font-mono">{result.pcapPath}</span>
          </div>
        )}
      </div>
    </div>
  )
}

