import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
export default function DevicesPage(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <DeviceSelectionBar selected={null} onSelect={()=>{}} />
      <div className="p-6">
        <div className="text-xs text-gray-400">Device Manager synchronized across all pages.</div>
      </div>
      <Footer />
    </div>
  )
}
