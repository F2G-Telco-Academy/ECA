import '../styles/globals.css'
import type { AppProps } from 'next/app'
import AppShell from '@/components/AppShell'

export default function App(_props: AppProps) {
  // Fixed shell; page components are ignored to keep a single layout.
  return <AppShell />
}
