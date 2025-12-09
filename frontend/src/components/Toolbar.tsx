import { useState } from 'react'

interface ToolbarProps {
  onStartCapture?: () => void
  onStopCapture?: () => void
  isCapturing?: boolean
}

export default function Toolbar({ onStartCapture, onStopCapture, isCapturing = false }: ToolbarProps) {
  return (
    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
      <div className="text-xl font-bold text-blue-400">ECA</div>
      
      <button
        onClick={onStartCapture}
        disabled={isCapturing}
        className={`px-4 py-1 rounded ${
          isCapturing ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        Start
      </button>
      
      <button
        onClick={onStopCapture}
        disabled={!isCapturing}
        className={`px-4 py-1 rounded ${
          !isCapturing ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        Stop
      </button>

      <div className="flex-1" />
      
      <div className="text-sm text-gray-400">
        {isCapturing ? '🔴 Capturing' : '⚪ Idle'}
      </div>
    </div>
  )
}
