import { useState, useEffect } from 'react'

interface CellInfo {
  cellId: string
  pci: number
  earfcn: number
  bandwidth: number
  tac: string
  rsrp: number
  rsrq: number
  sinr: number
}

export default function CellInfoPanel({ sessionId }: { sessionId: number }) {
  const [cellInfo, setCellInfo] = useState<CellInfo | null>(null)

  useEffect(() => {
    setCellInfo({
      cellId: '0x1A2B3C',
      pci: 256,
      earfcn: 1850,
      bandwidth: 20,
      tac: '0x1234',
      rsrp: -85,
      rsrq: -10,
      sinr: 15
    })
  }, [sessionId])

  if (!cellInfo) return <div className="p-4">Loading cell info...</div>

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Serving Cell Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-600">Cell ID</div>
          <div className="font-mono text-sm">{cellInfo.cellId}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">PCI</div>
          <div className="font-mono text-sm">{cellInfo.pci}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">EARFCN</div>
          <div className="font-mono text-sm">{cellInfo.earfcn}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Bandwidth</div>
          <div className="font-mono text-sm">{cellInfo.bandwidth} MHz</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">TAC</div>
          <div className="font-mono text-sm">{cellInfo.tac}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">RSRP</div>
          <div className={`font-mono text-sm ${cellInfo.rsrp > -80 ? 'text-green-600' : cellInfo.rsrp > -100 ? 'text-yellow-600' : 'text-red-600'}`}>
            {cellInfo.rsrp} dBm
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600">RSRQ</div>
          <div className="font-mono text-sm">{cellInfo.rsrq} dB</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">SINR</div>
          <div className="font-mono text-sm">{cellInfo.sinr} dB</div>
        </div>
      </div>
    </div>
  )
}
