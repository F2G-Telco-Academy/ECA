interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">About Extended Cellular Analyzer</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">ECA</div>
            <div className="text-sm text-gray-600">Version 0.1.0</div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-800">Extended Cellular Analyzer</p>
            <p className="text-gray-600">Professional cellular network analysis tool for 5G/4G/3G/2G technologies</p>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-800">Copyright & License</p>
            <p className="text-gray-600">© 2025 F2G Telco Academy. All rights reserved.</p>
            <p className="text-xs text-gray-500">This is proprietary software. Unauthorized copying, distribution, or modification is strictly prohibited.</p>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-800">Supported Technologies</p>
            <div className="flex flex-wrap gap-2">
              {['5G NR', 'LTE', 'WCDMA', 'GSM'].map(tech => (
                <span key={tech} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{tech}</span>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-800">Contact</p>
            <p className="text-gray-600">F2G Telco Academy</p>
            <p className="text-xs text-gray-500">
              Email: support@f2g-telco-academy.com<br/>
              Website: github.com/F2G-Telco-Academy/ECA
            </p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
