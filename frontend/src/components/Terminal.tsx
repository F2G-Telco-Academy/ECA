import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface TerminalProps {
  sessionId: string | null
}

export default function Terminal({ sessionId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new XTerm({
      theme: {
        background: '#1a1a1a',
        foreground: '#00ff00',
        cursor: '#00ff00',
      },
      fontSize: 12,
      fontFamily: 'Consolas, monospace',
      cursorBlink: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sessionId || !xtermRef.current) return

    const term = xtermRef.current
    term.clear()
    term.writeln('\x1b[1;32m[ECA Terminal]\x1b[0m Connecting to session...')

    const eventSource = new EventSource(`http://localhost:8080/api/sessions/${sessionId}/logs`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const color = data.level === 'ERROR' ? '\x1b[1;31m' : data.level === 'WARN' ? '\x1b[1;33m' : '\x1b[0m'
      term.writeln(`${color}[${data.timestamp}] ${data.message}\x1b[0m`)
    }

    eventSource.onerror = () => {
      term.writeln('\x1b[1;31m[ERROR]\x1b[0m Connection lost')
      eventSource.close()
    }

    return () => eventSource.close()
  }, [sessionId])

  return <div ref={terminalRef} className="h-full w-full" />
}
