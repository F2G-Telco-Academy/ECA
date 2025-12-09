import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
export default function AnalyzePage(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6 grid grid-cols-3 gap-4">
        {[...Array(6)].map((_,i)=> (
          <div key={i} className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-xs text-gray-400 mb-2">Chart {i+1}</div>
            <div className="h-40 bg-black border border-gray-800" />
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}
