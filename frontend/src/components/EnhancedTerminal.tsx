'use client'
import { useEffect, useRef, useState } from 'react'

export default function EnhancedTerminal({ sessionId }: { sessionId: string | null }) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [mounted, setMounted] = useState(false)

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
      await import('xterm/css/xterm.css')

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
    term.clear()
    term.writeln('\x1b[1;32m╔════════════════════════════════════════════════════════════════╗\x1b[0m')
    term.writeln('\x1b[1;32m║         Extended Cellular Analyzer - Terminal View            ║\x1b[0m')
    term.writeln('\x1b[1;32m╚════════════════════════════════════════════════════════════════╝\x1b[0m')
    term.writeln('')
    term.writeln(`\x1b[1;36mConnecting to session ${sessionId}...\x1b[0m`)

    const eventSource = new EventSource(`http://localhost:8080/api/logs/sessions/${sessionId}/stream`)
    
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
      term.writeln('\x1b[1;31m[ERROR] Connection lost. Reconnecting...\x1b[0m')
      eventSource.close()
    }

    return () => eventSource.close()
  }, [sessionId, autoScroll, mounted])

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-green-500">
        <div>Loading terminal...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex items-center gap-2 p-2 bg-gray-900 border-b border-gray-700">
        <label className="flex items-center gap-1 text-xs text-gray-400">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          Auto-scroll
        </label>
        <button onClick={() => xtermRef.current?.clear()} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">Clear</button>
      </div>
      <div ref={terminalRef} className="flex-1" />
    </div>
  )
}
