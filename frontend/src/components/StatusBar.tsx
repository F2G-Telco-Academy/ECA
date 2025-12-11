import { useEffect, useState } from "react"

interface Props {
  deviceCount: number
  packetCount: number
  theme?: 'light' | 'dark'
}

export default function StatusBar({ deviceCount, packetCount, theme = 'light' }: Props) {
  const [backend, setBackend] = useState<"connected" | "disconnected">("disconnected")

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("http://localhost:8080/actuator/health")
        setBackend(res.ok ? "connected" : "disconnected")
      } catch {
        setBackend("disconnected")
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`h-7 border-t flex flex-wrap items-center gap-4 px-4 text-[11px] ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-800 text-gray-300'
          : 'bg-white border-gray-200 text-gray-600'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${backend === "connected" ? "bg-green-500" : "bg-red-500"}`} />
        <span>Backend: {backend}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span>Devices: {deviceCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span>Packets: {packetCount}</span>
      </div>
      <div className="ml-auto text-gray-500">Status OK</div>
    </div>
  )
}
