import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
export default function FiveGNRInfo(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-4 space-y-4">
        <div className="text-xs text-gray-400">Time: {new Date().toLocaleTimeString('en-US',{hour12:false})}</div>
        {/* Table 1: DL/UL Config */}
        <div className="border border-gray-800 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-800 text-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">DL Config</th>
                <th className="px-3 py-2 text-left">DL Config</th>
                <th className="px-3 py-2 text-left">UL Config</th>
                <th className="px-3 py-2 text-left">UL Config</th>
                <th className="px-3 py-2 text-left">SUL Config</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Frequency Band','25','25','-','-','-'],
                ['SCS','15kHz','15kHz','-','-','-'],
                ['Bandwidth','20MHz(106)','20MHz(106)','-','-','-'],
                ['p-Max','-','-','27','-','-']
              ].map((r,i)=> (
                <tr key={i} className="border-t border-gray-900">
                  <td className="px-3 py-2 text-gray-400">{r[0]}</td>
                  {r.slice(1).map((c,j)=>(<td key={j} className="px-3 py-2">{c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Table 2: Side-by-side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-800 rounded overflow-hidden">
            <div className="px-3 py-2 bg-gray-800 text-gray-200 text-xs">Serving Cell Config</div>
            <table className="w-full text-xs">
              <tbody>
                {[
                  ['n-TimingAdvanceOffset','n39936'],
                  ['SSB-Periodicity','ms20'],
                  ['SSB-PositionInBurst','10000000']
                ].map((r,i)=> (
                  <tr key={i} className="border-t border-gray-900">
                    <td className="px-3 py-2 text-gray-400">{r[0]}</td>
                    <td className="px-3 py-2">{r[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border border-gray-800 rounded overflow-hidden">
            <div className="px-3 py-2 bg-gray-800 text-gray-200 text-xs">Cell Selection Info</div>
            <table className="w-full text-xs">
              <tbody>
                {[
                  ['q-RxLevMin','-61 (-122 dBm)'],
                  ['q-RxLevMinOffset','-'],
                  ['q-RxLevMinSUL','-']
                ].map((r,i)=> (
                  <tr key={i} className="border-t border-gray-900">
                    <td className="px-3 py-2 text-gray-400">{r[0]}</td>
                    <td className="px-3 py-2">{r[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Table 3: PLMN List */}
        <div className="border border-gray-800 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-800 text-gray-200">
              <tr><th className="px-3 py-2 text-left">MCC</th><th className="px-3 py-2 text-left">MNC</th><th className="px-3 py-2 text-left">Operator Use</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-900"><td className="px-3 py-2">310(USA)</td><td className="px-3 py-2">260(T-Mobile)</td><td className="px-3 py-2">notReserved</td></tr>
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400">Tracking Area Code: 8180480</div>
        <div className="text-xs text-gray-400">Global Cell Identity (gNB / Cell ID): 6504808472 (397022 / 24)</div>
      </div>
      <Footer />
    </div>
  )
}
