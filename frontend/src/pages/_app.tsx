import '../styles/globals.css'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'

// Load AppShell client-side to ensure hash/tab handling without SSR quirks
const AppShell = dynamic(() => import('@/components/AppShell'), { ssr: false })

export default function App(_props: AppProps) {
  // Ignore per-page components; render a single fixed shell where only the
  // embedded section changes as tabs switch, matching the screenshot behavior.
  return <AppShell />
}
