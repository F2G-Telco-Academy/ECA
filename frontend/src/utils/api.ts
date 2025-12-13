import type {
  Device,
  Session,
  KpiData,
  KpiAggregate,
  Anomaly,
  Artifact,
  MapData,
  SignalingRecord,
  PaginatedResponse
} from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// Enhanced fetch with retry logic
async function fetchWithRetry(url: string, options?: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options)
    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return fetchWithRetry(url, options, retries - 1)
    }
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

// Enhanced KPI types
export interface ComprehensiveKpiData {
  successRates: Record<string, number>
  counters: Record<string, number>
  measurements: Record<string, number>
  events: Record<string, EventDetail[]>
}

export interface EventDetail {
  frameNumber: number
  timestamp: number
}

export interface ClusterResult {
  totalPoints: number
  numClusters: number
  silhouetteScore: number
  clusterStatistics: Record<number, ClusterStats>
}

export interface ClusterStats {
  centroid: number[]
  pointCount: number
  avgRsrp: number
  avgRsrq: number
  avgSinr: number
}

export interface QualityZone {
  clusterId: number
  centroid: number[]
  pointCount: number
  quality: string
  avgRsrp: number
  avgRsrq: number
  avgSinr: number
}

export const api = {
  // ========== EXISTING APIs ==========
  
  // Device Management
  async getDevices(): Promise<Device[]> {
    const res = await fetchWithRetry(`${API_BASE}/devices`)
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to fetch devices' }))
      throw new Error(error.message || 'Failed to fetch devices')
    }
    return res.json()
  },

  async getDevice(id: string): Promise<Device> {
    const res = await fetch(`${API_BASE}/devices/${id}`)
    if (!res.ok) throw new Error('Failed to fetch device')
    return res.json()
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
    if (!deviceId || deviceId.trim().length === 0) {
      throw new Error('Device ID is required')
    }
    const res = await fetchWithRetry(`${API_BASE}/sessions/start?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to start session' }))
      throw new Error(error.message || 'Failed to start session')
    }
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

  async getKpisByCategory(sessionId: number | string, category: string): Promise<any> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/category/${category}`)
    if (!res.ok) throw new Error('Failed to fetch KPIs by category')
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

  async downloadArtifact(artifactId: number): Promise<Blob> {
    const res = await fetch(`${API_BASE}/artifacts/${artifactId}/download`)
    if (!res.ok) throw new Error('Failed to download artifact')
    return res.blob()
  },

  // Records (Signaling Messages)
  async getRecords(sessionId: string | number, page = 0, size = 50): Promise<PaginatedResponse<SignalingRecord>> {
    const res = await fetch(`${API_BASE}/records/session/${sessionId}?page=${page}&size=${size}`)
    if (!res.ok) throw new Error('Failed to fetch records')
    return res.json()
  },

  async getRecord(recordId: number): Promise<SignalingRecord> {
    const res = await fetch(`${API_BASE}/records/${recordId}`)
    if (!res.ok) throw new Error('Failed to fetch record')
    return res.json()
  },

  // ========== NEW ENHANCED APIs ==========

  // Comprehensive KPI Extraction
  async getComprehensiveKpis(sessionId: string | number): Promise<ComprehensiveKpiData> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/comprehensive`)
    if (!res.ok) throw new Error('Failed to fetch comprehensive KPIs')
    return res.json()
  },

  async extractKpisFromPcap(pcapPath: string): Promise<ComprehensiveKpiData> {
    const res = await fetch(`${API_BASE}/kpis/extract?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to extract KPIs')
    return res.json()
  },

  async getSuccessRates(sessionId: string | number): Promise<Record<string, number>> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/success-rates`)
    if (!res.ok) throw new Error('Failed to fetch success rates')
    return res.json()
  },

  async getMeasurements(sessionId: string | number): Promise<Record<string, number>> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/measurements`)
    if (!res.ok) throw new Error('Failed to fetch measurements')
    return res.json()
  },

  async getCounters(sessionId: string | number): Promise<Record<string, number>> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/counters`)
    if (!res.ok) throw new Error('Failed to fetch counters')
    return res.json()
  },

  async getEventDetails(sessionId: string | number, eventType: string): Promise<EventDetail[]> {
    const res = await fetch(`${API_BASE}/kpis/session/${sessionId}/events/${eventType}`)
    if (!res.ok) throw new Error('Failed to fetch event details')
    return res.json()
  },

  // GPS Clustering
  async clusterSession(sessionId: string | number, numClusters = 4): Promise<ClusterResult> {
    const res = await fetch(`${API_BASE}/clustering/session/${sessionId}/cluster?numClusters=${numClusters}`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error('Failed to cluster session')
    return res.json()
  },

  async getQualityZones(sessionId: string | number): Promise<{ zones: QualityZone[] }> {
    const res = await fetch(`${API_BASE}/clustering/session/${sessionId}/quality-zones`)
    if (!res.ok) throw new Error('Failed to fetch quality zones')
    return res.json()
  },

  async findOptimalK(sessionId: string | number): Promise<{ optimalK: number; silhouetteScore: number }> {
    const res = await fetch(`${API_BASE}/clustering/session/${sessionId}/optimal-k`)
    if (!res.ok) throw new Error('Failed to find optimal K')
    return res.json()
  },

  // Offline Log Conversion
  async convertOfflineLog(file: File): Promise<{ success: boolean; message: string; pcapPath: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    // Create AbortController with 5 minute timeout for large files
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes
    
    try {
      const res = await fetch(`${API_BASE}/offline/convert`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Conversion failed: ${errorText}`)
      }
      return res.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Conversion timeout (5 minutes). File may be too large.')
      }
      throw error
    }
  },

  // PCAP Analysis (Post-Processing)
  async uploadPcapForAnalysis(file: File): Promise<{ success: boolean; sessionId: string; kpisAvailable: string[]; message: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await fetch(`${API_BASE}/offline/analyze`, {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error('Failed to analyze PCAP')
    return res.json()
  },

  // Real-time Streaming (SSE)
  createKpiStream(sessionId: string | number): EventSource {
    return new EventSource(`${API_BASE}/sessions/${sessionId}/logs`)
  },

  createLogStream(sessionId: string | number): EventSource {
    return new EventSource(`${API_BASE}/sessions/${sessionId}/logs`)
  },

  // ========== ANALYTICS APIs ==========

  // Throughput Analysis
  async analyzeThroughput(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/throughput?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze throughput')
    return res.json()
  },

  async analyzeDetailedThroughput(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/throughput/detailed?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze detailed throughput')
    return res.json()
  },

  // Latency Analysis
  async analyzeLatency(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/latency?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze latency')
    return res.json()
  },

  // Handover Analysis
  async analyzeHandovers(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/handover?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze handovers')
    return res.json()
  },

  // RACH Analysis
  async analyzeRach(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/rach?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze RACH')
    return res.json()
  },

  // Protocol Correlation
  async correlateProtocols(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/correlation?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to correlate protocols')
    return res.json()
  },

  // Procedure Analysis
  async analyzeProcedures(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/procedures?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze procedures')
    return res.json()
  },

  // Report Generation
  async generateHtmlReport(sessionId: string | number): Promise<Blob> {
    const res = await fetch(`${API_BASE}/reports/session/${sessionId}/html`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error('Failed to generate report')
    return res.blob()
  },

  // Measurement Reports
  async analyzeMeasurementReports(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/measurement-reports?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze measurement reports')
    return res.json()
  },

  // SMS Analysis
  async analyzeSms(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/sms?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze SMS')
    return res.json()
  },

  // Cell Reselection
  async analyzeCellReselection(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/cell-reselection?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to analyze cell reselection')
    return res.json()
  },

  // ========== ENHANCED CLUSTERING APIs ==========

  // Extract complete dataset from PCAP
  async extractCompleteDataset(pcapPath: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/enhanced-clustering/extract-data?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to extract dataset')
    return res.json()
  },

  // Extract GPS traces
  async extractGpsTraces(pcapPath: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/enhanced-clustering/gps-traces?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to extract GPS traces')
    return res.json()
  },

  // Get KPI summary
  async getKpiSummaryFromPcap(pcapPath: string): Promise<any> {
    const res = await fetch(`${API_BASE}/enhanced-clustering/kpi-summary?pcapPath=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to get KPI summary')
    return res.json()
  },

  // Find optimal K using elbow method
  async findOptimalKFromPcap(pcapPath: string, maxK: number = 10): Promise<any> {
    const res = await fetch(`${API_BASE}/enhanced-clustering/optimal-k?pcapPath=${encodeURIComponent(pcapPath)}&maxK=${maxK}`)
    if (!res.ok) throw new Error('Failed to find optimal K')
    return res.json()
  },

  // Perform K-means clustering
  async performClustering(pcapPath: string, numClusters: number = 4): Promise<any> {
    const res = await fetch(`${API_BASE}/enhanced-clustering/analyze?pcapPath=${encodeURIComponent(pcapPath)}&numClusters=${numClusters}`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error('Failed to perform clustering')
    return res.json()
  },

  // ========== SIGNALING STREAM ==========
  
  // Create EventSource for signaling messages
  createSignalingStream(sessionId: number): EventSource {
    return new EventSource(`${API_BASE}/sessions/${sessionId}/signaling`)
  },

  // ========== FILE DOWNLOAD ==========
  
  // Download converted PCAP file
  async downloadConvertedFile(pcapPath: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/offline/download?path=${encodeURIComponent(pcapPath)}`)
    if (!res.ok) throw new Error('Failed to download file')
    return res.blob()
  },

  // ========== LTE ==========
  
  async getLteRrcState(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/lte/session/${sessionId}/rrc-state`)
    if (!res.ok) throw new Error('Failed to get LTE RRC state')
    return res.json()
  },

  async getLteNas(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/lte/session/${sessionId}/nas`)
    if (!res.ok) throw new Error('Failed to get LTE NAS')
    return res.json()
  },

  // ========== 5GNR ==========
  
  async get5gnrRrcState(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/5gnr/session/${sessionId}/rrc-state`)
    if (!res.ok) throw new Error('Failed to get 5GNR RRC state')
    return res.json()
  },

  async get5gnrNsaStatus(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/5gnr/session/${sessionId}/nsa-status`)
    if (!res.ok) throw new Error('Failed to get 5GNR NSA status')
    return res.json()
  },

  async get5gnrSaStatus(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/5gnr/session/${sessionId}/sa-status`)
    if (!res.ok) throw new Error('Failed to get 5GNR SA status')
    return res.json()
  },

  async get5gnrHandoverStats(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/5gnr/session/${sessionId}/handover-stats`)
    if (!res.ok) throw new Error('Failed to get 5GNR handover stats')
    return res.json()
  },

  // ========== RF ==========
  
  async getRfNrdcSummary(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/rf/session/${sessionId}/nrdc-summary`)
    if (!res.ok) throw new Error('Failed to get NRDC summary')
    return res.json()
  },

  async getRfBeamforming(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/rf/session/${sessionId}/beamforming`)
    if (!res.ok) throw new Error('Failed to get beamforming info')
    return res.json()
  },

  async getRfDss(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/rf/session/${sessionId}/dss`)
    if (!res.ok) throw new Error('Failed to get DSS info')
    return res.json()
  },

  // ========== QUALCOMM ==========
  
  async getQualcomm5gnr(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/qualcomm/session/${sessionId}/5gnr`)
    if (!res.ok) throw new Error('Failed to get Qualcomm 5GNR')
    return res.json()
  },

  async getQualcommLte(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/qualcomm/session/${sessionId}/lte`)
    if (!res.ok) throw new Error('Failed to get Qualcomm LTE')
    return res.json()
  },

  async getQualcommEventReports(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/qualcomm/session/${sessionId}/event-reports`)
    if (!res.ok) throw new Error('Failed to get event reports')
    return res.json()
  },

  async getQualcommL2Rlc(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/qualcomm/session/${sessionId}/l2-rlc`)
    if (!res.ok) throw new Error('Failed to get L2 RLC')
    return res.json()
  },

  // ========== HTTP/SIP ==========
  
  async getHttpSipMessages(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/http-sip/session/${sessionId}/messages`)
    if (!res.ok) throw new Error('Failed to get HTTP/SIP messages')
    return res.json()
  },

  // ========== 5GNR ADVANCED ==========
  
  async get5gnrTddConfig(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/5gnr/session/${sessionId}/tdd-config`)
    if (!res.ok) throw new Error('Failed to get TDD config')
    return res.json()
  },

  async get5gnrSipCellInfo(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/5gnr/session/${sessionId}/sipcell-info`)
    if (!res.ok) throw new Error('Failed to get SipCell info')
    return res.json()
  },

  async get5gnrFeatureSets(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/5gnr/session/${sessionId}/feature-sets`)
    if (!res.ok) throw new Error('Failed to get feature sets')
    return res.json()
  },

  // ========== LEGACY PROTOCOLS ==========
  
  async getWcdmaStatus(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/legacy/session/${sessionId}/wcdma-status`)
    if (!res.ok) throw new Error('Failed to get WCDMA status')
    return res.json()
  },

  async getGsmStatus(sessionId: string | number): Promise<any> {
    const res = await fetch(`${API_BASE}/legacy/session/${sessionId}/gsm-status`)
    if (!res.ok) throw new Error('Failed to get GSM status')
    return res.json()
  }
}
