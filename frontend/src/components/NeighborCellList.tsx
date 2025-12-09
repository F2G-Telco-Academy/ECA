import { useState, useEffect } from 'react'

interface NeighborCell {
  pci: number
  earfcn: number
  rsrp: number
  rsrq: number
}

export default function NeighborCellList({ sessionId }: { sessionId: number }) {
  const [neighbors, setNeighbors] = useState<NeighborCell[]>([])

  useEffect(() => {
    setNeighbors([
      { pci: 257, earfcn: 1850, rsrp: -92, rsrq: -12 },
      { pci: 258, earfcn: 1850, rsrp: -95, rsrq: -13 },
      { pci: 259, earfcn: 1850, rsrp: -98, rsrq: -14 },
      { pci: 260, earfcn: 2100, rsrp: -100, rsrq: -15 }
    ])
  }, [sessionId])

  const getRsrpColor = (rsrp: number) => {
    if (rsrp > -80) return 'text-green-600'
    if (rsrp > -95) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">Neighbor Cells</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">PCI</th>
              <th className="text-left py-2">EARFCN</th>
              <th className="text-right py-2">RSRP</th>
              <th className="text-right py-2">RSRQ</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map((cell, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="py-2 font-mono">{cell.pci}</td>
                <td className="py-2 font-mono">{cell.earfcn}</td>
                <td className={`py-2 text-right font-mono ${getRsrpColor(cell.rsrp)}`}>
                  {cell.rsrp} dBm
                </td>
                <td className="py-2 text-right font-mono">{cell.rsrq} dB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
