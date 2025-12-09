'use client';

import { useState } from 'react';

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('http://localhost:8080/api/offline/convert', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="border-b border-gray-800 px-6 py-4 bg-gray-950">
        <div className="text-xs font-semibold text-gray-400 tracking-wider">FILE CONVERTER</div>
        <div className="text-xs text-gray-600 mt-1">Convert baseband logs to PCAP format</div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Upload Area */}
          <div className="bg-gray-950 rounded-lg p-8 border-2 border-dashed border-gray-800 text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-xl flex items-center justify-center">
              <span className="text-3xl"><div className="w-4 h-4 border border-gray-600 rounded-sm" /></span>
            </div>
            
            <div className="text-sm text-gray-400 mb-4">
              {file ? file.name : 'Select a file to convert'}
            </div>
            
            <input
              type="file"
              accept=".qmdl,.sdm,.lpd"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-input"
            />
            
            <label
              htmlFor="file-input"
              className="inline-block px-6 py-2.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 rounded cursor-pointer transition-all"
            >
              Choose File
            </label>
            
            <div className="text-xs text-gray-600 mt-4">
              Supported formats: .qmdl, .sdm, .lpd
            </div>
          </div>

          {/* File Info */}
          {file && (
            <div className="bg-gray-950 rounded-lg p-5 border border-gray-800 mb-6">
              <div className="text-xs font-semibold text-gray-400 mb-3">FILE INFORMATION</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="text-gray-400">{file.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span className="text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="text-gray-400">{file.type || 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Convert Button */}
          {file && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="w-full px-6 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 transition-all"
            >
              {converting ? 'Loading Converting...' : 'Convert to PCAP'}
            </button>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 bg-gray-950 rounded-lg p-5 border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 mb-3">CONVERSION RESULT</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-400 font-semibold">Success</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Output File:</span>
                  <span className="text-gray-400">{result.outputFile || 'output.pcap'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Packets:</span>
                  <span className="text-gray-400">{result.packetCount?.toLocaleString() || 0}</span>
                </div>
              </div>
              
              <button className="w-full mt-4 px-4 py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded transition-all">
                Download PCAP
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
