import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
import { api } from '@/utils/api'
export default function LogsPage(){
  const [deviceId,setDeviceId]=useState<string|null>(null)
  const [sessionId,setSessionId]=useState<string|number|null>(null)
  const [rows,setRows]=useState<any[]>([])
  const [direction,setDirection]=useState<'ALL'|'UL'|'DL'>('ALL')
  useEffect(()=>{ const run=async()=>{ if(!sessionId) return; try{ const page=await api.getRecords(sessionId,0,200); setRows(page.content||[]) }catch{}}
    run(); const i=setInterval(run,2000); return ()=>clearInterval(i)
  },[sessionId])
  const filtered = rows.filter(r=> direction==='ALL' || (direction==='UL'? r.direction==='UL': r.direction==='DL'))
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <DeviceSelectionBar selected={deviceId} onSelect={(id)=>{setDeviceId(id); setSessionId(id)}} />
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-800 text-xs">
        <label className="text-gray-400">UL/DL</label>
        <select value={direction} onChange={e=>setDirection(e.target.value as any)} className="bg-black border border-gray-800 rounded px-2 py-1">
          <option>ALL</option><option>UL</option><option>DL</option>
        </select>
        <button className="ml-auto px-2 py-1 border border-gray-800 rounded bg-gray-900">Export</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-black text-gray-400">
            <tr><th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-left">UE-NET</th><th className="px-3 py-2 text-left">Channel</th><th className="px-3 py-2 text-left">Message</th></tr>
          </thead>
          <tbody>
            {filtered.map((r:any,i:number)=> (
              <tr key={i} className="border-t border-gray-900 hover:bg-gray-900">
                <td className="px-3 py-1 font-mono text-gray-400">{r.time||''}</td>
                <td className="px-3 py-1">{r.direction==='UL'?'→ UL':'← DL'}</td>
                <td className="px-3 py-1 text-gray-300">{r.channel||''}</td>
                <td className="px-3 py-1 font-mono text-white truncate">{r.message||''}</td>
              </tr>
            ))}
            {filtered.length===0 && (<tr><td colSpan={4} className="px-3 py-4 text-gray-500">{sessionId? 'No logs' : 'Select a device'}</td></tr>)}
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  )
}
