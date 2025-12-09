'use client';

import { useEffect, useState } from 'react';

interface KPISummary {
  total_measurements: number;
  rsrp: { min: number; max: number; avg: number };
  rsrq: { min: number; max: number; avg: number };
  sinr: { min: number; max: number; avg: number };
  quality_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

const MetricCard = ({ title, value, unit, color, description }: any) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="text-sm text-gray-600">{title}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}{unit}</div>
    {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
  </div>
);

const QualityBar = ({ label, count, total, color }: any) => {
  const percentage = (count / total) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="h-2 rounded-full transition-all" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default function ComprehensiveMetricsDashboard({ pcapPath }: { pcapPath: string }) {
  const [kpi, setKpi] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPISummary();
  }, [pcapPath]);

  const fetchKPISummary = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/enhanced-clustering/kpi-summary?pcapPath=${pcapPath}`);
      const data = await res.json();
      setKpi(data);
    } catch (error) {
      console.error('Failed to fetch KPI summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading metrics...</div>;
  if (!kpi) return <div className="p-4">No metrics available</div>;

  const totalQuality = kpi.quality_distribution.excellent + kpi.quality_distribution.good + 
                       kpi.quality_distribution.fair + kpi.quality_distribution.poor;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Measurement Overview</h3>
        <div className="text-3xl font-bold text-blue-600">{kpi.total_measurements}</div>
        <div className="text-sm text-gray-600">Total Measurement Reports</div>
      </div>

      {/* Signal Quality Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="RSRP (Reference Signal Received Power)"
          value={kpi.rsrp.avg.toFixed(1)}
          unit=" dBm"
          color={kpi.rsrp.avg >= -80 ? 'text-green-600' : kpi.rsrp.avg >= -95 ? 'text-blue-600' : 'text-orange-600'}
          description={`Range: ${kpi.rsrp.min.toFixed(1)} to ${kpi.rsrp.max.toFixed(1)} dBm`}
        />
        <MetricCard
          title="RSRQ (Reference Signal Received Quality)"
          value={kpi.rsrq.avg.toFixed(1)}
          unit=" dB"
          color={kpi.rsrq.avg >= -10 ? 'text-green-600' : kpi.rsrq.avg >= -15 ? 'text-blue-600' : 'text-orange-600'}
          description={`Range: ${kpi.rsrq.min.toFixed(1)} to ${kpi.rsrq.max.toFixed(1)} dB`}
        />
        <MetricCard
          title="SINR (Signal-to-Interference-plus-Noise Ratio)"
          value={kpi.sinr?.avg?.toFixed(1) || 'N/A'}
          unit={kpi.sinr?.avg ? ' dB' : ''}
          color="text-purple-600"
          description={kpi.sinr ? `Range: ${kpi.sinr.min.toFixed(1)} to ${kpi.sinr.max.toFixed(1)} dB` : 'Not available'}
        />
      </div>

      {/* Quality Distribution */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Signal Quality Distribution</h3>
        <QualityBar 
          label="Excellent (≥ -80 dBm)" 
          count={kpi.quality_distribution.excellent} 
          total={totalQuality}
          color="#33FF57"
        />
        <QualityBar 
          label="Good (-95 to -80 dBm)" 
          count={kpi.quality_distribution.good} 
          total={totalQuality}
          color="#3186cc"
        />
        <QualityBar 
          label="Fair (-110 to -95 dBm)" 
          count={kpi.quality_distribution.fair} 
          total={totalQuality}
          color="#FF5733"
        />
        <QualityBar 
          label="Poor (< -110 dBm)" 
          count={kpi.quality_distribution.poor} 
          total={totalQuality}
          color="#FF0000"
        />
      </div>

      {/* 3GPP Standards Reference */}
      <div className="bg-blue-50 p-4 rounded-lg text-sm">
        <h4 className="font-bold mb-2">3GPP TS 36.133 Standards</h4>
        <div className="space-y-1 text-xs">
          <div><strong>RSRP:</strong> -140 + index (dBm)</div>
          <div><strong>RSRQ:</strong> -19.5 + (index × 0.5) (dB)</div>
          <div><strong>Excellent:</strong> RSRP ≥ -80 dBm (Strong signal, high throughput)</div>
          <div><strong>Good:</strong> -95 ≤ RSRP &lt; -80 dBm (Stable connection)</div>
          <div><strong>Fair:</strong> -110 ≤ RSRP &lt; -95 dBm (Moderate quality)</div>
          <div><strong>Poor:</strong> RSRP &lt; -110 dBm (Cell edge, potential drops)</div>
        </div>
      </div>
    </div>
  );
}
