"use client"
import { useMemo, useState } from 'react'

type Row = { id:number; time:string; type:string; layer:string; device:string; summary:string }

export default function AnalyzeView(){
  const [filter, setFilter] = useState('')
  const [layer, setLayer] = useState('All')
  const [selected, setSelected] = useState<Row|null>(null)
  const data: Row[] = useMemo(()=>[
    { id:1, time:'12:01:03.123', type:'RRC', layer:'RRC', device:'Mobile 1', summary:'RRC Setup Complete' },
    { id:2, time:'12:01:04.221', type:'NAS', layer:'NAS', device:'Mobile 1', summary:'5G Registration Accept' },
    { id:3, time:'12:01:05.010', type:'RRC', layer:'RRC', device:'Mobile 2', summary:'Measurement Report' },
  ], [])
  const filtered = data.filter(r =>
    (layer==='All' || r.layer===layer) &&
    (filter.trim()==='' || `${r.time} ${r.type} ${r.layer} ${r.device} ${r.summary}`.toLowerCase().includes(filter.toLowerCase()))
  )

  const exportCsv = () => {
    const header = 'Time,Type,Layer,Device,Summary\n'
    const rows = filtered.map(r => [r.time, r.type, r.layer, r.device, r.summary].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analyze_${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Analyze</h1>
      </div>

      {/* Toolbar / Filters */}
      <div className="px-6 py-2 border-b border-gray-200 bg-gray-50 text-xs flex items-center gap-2">
        <span className="text-gray-600">Layer:</span>
        <select value={layer} onChange={e=>setLayer(e.target.value)} className="px-2 py-1 border border-gray-300 rounded bg-white">
          {['All','RRC','NAS','MAC','RLC','PDCP','IP'].map(l => <option key={l}>{l}</option>)}
        </select>
        <span className="mx-2 w-px h-5 bg-gray-200"/>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Find..." className="px-2 py-1 border border-gray-300 rounded bg-white w-64" />
        <button className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">Filter</button>
        <button onClick={exportCsv} className="px-3 py-1 rounded border border-gray-300 bg-white hover:border-gray-400">Export</button>
        <div className="ml-auto text-gray-500">{filtered.length} results</div>
      </div>

      {/* Body: Table + Details */}
      <div className="p-6 flex-1 flex gap-4 overflow-hidden">
        {/* Results table */}
        <div className="flex-1 border border-gray-200 rounded bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">Results</div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-600">
                  <th className="px-3 py-2 text-left w-32">Time</th>
                  <th className="px-3 py-2 text-left w-20">Type</th>
                  <th className="px-3 py-2 text-left w-20">Layer</th>
                  <th className="px-3 py-2 text-left w-24">Device</th>
                  <th className="px-3 py-2 text-left">Summary</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">No results</td></tr>
                ) : (
                  filtered.map(row => (
                    <tr
                      key={row.id}
                      onClick={()=>setSelected(row)}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selected?.id===row.id?'bg-blue-50':''}`}
                    >
                      <td className="px-3 py-1.5 text-gray-700">{row.time}</td>
                      <td className="px-3 py-1.5 text-blue-700">{row.type}</td>
                      <td className="px-3 py-1.5 text-purple-700">{row.layer}</td>
                      <td className="px-3 py-1.5 text-gray-700">{row.device}</td>
                      <td className="px-3 py-1.5 text-gray-800">{row.summary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details / Inspector */}
        <div className="w-96 border border-gray-200 rounded bg-white flex flex-col">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">Details</div>
          <div className="p-4 text-xs text-gray-700">
            {selected ? (
              <div className="space-y-2">
                <div><span className="text-gray-500">Time:</span> {selected.time}</div>
                <div><span className="text-gray-500">Type:</span> {selected.type}</div>
                <div><span className="text-gray-500">Layer:</span> {selected.layer}</div>
                <div><span className="text-gray-500">Device:</span> {selected.device}</div>
                <div><span className="text-gray-500">Summary:</span> {selected.summary}</div>
                <div className="mt-2">
                  <div className="text-gray-500 mb-1">Raw</div>
                  <pre className="bg-gray-50 border border-gray-200 rounded p-2 overflow-auto">{JSON.stringify(selected, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div>
                Select a row to see structured details. This panel will show parsed fields and hex when wired.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
