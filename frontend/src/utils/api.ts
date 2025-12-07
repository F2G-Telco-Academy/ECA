import { invoke } from '@tauri-apps/api/tauri'
import type {
  Device,
  Session,
  KpiData,
  KpiAggregate,
  Anomaly,
  Artifact,
  MapData,
  Record,
  PaginatedResponse
} from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export const api = {
  // Device Management
  async getDevices(): Promise<Device[]> {
    try {
      return await invoke('get_devices')
    } catch {
      const res = await fetch(`${API_BASE}/devices`)
      if (!res.ok) throw new Error('Failed to fetch devices')
      return res.json()
    }
  },

  // Session Management
  async getSessions(page = 0, size = 20): Promise<PaginatedResponse<Session>> {
    const res = await fetch(`${API_BASE}/sessions?page=${page}&size=${size}`)
    if (!res.ok) throw new Error('Failed to fetch sessions')
    return res.json()
  },

  async getSession(id: string | number): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`)
    if (!res.ok) throw new Error('Failed to fetch session')
    return res.json()
  },

  async getRecentSessions(limit = 10): Promise<Session[]> {
    const res = await fetch(`${API_BASE}/sessions/recent?limit=${limit}`)
    if (!res.ok) throw new Error('Failed to fetch recent sessions')
    return res.json()
  },

  async startSession(deviceId: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/start?deviceId=${deviceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) throw new Error('Failed to start session')
    return res.json()
  },

  async stopSession(sessionId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/stop`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error('Failed to stop session')
  },

  // KPI Data
  async getKpis(sessionId: number | string): Promise<KpiData> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}`)
    if (!res.ok) throw new Error('Failed to fetch KPIs')
    return res.json()
  },

  async getKpiMetric(sessionId: number | string, metric: string): Promise<KpiAggregate[]> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/metric/${metric}`)
    if (!res.ok) throw new Error('Failed to fetch KPI metric')
    return res.json()
  },

  async getKpiAggregates(sessionId: number | string): Promise<KpiAggregate[]> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/aggregates`)
    if (!res.ok) throw new Error('Failed to fetch KPI aggregates')
    return res.json()
  },

  // Anomalies
  async getAnomalies(sessionId: string | number): Promise<Anomaly[]> {
    const res = await fetch(`${API_BASE}/anomalies/session/${sessionId}`)
    if (!res.ok) throw new Error('Failed to fetch anomalies')
    return res.json()
  },

  // Map Data
  async getMapData(sessionId: string | number): Promise<MapData> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/map`)
    if (!res.ok) throw new Error('Failed to fetch map data')
    return res.json()
  },

  // Artifacts
  async getArtifacts(sessionId: string | number): Promise<Artifact[]> {
    const res = await fetch(`${API_BASE}/artifacts/session/${sessionId}`)
    if (!res.ok) throw new Error('Failed to fetch artifacts')
    return res.json()
  },

  async downloadArtifact(artifactId: string | number): Promise<Blob> {
    const res = await fetch(`${API_BASE}/artifacts/${artifactId}/download`)
    if (!res.ok) throw new Error('Failed to download artifact')
    return res.blob()
  },

  // Records
  async getRecords(sessionId: string | number, page = 0, size = 100): Promise<PaginatedResponse<Record>> {
    const res = await fetch(`${API_BASE}/records/session/${sessionId}?page=${page}&size=${size}`)
    if (!res.ok) throw new Error('Failed to fetch records')
    return res.json()
  },

  // Log Streaming
  async streamLogs(sessionId: number | string, onMessage: (log: string) => void, onError?: (error: Event) => void): Promise<EventSource> {
    const eventSource = new EventSource(`${API_BASE}/sessions/${sessionId}/logs`)
    
    eventSource.onmessage = (event) => {
      onMessage(event.data)
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      if (onError) onError(error)
    }
    
    return eventSource
  },

  // Reports
  async generateReport(sessionId: number | string, format: 'PDF' | 'HTML' = 'PDF'): Promise<void> {
    const res = await fetch(`${API_BASE}/reports/${sessionId}/generate?format=${format}`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error('Failed to generate report')
  },

  // Health Check
  async healthCheck(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE.replace('/api', '')}/actuator/health`)
    if (!res.ok) throw new Error('Health check failed')
    return res.json()
  }
}

export default api

