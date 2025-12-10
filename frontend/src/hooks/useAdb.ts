/**
 * ADB Hooks - Reusable React hooks for ADB device communication (DRY pattern)
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = 'http://localhost:8080/api/adb'

// Types
export interface CellularData {
  rsrp: number
  rsrq: number
  sinr: number
  rssi: number
  cqi: number
  cellId: string
  pci: number
  tac: number
  mcc: string
  mnc: string
  operator: string
  networkType: string
  timestamp: number
}

export interface GpsData {
  latitude: number
  longitude: number
  altitude: number
  accuracy: number
  timestamp: number
}

export interface DeviceSample {
  cellular: CellularData
  gps: GpsData
  timestamp: number
}

export interface ClusterZone {
  clusterId: number
  quality: string
  color: string
  avgRsrp: number
  avgRsrq: number
  avgSinr: number
  pointCount: number
  centerLat: number
  centerLon: number
  points: DataPoint[]
}

export interface DataPoint {
  latitude: number
  longitude: number
  rsrp: number
  rsrq: number
  sinr: number
  cqi: number
  cellId: string
  pci: number
  clusterId?: number
  timestamp: number
}

export interface ClusterUpdate {
  updateId: string
  sessionId: string
  timestamp: number
  zones: ClusterZone[]
  totalPoints: number
  metadata: Record<string, any>
}

/**
 * Hook: Get connected ADB devices
 */
export function useAdbDevices() {
  const [devices, setDevices] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/devices`)
      if (!res.ok) throw new Error('Failed to fetch devices')
      const data = await res.json()
      setDevices(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { devices, loading, error, refresh }
}

/**
 * Hook: Stream real-time cellular data from device
 */
export function useCellularStream(deviceId: string | null, intervalSeconds = 1) {
  const [data, setData] = useState<CellularData | null>(null)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!deviceId) {
      setData(null)
      setConnected(false)
      return
    }

    const url = `${API_BASE}/devices/${deviceId}/stream/cellular?intervalSeconds=${intervalSeconds}`
    const es = new EventSource(url)

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.addEventListener('cellular-data', (e: any) => {
      const cellularData = JSON.parse(e.data)
      setData(cellularData)
    })

    eventSourceRef.current = es

    return () => {
      es.close()
      setConnected(false)
    }
  }, [deviceId, intervalSeconds])

  return { data, connected }
}

/**
 * Hook: Stream real-time GPS data from device
 */
export function useGpsStream(deviceId: string | null, intervalSeconds = 1) {
  const [data, setData] = useState<GpsData | null>(null)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!deviceId) {
      setData(null)
      setConnected(false)
      return
    }

    const url = `${API_BASE}/devices/${deviceId}/stream/gps?intervalSeconds=${intervalSeconds}`
    const es = new EventSource(url)

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.addEventListener('gps-data', (e: any) => {
      const gpsData = JSON.parse(e.data)
      setData(gpsData)
    })

    eventSourceRef.current = es

    return () => {
      es.close()
      setConnected(false)
    }
  }, [deviceId, intervalSeconds])

  return { data, connected }
}

/**
 * Hook: Stream real-time cluster updates from device
 */
export function useClusterStream(
  deviceId: string | null,
  numClusters = 4,
  intervalSeconds = 3
) {
  const [update, setUpdate] = useState<ClusterUpdate | null>(null)
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState<ClusterUpdate[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!deviceId) {
      setUpdate(null)
      setConnected(false)
      setHistory([])
      return
    }

    const url = `${API_BASE}/devices/${deviceId}/stream/clusters?numClusters=${numClusters}&intervalSeconds=${intervalSeconds}`
    const es = new EventSource(url)

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.addEventListener('cluster-update', (e: any) => {
      const clusterUpdate = JSON.parse(e.data)
      setUpdate(clusterUpdate)
      setHistory(prev => [...prev, clusterUpdate].slice(-50)) // Keep last 50
    })

    eventSourceRef.current = es

    return () => {
      es.close()
      setConnected(false)
    }
  }, [deviceId, numClusters, intervalSeconds])

  return { update, connected, history }
}

/**
 * Hook: Combined real-time data (cellular + GPS + clusters)
 */
export function useRealtimeDriveTest(
  deviceId: string | null,
  options = {
    cellularInterval: 1,
    gpsInterval: 1,
    clusterInterval: 3,
    numClusters: 4
  }
) {
  const cellular = useCellularStream(deviceId, options.cellularInterval)
  const gps = useGpsStream(deviceId, options.gpsInterval)
  const clusters = useClusterStream(deviceId, options.numClusters, options.clusterInterval)

  return {
    cellular: cellular.data,
    gps: gps.data,
    clusters: clusters.update,
    clusterHistory: clusters.history,
    connected: cellular.connected || gps.connected || clusters.connected
  }
}

