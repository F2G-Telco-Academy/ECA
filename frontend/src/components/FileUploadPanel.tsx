import { useState, useCallback } from 'react'

interface FileUploadPanelProps {
  onUploadComplete?: (sessionId: string) => void
}

export default function FileUploadPanel({ onUploadComplete }: FileUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'converting' | 'analyzing' | 'complete' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const validFile = files.find(f => 
      f.name.endsWith('.qmdl') || 
      f.name.endsWith('.qmdl2') || 
      f.name.endsWith('.sdm') || 
      f.name.endsWith('.pcap')
    )
    
    if (validFile) {
      setSelectedFile(validFile)
      setMessage(`Selected: ${validFile.name}`)
    } else {
      setMessage('Please upload .qmdl, .qmdl2, .sdm, or .pcap files')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setMessage(`Selected: ${file.name}`)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    setUploading(true)
    setProgress(0)
    setStatus('converting')
    setMessage('Uploading and converting...')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('http://localhost:8080/api/offline/convert', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      setProgress(100)
      setStatus('analyzing')
      setMessage('Conversion complete. Analyzing KPIs...')

      if (result.pcapPath) {
        setTimeout(async () => {
          try {
            const kpiResponse = await fetch(`http://localhost:8080/api/kpis/extract?pcapPath=${encodeURIComponent(result.pcapPath)}`)
            const kpis = await kpiResponse.json()
            
            setStatus('complete')
            setMessage(`Analysis complete. Extracted ${Object.keys(kpis.successRates || {}).length} KPIs`)
            
            if (onUploadComplete) {
              onUploadComplete(result.sessionId || 'offline')
            }
          } catch (err) {
            setStatus('error')
            setMessage('KPI extraction failed')
          }
        }, 1000)
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Upload failed')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }, [selectedFile, onUploadComplete])

  const getStatusColor = () => {
    switch (status) {
      case 'converting': return 'text-blue-400'
      case 'analyzing': return 'text-yellow-400'
      case 'complete': return 'text-green-400'
      case 'error': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold">
            UL
          </div>
          <h2 className="text-lg font-semibold">Offline Log Analysis</h2>
        </div>
        <div className="text-xs text-slate-400">
          Supported: QMDL, SDM, PCAP
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 transition-all
            ${isDragging 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-slate-600 hover:border-slate-500'
            }
            ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
        >
          <input
            type="file"
            accept=".qmdl,.qmdl2,.sdm,.pcap"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />

          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 border-2 border-slate-600 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            {!selectedFile ? (
              <>
                <div className="text-xl font-semibold">
                  Drop your log file here
                </div>
                <div className="text-sm text-slate-400">
                  or click to browse
                </div>
                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="px-2 py-1 bg-slate-800 rounded">.qmdl</span>
                  <span className="px-2 py-1 bg-slate-800 rounded">.qmdl2</span>
                  <span className="px-2 py-1 bg-slate-800 rounded">.sdm</span>
                  <span className="px-2 py-1 bg-slate-800 rounded">.pcap</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-blue-400">
                  {selectedFile.name}
                </div>
                <div className="text-sm text-slate-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </>
            )}
          </div>
        </div>

        {uploading && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className={getStatusColor()}>{message}</span>
              <span className="text-slate-400">{progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {message && !uploading && (
          <div className={`mt-4 p-4 rounded-lg ${
            status === 'complete' ? 'bg-green-500/10 border border-green-500/30' :
            status === 'error' ? 'bg-red-500/10 border border-red-500/30' :
            'bg-slate-800 border border-slate-700'
          }`}>
            <div className={`text-sm ${getStatusColor()}`}>
              {message}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`
              flex-1 px-6 py-3 rounded-lg font-semibold transition-all
              ${selectedFile && !uploading
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {uploading ? 'Processing...' : 'Upload & Analyze'}
          </button>
          
          <button
            onClick={() => {
              setSelectedFile(null)
              setMessage('')
              setStatus('idle')
              setProgress(0)
            }}
            disabled={uploading}
            className="px-6 py-3 rounded-lg font-semibold bg-slate-700 hover:bg-slate-600 transition-all disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold mb-3">
            How it works
          </h3>
          <ol className="text-xs text-slate-400 space-y-2">
            <li className="flex gap-2">
              <span className="text-blue-400 font-mono">1.</span>
              <span>Upload your baseband log file (QMDL/SDM) or PCAP</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-mono">2.</span>
              <span>SCAT converts baseband logs to PCAP format</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-mono">3.</span>
              <span>TShark extracts 40+ KPIs from the PCAP</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-mono">4.</span>
              <span>View comprehensive analysis in the dashboard</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
