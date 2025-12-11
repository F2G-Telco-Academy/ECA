"use client"
import { useState } from "react"
import { api } from "@/utils/api"

export default function ConvertView({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const [file, setFile] = useState<File | null>(null)
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<{ name: string; size: number; type: string; status: string; progress: number }[]>([])

  const handleConvert = async () => {
    if (!file) return
    setConverting(true)
    setError(null)
    setResult(null)
    setQueue((prev) => [
      { name: file.name, size: file.size, type: file.name.split(".").pop()?.toUpperCase() || "LOG", status: "Converting", progress: 25 },
      ...prev,
    ])
    try {
      const res = await api.convertOfflineLog(file)
      setResult(res)
      setQueue((prev) => prev.map((it) => (it.name === file.name ? { ...it, status: "Completed", progress: 100 } : it)))
    } catch (err: any) {
      setError(err.message || "Conversion failed")
      setQueue((prev) => prev.map((it) => (it.name === file?.name ? { ...it, status: "Failed", progress: 0 } : it)))
    } finally {
      setConverting(false)
    }
  }

  const renderQueueRow = (item: (typeof queue)[number], idx: number) => (
    <tr key={`${item.name}-${idx}`} className="border-b border-gray-100">
      <td className="px-3 py-2 font-mono text-gray-800">{item.name}</td>
      <td className="px-3 py-2 text-gray-600">{item.type}</td>
      <td className="px-3 py-2 text-right text-gray-600">{(item.size / 1024 / 1024).toFixed(2)} MB</td>
      <td className="px-3 py-2">
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            item.status === "Completed"
              ? "bg-green-100 text-green-700"
              : item.status === "Failed"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {item.status}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="w-full h-2 bg-gray-200 rounded">
          <div
            className={`h-2 rounded ${item.status === "Failed" ? "bg-red-400" : "bg-blue-500"}`}
            style={{ width: `${item.progress}%` }}
          />
        </div>
      </td>
    </tr>
  )

  const bgMain = theme === 'dark' ? 'bg-slate-900 text-gray-100' : 'bg-white text-gray-800'
  const cardBg = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const dashedBg = theme === 'dark' ? 'border-slate-600 bg-slate-800/40' : 'border-gray-300 bg-white'

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center text-center text-gray-400 gap-2 py-4">
      <div className="w-12 h-12 rounded-xl border border-dashed border-gray-400 flex items-center justify-center text-2xl">📁</div>
      <div className="text-sm">Drop a file or click Browse</div>
    </div>
  )

  return (
    <div className={`flex flex-col h-full pb-16 md:pb-0 ${bgMain}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Convert Capture Files</h1>
        <p className="text-sm text-gray-500">Convert network capture files between different formats</p>
      </div>

      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
          <span>{4} Devices Connected</span>
        </span>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((id) => (
            <button key={id} className="px-3 py-1.5 rounded border bg-white text-xs text-gray-700 hover:border-gray-400">
              Mobile {id}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-4 overflow-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className={`flex-1 min-w-[280px] border rounded-lg p-4 ${cardBg}`}>
            <div className="text-sm font-semibold text-gray-700 mb-3">Conversion Settings</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Input Format</div>
                <div className="grid grid-cols-1 gap-2">
                  {["PCAP", "PCAPNG", "JSON", "XML"].map((format) => (
                    <button
                      key={format}
                      className={`w-full px-3 py-2 rounded border text-sm ${
                        format === "PCAP"
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-gray-400 text-sm">→</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Output Format</div>
                <div className="grid grid-cols-1 gap-2">
                  {["CSV", "JSON", "XML", "TXT", "PCAP"].map((format) => (
                    <button
                      key={format}
                      className={`w-full px-3 py-2 rounded border text-sm ${
                        format === "CSV"
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`flex-1 min-w-[280px] border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center ${dashedBg}`}>
            <div className="text-3xl mb-2 text-gray-400">☁</div>
            <div className="text-sm font-semibold text-gray-700">Drop files here or click to upload</div>
            <div className="text-xs text-gray-500">Supports PCAP, PCAPNG, JSON, XML files</div>
            <label className="mt-4 inline-block px-4 py-2 bg-black text-white text-xs rounded cursor-pointer">
              Browse Files
              <input
                id="fileInput"
                type="file"
                accept=".pcap,.pcapng,.json,.xml"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && <div className="mt-2 text-xs text-gray-600">{file.name}</div>}
            {!file && <EmptyState />}
            <button
              onClick={handleConvert}
              disabled={!file || converting}
              className="mt-3 px-4 py-2 rounded bg-blue-600 text-white text-xs disabled:opacity-50"
            >
              {converting ? "Converting..." : "Start Conversion"}
            </button>
          </div>
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

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">Error: {error}</div>}
        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            Conversion Successful – PCAP: <span className="font-mono">{result.pcapPath}</span>
          </div>
        )}
      </div>
    </div>
  )
}
