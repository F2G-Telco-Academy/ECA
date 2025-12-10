import { useEffect, useState } from 'react'
import { api } from '@/utils/api'
import type { Device } from '@/types'
interface Props { selected?: string|null; onSelect: (id:string)=>void; devices?: Device[] }
export default function DeviceSelectionBar({ selected, onSelect, devices: externalDevices }: Props) {
  const [devices, setDevices] = useState<Device[]>(externalDevices || [])

  useEffect(() => {
    if (externalDevices) {
      setDevices(externalDevices)
      return
    }
    // Fallback: fetch devices if not provided
    const fetch = async () => { try { setDevices(await api.getDevices()) } catch {} }
    fetch(); const i = setInterval(fetch, 3000); return () => clearInterval(i)
  }, [externalDevices])

  return (
    <div className="flex gap-2 px-4 py-2 border-b border-gray-800 bg-black">
      {devices.length===0 && (<div className="text-xs text-gray-500">⏳ Waiting for device connection...</div>)}
      {devices.map((d, idx) => (
        <button key={d.deviceId} onClick={()=>onSelect(d.deviceId)}
          className={`px-3 py-2 rounded border text-xs flex items-center gap-2 ${selected===d.deviceId?'border-white text-white bg-blue-600':'border-gray-700 text-gray-300 hover:border-gray-500'}`}>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> {d.deviceId || `Mobile ${idx+1}`}
        </button>
      ))}
    </div>
  )
}
