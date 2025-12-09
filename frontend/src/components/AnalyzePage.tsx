'use client';

import { useState, useEffect } from 'react';
import EnhancedClusteringMap from './EnhancedClusteringMap';

interface Device {
  deviceId: string;
  deviceModel: string;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}

export default function AnalyzePage({ devices, selectedDevice, onSelectDevice }: Props) {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/enhanced-clustering/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 1, numClusters: 4 })
      });
      const data = await res.json();
      setAnalysisData(data);
    } catch (error) {
      console.error('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Device Selection */}
      <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
        <div className="text-xs font-semibold text-gray-400 tracking-wider mb-3">DEVICE SELECTION</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {devices.length === 0 ? (
              <div className="text-xs text-gray-600 px-4 py-2 bg-gray-900 rounded">No devices connected</div>
            ) : (
              devices.map((device, idx) => (
                <button
                  key={device.deviceId}
                  onClick={() => onSelectDevice(device.deviceId)}
                  className={`px-4 py-2 text-xs font-medium border rounded transition-all ${
                    selectedDevice === device.deviceId
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  Mobile {idx + 1}
                </button>
              ))
            )}
          </div>
          
          {selectedDevice && (
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 transition-all"
            >
              {loading ? 'Loading Analyzing...' : 'Run Analysis'}
            </button>
          )}
        </div>
      </div>

      {!selectedDevice ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 mb-4 bg-gray-900 rounded-xl flex items-center justify-center">
            <span className="text-3xl"><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span>
          </div>
          <div className="text-sm text-gray-500">Select a device to run analysis</div>
        </div>
      ) : !analysisData ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-600 mb-4">Click "Run Analysis" to start clustering</div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
              <div className="text-xs text-gray-500 mb-2">Total Data Points</div>
              <div className="text-3xl font-bold">{analysisData.totalPoints?.toLocaleString() || 0}</div>
            </div>
            
            <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
              <div className="text-xs text-gray-500 mb-2">Clusters Found</div>
              <div className="text-3xl font-bold text-blue-400">{analysisData.numClusters || 0}</div>
            </div>
            
            <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
              <div className="text-xs text-gray-500 mb-2">Silhouette Score</div>
              <div className="text-3xl font-bold text-green-400">
                {analysisData.silhouetteScore?.toFixed(3) || 'N/A'}
              </div>
            </div>
          </div>

          {/* Cluster Statistics */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800 mb-6">
            <div className="text-xs font-semibold text-gray-400 tracking-wider mb-4">CLUSTER STATISTICS</div>
            <div className="grid grid-cols-4 gap-4">
              {analysisData.clusterStats?.map((cluster: any, idx: number) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-2">Cluster {idx + 1}</div>
                  <div className="text-2xl font-bold mb-3">{cluster.count}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">RSRP:</span>
                      <span className="text-gray-400">{cluster.avgRsrp?.toFixed(1)} dBm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RSRQ:</span>
                      <span className="text-gray-400">{cluster.avgRsrq?.toFixed(1)} dB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SINR:</span>
                      <span className="text-gray-400">{cluster.avgSinr?.toFixed(1)} dB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RF Summary + Map */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 tracking-wider mb-4">RF MEASUREMENT SUMMARY</div>
              <RFMeasurementSummary deviceId={selectedDevice} />
            </div>
            <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 tracking-wider mb-4">GEOGRAPHIC DISTRIBUTION</div>
              <div className="h-96">
                <EnhancedClusteringMap sessionId={1} />
              </div>
            </div>
          </div>

          {/* Signaling Viewer */}
          <div className="bg-gray-950 rounded-lg p-5 border border-gray-800">
            <div className="text-xs font-semibold text-gray-400 tracking-wider mb-4">SIGNALING MESSAGE VIEWER</div>
            <div className="h-[420px]">
              <SignalingMessageViewer sessionId={String(1)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
