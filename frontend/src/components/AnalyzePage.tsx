'use client';

import { useState, useEffect } from 'react';
import EnhancedClusteringMap from './EnhancedClusteringMap';
import RFMeasurementSummary from './RFMeasurementSummary';
import SignalingMessageViewer from './SignalingMessageViewer';

interface Device {
  deviceId: string;
  deviceModel: string;
}

interface Issue {
  id: string;
  title: string;
  category: 'Connection' | 'Performance' | 'Security' | 'Signal';
  severity: 'Critical' | 'Warning' | 'Info';
  timeAgo: string;
  devices: string[];
  description: string;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}

export default function AnalyzePage({ devices, selectedDevice, onSelectDevice }: Props) {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

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

  const mockIssues: Issue[] = [
    {
      id: '1',
      title: 'Taux d’échec RRC élevé',
      category: 'Connection',
      severity: 'Critical',
      timeAgo: 'il y a 2 min',
      devices: ['Mobile 1'],
      description: 'Le taux d’échec de connexion RRC dépasse le seuil attendu. Vérifier congestion ou configuration.'
    },
    {
      id: '2',
      title: 'Handover lent',
      category: 'Performance',
      severity: 'Warning',
      timeAgo: 'il y a 5 min',
      devices: ['Mobile 2'],
      description: 'Temps de handover augmenté sur la dernière heure. Impact potentiel sur la qualité d’appel.'
    },
    {
      id: '3',
      title: 'Retentative d’authentification',
      category: 'Security',
      severity: 'Warning',
      timeAgo: 'il y a 12 min',
      devices: ['Mobile 1', 'Mobile 2'],
      description: 'Plusieurs tentatives d’authentification détectées. Vérifier les logs d’authentification.'
    },
    {
      id: '4',
      title: 'Fluctuation de puissance',
      category: 'Signal',
      severity: 'Info',
      timeAgo: 'il y a 18 min',
      devices: ['Mobile 1'],
      description: 'Variations périodiques des niveaux de RSRP. Device en mouvement ou proche de la limite de cellule.'
    }
  ];

  const issues: Issue[] = analysisData?.issues || mockIssues;
  const summary = {
    total: issues.length,
    critical: issues.filter((i) => i.severity === 'Critical').length,
    warning: issues.filter((i) => i.severity === 'Warning').length,
    info: issues.filter((i) => i.severity === 'Info').length
  };

  const severityColor = (sev: Issue['severity']) => {
    switch (sev) {
      case 'Critical':
        return 'bg-red-100 text-red-700';
      case 'Warning':
        return 'bg-amber-100 text-amber-700';
      case 'Info':
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const categoryColor = (cat: Issue['category']) => {
    switch (cat) {
      case 'Connection':
        return 'bg-purple-100 text-purple-700';
      case 'Performance':
        return 'bg-green-100 text-green-700';
      case 'Security':
        return 'bg-pink-100 text-pink-700';
      case 'Signal':
      default:
        return 'bg-cyan-100 text-cyan-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-gray-800">
      {/* Device Selection */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white shadow-sm">
        <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">Device selection</div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {devices.length === 0 ? (
              <div className="text-xs text-gray-500 px-4 py-2 bg-gray-100 rounded-full">No devices connected</div>
            ) : (
              devices.map((device, idx) => (
                <button
                  key={device.deviceId}
                  onClick={() => onSelectDevice(device.deviceId)}
                  className={`px-4 py-2 text-xs font-semibold border rounded-full transition-all ${
                    selectedDevice === device.deviceId
                      ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {device.deviceModel || `Mobile ${idx + 1}`}
                </button>
              ))
            )}
          </div>

          {selectedDevice && (
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60 transition-all"
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          )}
        </div>
      </div>

      {!selectedDevice ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 rounded" />
          </div>
          <div className="text-sm text-gray-500">Select a device to run analysis</div>
        </div>
      ) : !analysisData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-xs text-gray-500 mb-2">Click "Run Analysis" to start clustering</div>
          {loading && <div className="text-xs text-gray-400">Processing...</div>}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Résumés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Total issues</div>
              <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Critical</div>
              <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Warnings</div>
              <div className="text-2xl font-bold text-amber-600">{summary.warning}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Info</div>
              <div className="text-2xl font-bold text-blue-600">{summary.info}</div>
            </div>
          </div>

          {/* Liste des résultats + panel détail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-blue-400 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${severityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${categoryColor(issue.category)}`}>
                      {issue.category}
                    </span>
                    <span className="text-xs text-gray-500">{issue.timeAgo}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{issue.title}</div>
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">{issue.description}</div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {issue.devices.map((d) => (
                      <span key={d} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200">
                        {d}
                      </span>
                    ))}
                    <button
                      className="ml-auto text-xs text-blue-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIssue(issue);
                      }}
                    >
                      Voir détail
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-3">Détail</div>
              {selectedIssue ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${severityColor(selectedIssue.severity)}`}>
                      {selectedIssue.severity}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${categoryColor(selectedIssue.category)}`}>
                      {selectedIssue.category}
                    </span>
                    <span className="text-xs text-gray-500">{selectedIssue.timeAgo}</span>
                  </div>
                  <div className="text-base font-semibold text-gray-800">{selectedIssue.title}</div>
                  <div className="text-xs text-gray-600 whitespace-pre-line">{selectedIssue.description}</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedIssue.devices.map((d) => (
                      <span key={d} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">Sélectionnez une alerte pour voir le détail.</div>
              )}
            </div>
          </div>

          {/* RF Summary + Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 tracking-wider mb-4">RF measurement summary</div>
              <RFMeasurementSummary deviceId={selectedDevice} />
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 tracking-wider mb-4">Geographic distribution</div>
              <div className="h-96">
                <EnhancedClusteringMap sessionId={1} />
              </div>
            </div>
          </div>

          {/* Signaling Viewer */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 tracking-wider mb-4">Signaling message viewer</div>
            <div className="h-[420px]">
              <SignalingMessageViewer sessionId={String(1)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
