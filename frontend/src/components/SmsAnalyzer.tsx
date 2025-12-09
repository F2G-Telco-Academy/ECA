import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

export default function SmsAnalyzer({ pcapPath }: { pcapPath: string }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!pcapPath) return
    api.analyzeSms(pcapPath).then(setData).catch(console.error)
  }, [pcapPath])

  if (!data) return <div className="p-4">Loading SMS data...</div>

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4">SMS Analysis</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="text-xs text-gray-600">MO SMS</div>
          <div className="text-2xl font-bold text-blue-600">{data.moSms}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-600">MT SMS</div>
          <div className="text-2xl font-bold text-green-600">{data.mtSms}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-600">Acknowledgments</div>
          <div className="text-2xl font-bold">{data.smsAck}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-600">Success Rate</div>
          <div className="text-2xl font-bold text-green-600">{data.successRate?.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}
