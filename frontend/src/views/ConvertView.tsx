"use client"
import { useState } from 'react'
import { api } from '@/utils/api'

export default function ConvertView(){
  const [file, setFile] = useState<File|null>(null)
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string|null>(null)
  const [queue, setQueue] = useState<{name:string; size:number; type:string; status:string; progress:number}[]>([])

  const handleConvert = async () => {
    if (!file) { alert('Please select a file first'); return }
    setConverting(true); setError(null); setResult(null)
    setQueue(prev => [{ name: file.name, size: file.size, type: file.name.split('.').pop()?.toUpperCase() || 'LOG', status: 'Converting', progress: 15 }, ...prev])
    try {
      const res = await api.convertOfflineLog(file)
      setResult(res)
      setQueue(prev => prev.map(it => it.name===file.name ? { ...it, status: 'Completed', progress: 100 } : it))
      alert(`Conversion successful! PCAP saved to: ${res.pcapPath}`)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
      setQueue(prev => prev.map(it => it.name===file?.name ? { ...it, status: 'Failed', progress: 0 } : it))
      alert('Conversion failed: ' + (err?.message || 'Unknown error'))
    } finally { setConverting(false) }
  }

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Convert</h1>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-2 border-b border-gray-200 bg-gray-50 text-sm flex items-center gap-2">
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">📂 Open</button>
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400" onClick={()=>document.getElementById('fileInput')?.click()}>➕ Add</button>
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400" onClick={()=>setQueue(q=>q.slice(1))}>➖ Remove</button>
        <span className="mx-2 w-px h-5 bg-gray-200"/>
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400" onClick={handleConvert} disabled={!file || converting}>{converting?'⏳ Converting':'▶️ Start'}</button>
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">⏹ Stop</button>
        <span className="mx-2 w-px h-5 bg-gray-200"/>
        <button className="px-2 py-1 rounded border border-gray-300 bg-white hover:border-gray-400" disabled={!result}>💾 Save</button>
        <div className="ml-auto text-xs text-gray-500">Supports .qmdl2, .sdm, .lpd</div>
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col gap-4 overflow-auto">
        <div className="border border-gray-200 rounded bg-white p-4">
          <div className="text-xs text-gray-500 mb-2">Select Log File</div>
          <input id="fileInput" type="file" accept=".qmdl2,.sdm,.lpd" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          {file && (
            <div className="mt-2 text-xs text-gray-600">Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
          )}
        </div>

        <div className="border border-gray-200 rounded bg-white">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">Conversion Queue</div>
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full text-xs">
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
                {queue.length===0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No items in queue</td></tr>
                )}
                {queue.map((q)=> (
                  <tr key={q.name} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-gray-800">{q.name}</td>
                    <td className="px-3 py-2 text-gray-600">{q.type}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{(q.size/1024/1024).toFixed(2)} MB</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${q.status==='Completed'?'bg-green-100 text-green-700':q.status==='Failed'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{q.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="w-full h-2 bg-gray-200 rounded">
                        <div className={`h-2 rounded ${q.status==='Failed'?'bg-red-400':'bg-blue-500'}`} style={{width: `${q.progress}%`}} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (<div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">Error: {error}</div>)}
        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            Conversion Successful — PCAP: <span className="font-mono">{result.pcapPath}</span>
          </div>
        )}
      </div>
    </div>
  )
}
