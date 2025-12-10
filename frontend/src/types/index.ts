// Device and Session Types
export interface Device {
  deviceId: string
  model?: string
  manufacturer?: string
  firmware?: string
  chipset?: string
  status: string
  connected: boolean
  currentSessionId?: number
}

export interface Session {
  id: number
  deviceId: string
  deviceModel?: string
  firmware?: string
  status: 'ACTIVE' | 'STOPPED' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
  startTime: string
  endTime?: string
  sessionDir?: string
}

// KPI Types - matching KpiDataDto
export interface KpiData {
  // Signal Quality
  rsrp?: number
  rsrq?: number
  sinr?: number
  rscp?: number
  ecio?: number
  rxlev?: number
  rxqual?: number
  
  // Throughput
  throughput?: {
    dl: number
    ul: number
  }
  
  // Cell Info
  servingCell?: CellInfo
  secondaryCells?: CellInfo[]
  
  // Connection State
  ueState?: string
  rat?: string
  
  // Success Rates
  rrcSuccessRate?: number
  rachSuccessRate?: number
  handoverSuccessRate?: number
  erabSuccessRate?: number
  attachSuccessRate?: number
  tauSuccessRate?: number
  
  // Performance
  latency?: number
  packetLoss?: number
  jitter?: number
  
  // Legacy support
  signalQuality?: {
    rsrp?: number
    rsrq?: number
    sinr?: number
  }
}

export interface CellInfo {
  pci?: number
  earfcn?: number
  band?: number
  bandwidth?: number
  duplexMode?: string
  scs?: number
  txBeamId?: number
}

export interface KpiAggregate {
  id: number
  sessionId: number
  metric: string
  windowStart: string
  windowEnd: string
  minValue: number
  avgValue: number
  maxValue: number
  rat?: 'LTE' | 'NR' | 'WCDMA' | 'GSM'
  timestamp?: string
}


// Anomaly Types
export interface Anomaly {
  id: number
  sessionId: number
  category: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description?: string
  timestamp: string
  latitude?: number
  longitude?: number
  detailsJson?: string
}

// Artifact Types
export interface Artifact {
  id: number
  sessionId: number
  type: 'PCAP' | 'JSON' | 'PDF' | 'HTML' | 'RAW' | 'LOG'
  path: string
  size: number
  createdAt: string
}

// Map Types
export interface MapData {
  trace: GpsPoint[]
  anomalies: AnomalyMarker[]
  kpiOverlay: KpiPoint[]
}

export interface GpsPoint {
  lat: number
  lon: number
  timestamp: string
  rsrp?: number
  rsrq?: number
  sinr?: number
  speed?: number
  altitude?: number
}

export interface AnomalyMarker {
  lat: number
  lon: number
  type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  details?: string
  timestamp?: string
}

export interface KpiPoint {
  lat: number
  lon: number
  rsrp: number
  rsrq: number
  sinr?: number
  cqi?: number
}

// Signaling Message Record Types
export interface SignalingRecord {
  id: number
  sessionId: number
  timestamp: string
  protocol: string
  direction: 'UL' | 'DL'
  messageType?: string
  layer?: string
  frameNumber?: number
  hexData?: string
  decodedData?: string
  length?: number
  payloadJson: any
}

// Log Types
export interface LogEntry {
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  source: string
  message: string
  protocol?: string
}

// Report Types
export interface Report {
  id: number
  sessionId: number
  type: 'PDF' | 'HTML' | 'CSV'
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
  path?: string
  createdAt: string
}

// Error Types
export interface ErrorReport {
  id: number
  service: string
  sessionId?: number
  level: 'ERROR' | 'WARN' | 'INFO'
  message: string
  stack?: string
  createdAt: string
}

// User Types
export interface User {
  id: number
  username: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
  email?: string
}

// License Types
export interface License {
  id: number
  key: string
  validUntil: string
  featuresJson: any
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
}

// Component Props Types
export interface ComponentProps {
  sessionId: string | null
  deviceId?: string | null
}

// Dashboard Layout Types
export interface DashboardLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

// Chart Data Types
export interface ChartDataPoint {
  timestamp: string
  value: number
  label?: string
}

export interface TimeSeriesData {
  metric: string
  data: ChartDataPoint[]
  unit: string
  color?: string
}
