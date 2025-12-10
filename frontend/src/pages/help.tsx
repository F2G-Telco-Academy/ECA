import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'

export default function HelpPage(){
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopBar />
      <div className="p-6 max-w-4xl">
        <div className="text-2xl font-bold mb-6">Extended Cellular Analyzer - Help</div>
        
        <div className="space-y-6">
          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-3">Quick Start</div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Connect your device via USB</li>
              <li>Enable USB debugging on the device</li>
              <li>Enable diagnostic mode (dial *#0808# and select DM + MODEM + ADB)</li>
              <li>Click "Start Capture" to begin logging</li>
              <li>View real-time logs in the Terminal tab</li>
              <li>View KPIs and signaling messages in other tabs</li>
              <li>Click "Stop Capture" when done</li>
            </ol>
          </div>

          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-3">Features</div>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
              <li>Real-time capture from Qualcomm, Samsung, HiSilicon devices</li>
              <li>SCAT integration for baseband log conversion</li>
              <li>Comprehensive KPI calculation (LTE, WCDMA, GSM, 5G NR)</li>
              <li>Live log streaming via Server-Sent Events</li>
              <li>Signaling message viewer (RRC, NAS, PDCP, etc.)</li>
              <li>GPS-tracked network quality mapping</li>
              <li>Offline log conversion (.qmdl2, .sdm to PCAP)</li>
            </ul>
          </div>

          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-3">Supported Technologies</div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <div className="font-semibold text-white mb-1">RATs</div>
                <ul className="list-disc list-inside">
                  <li>5G NR</li>
                  <li>LTE / LTE-Advanced</li>
                  <li>WCDMA / HSPA</li>
                  <li>GSM</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-white mb-1">Chipsets</div>
                <ul className="list-disc list-inside">
                  <li>Qualcomm</li>
                  <li>Samsung Exynos</li>
                  <li>HiSilicon Kirin</li>
                  <li>Unisoc</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-3">Troubleshooting</div>
            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <div className="font-semibold text-white">No devices detected</div>
                <div>• Check USB connection</div>
                <div>• Enable USB debugging</div>
                <div>• Run: adb devices</div>
              </div>
              <div>
                <div className="font-semibold text-white">Capture fails to start</div>
                <div>• Enable diagnostic mode (*#0808#)</div>
                <div>• Check device is in DM mode</div>
                <div>• Restart ADB server: adb kill-server && adb start-server</div>
              </div>
              <div>
                <div className="font-semibold text-white">Backend not responding</div>
                <div>• Check backend is running: http://localhost:8080/actuator/health</div>
                <div>• Restart backend: mvnw spring-boot:run</div>
              </div>
            </div>
          </div>

          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-3">API Documentation</div>
            <div className="text-sm text-gray-300">
              <div>Access Swagger UI for complete API documentation:</div>
              <a 
                href="http://localhost:8080/swagger-ui.html" 
                target="_blank"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                http://localhost:8080/swagger-ui.html
              </a>
            </div>
          </div>

          <div className="border border-gray-800 rounded p-4 bg-gray-950">
            <div className="text-lg font-semibold mb-3">Version Information</div>
            <div className="text-sm text-gray-300">
              <div>Extended Cellular Analyzer v0.1.0</div>
              <div>Backend: Spring Boot 3.x + WebFlux</div>
              <div>Frontend: Next.js 14 + Tauri</div>
              <div>SCAT: Python 3.8+</div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
