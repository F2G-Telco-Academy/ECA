import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
export default function VisualizePage(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">Map</div>
          <div className="h-96 bg-black border border-gray-800" />
        </div>
        <div className="border border-gray-800 rounded p-4 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">Graphs</div>
          <div className="h-96 bg-black border border-gray-800" />
        </div>
      </div>
      <Footer />
    </div>
  )
}
