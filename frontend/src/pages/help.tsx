import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
export default function HelpPage(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6">
        <div className="text-xs text-gray-300">ECA – Extended Cellular Analyzer. Use Live Messages to capture signaling, KPI for dashboards, Convert to process logs, Visualize to see maps and graphs, Analyze for advanced metrics. Device Manager stays synced across pages.</div>
      </div>
      <Footer />
    </div>
  )
}
