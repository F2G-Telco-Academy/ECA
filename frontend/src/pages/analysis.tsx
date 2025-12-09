import React, { useState } from 'react';
import AnalyzePage from '@/components/AnalyzePage';

export default function AnalysisPage() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const devices = [
    { deviceId: 'session-1', deviceModel: 'Generic' },
  ];

  return (
    <AnalyzePage
      devices={devices}
      selectedDevice={selectedDevice}
      onSelectDevice={setSelectedDevice}
    />
  );
}
