import { useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import { api } from '@/utils/api'

export default function ConvertPage(){
  const [file, setFile] = useState<File|null>(null)
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string|null>(null)

  const handleConvert = async () => {
    if (!file) {
      alert('Please select a file first')
      return
    }
    
    setConverting(true)
    setError(null)
    setResult(null)
    
    try {
      const res = await api.convertOfflineLog(file)
      setResult(res)
      alert(`Conversion successful! PCAP saved to: ${res.pcapPath}`)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
      alert('Conversion failed: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6">
        <div className="border border-gray-800 rounded p-6 bg-gray-950">
          <div className="text-lg font-semibold mb-4">Convert Offline Logs</div>
          <div className="text-xs text-gray-400 mb-3">Upload .qmdl2, .sdm, or .lpd files to convert to PCAP</div>
          
          <input 
            type="file" 
            accept=".qmdl2,.sdm,.lpd"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs text-white mb-3" 
          />
          
          {file && (
            <div className="text-xs text-gray-400 mb-3">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
          
          <div className="mt-3 flex gap-2">
            <button 
              onClick={handleConvert}
              disabled={!file || converting}
              className={`px-4 py-2 text-xs rounded font-medium ${
                !file || converting
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {converting ? 'Converting...' : 'Convert to PCAP'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-xs text-red-400">
              Error: {error}
            </div>
          )}
          
          {result && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded text-xs">
              <div className="text-green-400 font-semibold mb-2">Conversion Successful!</div>
              <div className="text-gray-300">PCAP file: {result.pcapPath}</div>
              <div className="text-gray-400 mt-2">{result.message}</div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
