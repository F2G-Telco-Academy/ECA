"use client"
import { useState } from 'react'
import { api } from '@/utils/api'
import { platformApi } from '@/utils/tauri-api'

export default function ConvertView({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
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

