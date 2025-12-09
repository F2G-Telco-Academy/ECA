import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface EnhancedTerminalV2Props {
  sessionId: string | null
}

export default function EnhancedTerminalV2({ sessionId }: EnhancedTerminalV2Props) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [streamMode, setStreamMode] = useState<'psml' | 'json' | 'text'>('psml')
  const [isConnected, setIsConnected] = useState(false)
  const [packetCount, setPacketCount] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
      theme: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        cursor: '#60a5fa',
        black: '#1e293b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f1f5f9',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      },
      rows: 35,
      scrollback: 50000,
      allowTransparency: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    term.writeln('\x1b[1;36m================================================================================\x1b[0m')
    term.writeln('\x1b[1;36m                  Extended Cellular Analyzer - Terminal                        \x1b[0m')
    term.writeln('\x1b[1;36m                    Real-time Packet Analysis View                             \x1b[0m')
    term.writeln('\x1b[1;36m================================================================================\x1b[0m')
    term.writeln('')
    term.writeln('\x1b[90m  Powered by TShark - GSMTAP Protocol Decoder\x1b[0m')
    term.writeln('')
    term.writeln('\x1b[33m[INFO] Waiting for capture session...\x1b[0m')
    term.writeln('')

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sessionId || !xtermRef.current) {
      setIsConnected(false)
      return
    }

    const term = xtermRef.current
    term.clear()
    
    term.writeln('\x1b[1;32m[SUCCESS] Session Active: ' + sessionId + '\x1b[0m')
    term.writeln('\x1b[36m' + '='.repeat(80) + '\x1b[0m')
    term.writeln('')
    term.writeln('\x1b[90m[INFO] Connecting to packet stream...\x1b[0m')
    term.writeln('')

    const streamUrl = `http://localhost:8080/api/terminal/stream/${sessionId}/${streamMode}`
    const eventSource = new EventSource(streamUrl)
    eventSourceRef.current = eventSource
    
    eventSource.onopen = () => {
      setIsConnected(true)
      term.writeln('\x1b[32m[SUCCESS] Connected to TShark stream\x1b[0m')
      term.writeln('\x1b[90m[INFO] Mode: ' + streamMode.toUpperCase() + '\x1b[0m')
      term.writeln('')
      term.writeln('\x1b[36m' + '-'.repeat(80) + '\x1b[0m')
      term.writeln('')
    }
    
    eventSource.onmessage = (event) => {
      const line = event.data
      setPacketCount(prev => prev + 1)
      
      let coloredLine = line
      
      if (line.includes('LTE-RRC')) {
        coloredLine = line.replace('LTE-RRC', '\x1b[1;34mLTE-RRC\x1b[0m')
      } else if (line.includes('NAS-EPS')) {
        coloredLine = line.replace('NAS-EPS', '\x1b[1;35mNAS-EPS\x1b[0m')
      } else if (line.includes('RRC')) {
        coloredLine = line.replace('RRC', '\x1b[1;36mRRC\x1b[0m')
      } else if (line.includes('MAC')) {
        coloredLine = line.replace('MAC', '\x1b[1;33mMAC\x1b[0m')
      } else if (line.includes('PDCP')) {
        coloredLine = line.replace('PDCP', '\x1b[1;32mPDCP\x1b[0m')
      }
      
      coloredLine = coloredLine.replace(/RSRP: ([-\d.]+)/g, '\x1b[32mRSRP: $1\x1b[0m')
      coloredLine = coloredLine.replace(/RSRQ: ([-\d.]+)/g, '\x1b[32mRSRQ: $1\x1b[0m')
      coloredLine = coloredLine.replace(/SINR: ([-\d.]+)/g, '\x1b[32mSINR: $1\x1b[0m')
      coloredLine = coloredLine.replace(/\[(\d+)\]/g, '\x1b[36m[$1]\x1b[0m')
      
      term.writeln(coloredLine)
    }
    
    eventSource.onerror = () => {
      setIsConnected(false)
      term.writeln('')
      term.writeln('\x1b[31m[ERROR] Connection lost. Attempting to reconnect...\x1b[0m')
      term.writeln('')
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
      setPacketCount(0)
    }
  }, [sessionId, streamMode])

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear()
      setPacketCount(0)
    }
  }

  const handleExport = () => {
    if (!xtermRef.current) return
    
    const buffer = xtermRef.current.buffer.active
    const lines: string[] = []
    
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) {
        lines.push(line.translateToString(true))
      }
    }
    
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-session-${sessionId}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleChangeMode = (mode: 'psml' | 'json' | 'text') => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setStreamMode(mode)
    setPacketCount(0)
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
        <div className="flex gap-2">
          <button
            onClick={() => handleChangeMode('psml')}
            className={`px-3 py-1 text-xs rounded transition-all ${
              streamMode === 'psml' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            PSML Summary
          </button>
          <button
            onClick={() => handleChangeMode('json')}
            className={`px-3 py-1 text-xs rounded transition-all ${
              streamMode === 'json' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            JSON Format
          </button>
          <button
            onClick={() => handleChangeMode('text')}
            className={`px-3 py-1 text-xs rounded transition-all ${
              streamMode === 'text' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Verbose Text
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="text-xs text-slate-400">
            Packets: <span className="text-cyan-400 font-mono">{packetCount}</span>
          </div>
          
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-all"
          >
            Clear
          </button>
          
          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-all"
          >
            Export
          </button>
        </div>
      </div>

      <div ref={terminalRef} className="flex-1 p-2" />

      <div className="flex items-center justify-between px-3 py-1 bg-slate-800 border-t border-slate-700 text-xs">
        <span className="text-slate-400">
          Mode: <span className="text-blue-400">{streamMode.toUpperCase()}</span>
        </span>
        <span className="text-slate-400">
          Session: <span className="text-cyan-400">{sessionId || 'None'}</span>
        </span>
        <span className="text-slate-400">
          TShark GSMTAP Decoder
        </span>
      </div>
    </div>
  )
}
