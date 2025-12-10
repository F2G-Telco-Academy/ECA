'use client'
import { useEffect, useRef, useState } from 'react'

export default function EnhancedTerminal({ sessionId }: { sessionId: string | null }) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !terminalRef.current) return

    let term: any
    let fitAddon: any

    const initTerminal = async () => {
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')
      // CSS is loaded via CDN or global import

      term = new Terminal({
        theme: {
          background: '#000000',
          foreground: '#00ff00',
          cursor: '#00ff00',
        },
        fontSize: 11,
        fontFamily: 'Consolas, "Courier New", monospace',
        cursorBlink: true,
        rows: 40,
        cols: 120
      })

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()

      xtermRef.current = term

      const handleResize = () => fitAddon.fit()
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        term?.dispose()
      }
    }

    initTerminal()

    return () => {
      term?.dispose()
    }
  }, [mounted])

  useEffect(() => {
    if (!sessionId || !xtermRef.current || !mounted) return

    const term = xtermRef.current
    reconnectAttemptsRef.current = 0
    
    const connectToSession = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      setConnectionStatus('connecting')
      term.writeln(`\x1b[1;36m[${new Date().toLocaleTimeString()}] Connecting to session ${sessionId}...\x1b[0m`)
      
      const eventSource = new EventSource(`http://localhost:8080/api/sessions/${sessionId}/logs`)
      eventSourceRef.current = eventSource
      
      eventSource.onopen = () => {
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        term.writeln('\x1b[1;32m[CONNECTED] Log stream established\x1b[0m')
      }
      
      eventSource.onmessage = (event) => {
        const line = event.data
        
        let color = '\x1b[0m'
        if (line.includes('ERROR')) color = '\x1b[1;31m'
        else if (line.includes('WARN')) color = '\x1b[1;33m'
        else if (line.includes('INFO')) color = '\x1b[1;32m'
        else if (line.includes('RRC')) color = '\x1b[1;36m'
        else if (line.includes('NAS')) color = '\x1b[1;35m'
        
        term.writeln(`${color}${line}\x1b[0m`)
        
        if (autoScroll) {
          term.scrollToBottom()
        }
      }

      eventSource.onerror = () => {
        setConnectionStatus('error')
        term.writeln('\x1b[1;31m[ERROR] Connection lost\x1b[0m')
        eventSource.close()
        
        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++
        
        term.writeln(`\x1b[1;33m[RECONNECTING] Attempt ${reconnectAttemptsRef.current} in ${delay/1000}s...\x1b[0m`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToSession()
        }, delay)
      }
    }
    
    term.clear()
    term.writeln('\x1b[1;32m╔════════════════════════════════════════════════════════════════╗\x1b[0m')
    term.writeln('\x1b[1;32m║         Extended Cellular Analyzer - Terminal View            ║\x1b[0m')
    term.writeln('\x1b[1;32m╚════════════════════════════════════════════════════════════════╝\x1b[0m')
    term.writeln('')
    
    connectToSession()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [sessionId, autoScroll, mounted])

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-green-500">
        <div>Loading terminal...</div>
      </div>
    )
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500 animate-pulse'
      case 'error': return 'bg-red-500 animate-pulse'
      default: return 'bg-gray-500'
    }
  }
  
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Reconnecting...'
      default: return 'Disconnected'
    }
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 p-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-gray-300 font-medium">{getStatusText()}</span>
          </div>
          <label className="flex items-center gap-1 text-xs text-gray-400 ml-3">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
        </div>
        <button onClick={() => xtermRef.current?.clear()} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">Clear</button>
      </div>
      <div ref={terminalRef} className="flex-1" />
    </div>
  )
}
