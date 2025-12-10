/**
 * Unified Device-Session Context Manager
 * DRY principle: Single source of truth for device/session state
 */

export interface DeviceSession {
  deviceId: string
  sessionId: number | null
  isCapturing: boolean
  model: string
  manufacturer: string
}

class DeviceContextManager {
  private sessions: Map<string, DeviceSession> = new Map()
  private currentDeviceId: string | null = null
  private listeners: Set<(context: DeviceSession | null) => void> = new Set()

  setDevice(deviceId: string, model: string = 'Unknown', manufacturer: string = 'Unknown') {
    if (!this.sessions.has(deviceId)) {
      this.sessions.set(deviceId, {
        deviceId,
        sessionId: null,
        isCapturing: false,
        model,
        manufacturer
      })
    }
    this.currentDeviceId = deviceId
    this.notify()
  }

  startSession(deviceId: string, sessionId: number) {
    const session = this.sessions.get(deviceId)
    if (session) {
      session.sessionId = sessionId
      session.isCapturing = true
      this.notify()
    }
  }

  stopSession(deviceId: string) {
    const session = this.sessions.get(deviceId)
    if (session) {
      session.isCapturing = false
      this.notify()
    }
  }

  getCurrentContext(): DeviceSession | null {
    return this.currentDeviceId ? this.sessions.get(this.currentDeviceId) || null : null
  }

  getAllSessions(): DeviceSession[] {
    return Array.from(this.sessions.values())
  }

  subscribe(listener: (context: DeviceSession | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const context = this.getCurrentContext()
    this.listeners.forEach(listener => listener(context))
  }

  removeDevice(deviceId: string) {
    this.sessions.delete(deviceId)
    if (this.currentDeviceId === deviceId) {
      this.currentDeviceId = Array.from(this.sessions.keys())[0] || null
    }
    this.notify()
  }
}

export const deviceContext = new DeviceContextManager()
