import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
export default function SettingsPage(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">Theme</div>
          <div className="flex gap-2"><button className="px-3 py-2 bg-white text-black text-xs rounded">Black/White</button></div>
        </div>
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">Capture</div>
          <div className="flex gap-2"><button className="px-3 py-2 bg-gray-900 text-white text-xs rounded border border-gray-700">Auto-save</button></div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
