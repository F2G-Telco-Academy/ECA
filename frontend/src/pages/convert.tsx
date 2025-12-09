import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
export default function ConvertPage(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6">
        <div className="border border-gray-800 rounded p-6 bg-gray-950">
          <div className="text-xs text-gray-400 mb-3">Convert Logs</div>
          <input type="file" className="text-xs" />
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 bg-white text-black text-xs rounded">Convert</button>
            <button className="px-3 py-2 bg-gray-900 text-white text-xs rounded border border-gray-700">Export</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
