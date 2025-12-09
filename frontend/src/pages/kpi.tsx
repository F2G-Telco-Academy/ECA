import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import DeviceSelectionBar from '@/components/DeviceSelectionBar'
import { api } from '@/utils/api'
export default function KPIPage(){
  const [deviceId,setDeviceId]=useState<string|null>(null)
  const [sessionId,setSessionId]=useState<string|number|null>(null)
  const [cards,setCards]=useState<{label:string,value:string}[]>([])
  const [rows,setRows]=useState<any[]>([])
  useEffect(()=>{ const run=async()=>{ if(!sessionId) return; try{
      const m = await api.getMeasurements(sessionId); const s = await api.getSuccessRates(sessionId);
      setCards([
        {label:'RSRP', value:String(m['rsrp']??'-')},
        {label:'RSRQ', value:String(m['rsrq']??'-')},
        {label:'SINR', value:String(m['sinr']??'-')},
        {label:'Attach SR', value:String(s['attachSuccessRate']??'-')},
        {label:'HO SR', value:String(s['handoverSuccessRate']??'-')}
      ])
      const ag = await api.getKpiAggregates(sessionId); setRows(ag||[])
    }catch{}}
    run(); const i=setInterval(run,2000); return ()=>clearInterval(i)
  },[sessionId])
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <DeviceSelectionBar selected={deviceId} onSelect={(id)=>{setDeviceId(id); setSessionId(id)}} />
      <div className="p-4 grid grid-cols-5 gap-3">
        {cards.map(c=> (
          <div key={c.label} className="border border-gray-800 rounded p-3 bg-gray-950">
            <div className="text-xs text-gray-400">{c.label}</div>
            <div className="text-2xl text-white">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="px-4 grid grid-cols-2 gap-3">
        <div className="border border-gray-800 rounded p-3 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">RSRP</div>
          {/* Example chart data */}
          {/* @ts-ignore */}
          <div>
            {/* This placeholder chart expects backend timeseries; replace when available */}
          </div>
        </div>
        <div className="border border-gray-800 rounded p-3 bg-gray-950">
          <div className="text-xs text-gray-400 mb-2">RSRQ</div>
          <div />
        </div>
      </div>
      <div className="px-4">
        <div className="border border-gray-800 rounded overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-black border-b border-gray-800">
            <div className="text-xs text-gray-400">KPI Table</div>
            <div className="flex items-center gap-2">
              <input className="bg-black border border-gray-800 text-xs px-2 py-1 rounded text-white" placeholder="Filter" />
              <button className="text-xs px-2 py-1 border border-gray-800 rounded bg-gray-900">Export</button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-black text-gray-400">
              <tr><th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-left">Metric</th><th className="px-3 py-2 text-left">Value</th></tr>
            </thead>
            <tbody>
              {rows.map((r,i)=> (
                <tr key={i} className="border-t border-gray-900 hover:bg-gray-900">
                  <td className="px-3 py-1 text-gray-400">{r.timestamp??''}</td>
                  <td className="px-3 py-1 text-gray-300">{r.metric??''}</td>
                  <td className="px-3 py-1 text-white">{r.value??''}</td>
                </tr>
              ))}
              {rows.length===0 && (<tr><td className="px-3 py-4 text-gray-500" colSpan={3}>Select a device</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  )
}
