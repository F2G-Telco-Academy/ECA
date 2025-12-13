import { invoke } from '@tauri-apps/api/core'

export const tauriApi = {
  // ========== BACKEND MANAGEMENT ==========
  
  async startBackend(): Promise<string> {
    return invoke('start_backend')
  },

  async stopBackend(): Promise<string> {
    return invoke('stop_backend')
  },

  async checkBackendStatus(): Promise<boolean> {
    return invoke('check_backend_status')
  },

  // ========== ADB COMMANDS ==========
  
  async executeAdbCommand(command: string[]): Promise<string> {
    return invoke('execute_adb_command', { command })
  },

  async listAdbDevices(): Promise<string[]> {
    return invoke('list_adb_devices')
  },

  async startAdbLogcat(deviceId: string): Promise<string> {
    return invoke('execute_adb_command', { 
      command: ['-s', deviceId, 'logcat', '-v', 'time'] 
    })
  },

  async pullFile(deviceId: string, remotePath: string, localPath: string): Promise<string> {
    return invoke('execute_adb_command', { 
      command: ['-s', deviceId, 'pull', remotePath, localPath] 
    })
  },

  // ========== SCAT/PCAP PROCESSING ==========
  
  async convertQmdlToPcap(inputPath: string, outputPath: string): Promise<string> {
    return invoke('convert_qmdl_to_pcap', { inputPath, outputPath })
  },

  async convertSdmToPcap(inputPath: string, outputPath: string): Promise<string> {
    return invoke('convert_sdm_to_pcap', { inputPath, outputPath })
  },

  async analyzePcapWithTshark(pcapPath: string): Promise<string> {
    return invoke('analyze_pcap_with_tshark', { pcapPath })
  },

  // ========== FILE SYSTEM ==========
  
  async getAppDataDir(): Promise<string> {
    return invoke('get_app_data_dir')
  },

  async openFileLocation(path: string): Promise<void> {
    return invoke('open_file_location', { path })
  },

  // ========== SYSTEM UTILITIES ==========
  
  async getSystemInfo(): Promise<{
    cpu_usage: number
    memory_total: number
    memory_used: number
    memory_available: number
    os: string
    os_version: string
    kernel_version: string
  }> {
    return invoke('get_system_info')
  },

  async openTerminal(command: string): Promise<void> {
    return invoke('open_terminal', { command })
  },

  // ========== HELPER FUNCTIONS ==========
  
  async convertLogFile(filePath: string): Promise<string> {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const outputPath = filePath.replace(/\.(qmdl2?|sdm)$/i, '.pcap')

    if (ext === 'qmdl' || ext === 'qmdl2') {
      return this.convertQmdlToPcap(filePath, outputPath)
    } else if (ext === 'sdm') {
      return this.convertSdmToPcap(filePath, outputPath)
    } else {
      throw new Error(`Unsupported file type: ${ext}`)
    }
  },

  async startCaptureSession(deviceId: string): Promise<{
    sessionId: string
    logPath: string
  }> {
    const appDataDir = await this.getAppDataDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const logPath = `${appDataDir}/sessions/${deviceId}_${timestamp}.qmdl2`
    
    // Start ADB logcat capture
    await this.executeAdbCommand([
      '-s', deviceId,
      'shell', 'su', '-c',
      'cat /dev/diag > /sdcard/diag.qmdl2'
    ])

    return {
      sessionId: `${deviceId}_${timestamp}`,
      logPath
    }
  },

  async stopCaptureSession(deviceId: string, logPath: string): Promise<string> {
    // Stop capture and pull file
    await this.executeAdbCommand(['-s', deviceId, 'shell', 'pkill', 'cat'])
    await this.pullFile(deviceId, '/sdcard/diag.qmdl2', logPath)
    
    // Convert to PCAP
    const pcapPath = logPath.replace('.qmdl2', '.pcap')
    await this.convertQmdlToPcap(logPath, pcapPath)
    
    return pcapPath
  }
}

// Check if running in Tauri environment
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

// Export conditional API
export const platformApi = isTauri ? tauriApi : null
