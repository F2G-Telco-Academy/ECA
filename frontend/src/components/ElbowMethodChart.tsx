'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ElbowData {
  optimalK: number;
  sseValues: number[];
  silhouetteScores: number[];
}

export default function ElbowMethodChart({ pcapPath }: { pcapPath: string }) {
  const [data, setData] = useState<ElbowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElbowData();
  }, [pcapPath]);

  const fetchElbowData = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/enhanced-clustering/optimal-k?pcapPath=${pcapPath}&maxK=10`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch elbow data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading elbow analysis...</div>;
  if (!data) return <div className="p-4">No data available</div>;

  const chartData = data.sseValues.map((sse, idx) => ({
    k: idx + 2,
    sse,
    silhouette: data.silhouetteScores[idx]
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Elbow Method Analysis</h3>
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <div className="text-sm">
          <strong>Optimal K:</strong> {data.optimalK} clusters
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Based on SSE (Sum of Squared Errors) elbow point detection
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="k" label={{ value: 'Number of Clusters (K)', position: 'insideBottom', offset: -5 }} />
          <YAxis yAxisId="left" label={{ value: 'SSE', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Silhouette Score', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="sse" stroke="#8884d8" strokeWidth={2} name="SSE" />
          <Line yAxisId="right" type="monotone" dataKey="silhouette" stroke="#82ca9d" strokeWidth={2} name="Silhouette Score" />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 text-xs text-gray-600">
        <p><strong>SSE (Sum of Squared Errors):</strong> Measures cluster compactness. Lower is better.</p>
        <p><strong>Silhouette Score:</strong> Measures cluster separation. Range [-1, 1]. Higher is better.</p>
      </div>
    </div>
  );
}
