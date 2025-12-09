'use client';

import { useState, useEffect, useRef } from 'react';

interface Device {
  deviceId: string;
  deviceModel: string;
}

interface Message {
  id: number;
  timestamp: string;
  ueNet: string;
  channel: string;
  message: string;
  direction: string;
  details: string;
}

interface Props {
  devices: Device[];
  selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
  onPacketCount: (count: number) => void;
}

export default function SignalingPage({ devices, selectedDevice, onSelectDevice, onPacketCount }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDevice && capturing) {
      const interval = setInterval(() => {
        const channels = ['UL DCCH', 'DL DCCH', 'UL CCCH', 'DL CCCH', 'PCCH', 'BCCH BCH', 'DL 5GNR'];
        const messages = [
          'xFA0 5GNR ulPreconfigurationComplete',
          'xFA0 5GNR securityModeComplete',
          'xFA0 5GNR rrcReconfigurationComplete',
          'xFA0 5GNR measurementReport',
          'xFA0 5GNR paging',
          '5GNR 5GNR MAC RACH Trigger',
          '5GNR 5GNR MAC RACH Trigger - CONNECTION_REQUEST'
        ];
        
        const newMsg: Message = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString() + '.' + Math.floor(Math.random() * 1000),
          ueNet: Math.random() > 0.5 ? 'UL' : 'DL',
          channel: channels[Math.floor(Math.random() * channels.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          direction: Math.random() > 0.5 ? '→' : '←',
          details: JSON.stringify({ version: 13, rrcTransactionId: 0 }, null, 2)
        };
        setMessages(prev => [...prev, newMsg]);
        onPacketCount(messages.length + 1);
        
        if (tableRef.current) {
          tableRef.current.scrollTop = tableRef.current.scrollHeight;
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [selectedDevice, capturing]);

  const getChannelColor = (channel: string) => {
    if (channel.includes('UL DCCH')) return 'text-cyan-400';
    if (channel.includes('DL DCCH')) return 'text-green-400';
    if (channel.includes('BCCH')) return 'text-yellow-400';
    if (channel.includes('PCCH')) return 'text-purple-400';
    if (channel.includes('5GNR')) return 'text-pink-400';
    return 'text-blue-400';
  };

  const getMessageColor = (message: string) => {
    if (message.includes('Complete')) return 'text-green-400';
    if (message.includes('Request')) return 'text-cyan-400';
    if (message.includes('paging')) return 'text-purple-400';
    if (message.includes('RACH')) return 'text-yellow-400';
    return 'text-white';
  };

  const exportCapture = () => {
    const csv = 'Time,UE-NET,Channel,Message\n' + 
      messages.map(m => `${m.timestamp},${m.ueNet},${m.channel},${m.message}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signaling_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="flex h-full bg-black">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-gray-800 px-4 py-2 bg-gray-950 flex items-center gap-2 text-xs">
          <span className="text-gray-500">Message Filter:</span>
          <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs">
            <option>None</option>
          </select>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Filtering</button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Filtering 2</button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded" onClick={() => setCapturing(!capturing)}>
            {capturing ? 'Pause' : 'Resume'}
          </button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded" onClick={exportCapture}>Export</button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Hex</button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Vertically</button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded" onClick={() => setMessages([])}>Clear</button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Find</button>
          <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">String Color Setting</button>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Detail</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Show Elapsed Time</span>
          </label>
        </div>

        {/* Filter Options */}
        <div className="border-b border-gray-800 px-4 py-2 bg-gray-950 flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" defaultChecked />
            <span>Show SIP</span>
          </label>
          <span className="text-gray-600">Free Size: 0</span>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Show Step1</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Step2</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>Step3</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" />
            <span>SACH Report</span>
          </label>
        </div>

        {!selectedDevice ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 mb-4 bg-gray-900 rounded-xl flex items-center justify-center border border-gray-800">
              <div className="w-8 h-8 border-2 border-gray-700 rounded" />
            </div>
            <div className="text-sm text-gray-500">Select a device to start capture</div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Messages Table */}
            <div className="flex-1 flex flex-col border-r border-gray-800">
              <div ref={tableRef} className="flex-1 overflow-auto bg-black">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-gray-600">
                    {capturing ? 'Waiting for messages...' : 'Click Resume to start capture'}
                  </div>
                ) : (
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-gray-950 border-b border-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-400 w-32">Time</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-400 w-20">UE-NET</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-400 w-32">Channel</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-400">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map(msg => (
                        <tr
                          key={msg.id}
                          onClick={() => setSelectedMsg(msg)}
                          className={`border-b border-gray-900 hover:bg-gray-950 cursor-pointer ${
                            selectedMsg?.id === msg.id ? 'bg-gray-900' : ''
                          }`}
                        >
                          <td className="px-3 py-1.5 text-gray-400">{msg.timestamp}</td>
                          <td className="px-3 py-1.5">
                            <span className={msg.ueNet === 'UL' ? 'text-cyan-400' : 'text-pink-400'}>
                              {msg.direction} {msg.ueNet}
                            </span>
                          </td>
                          <td className={`px-3 py-1.5 ${getChannelColor(msg.channel)}`}>{msg.channel}</td>
                          <td className={`px-3 py-1.5 ${getMessageColor(msg.message)}`}>{msg.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Message Details Panel */}
            <div className="w-96 bg-gray-950 flex flex-col">
              <div className="border-b border-gray-800 px-4 py-2 bg-gray-900">
                <div className="text-xs font-semibold text-gray-400">MESSAGE DETAILS</div>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {selectedMsg ? (
                  <div className="space-y-3 text-xs font-mono">
                    <div className="bg-black rounded p-3 border border-gray-800">
                      <div className="text-gray-500 mb-1">Timestamp</div>
                      <div className="text-gray-300">{selectedMsg.timestamp}</div>
                    </div>
                    
                    <div className="bg-black rounded p-3 border border-gray-800">
                      <div className="text-gray-500 mb-1">Direction</div>
                      <div className={selectedMsg.ueNet === 'UL' ? 'text-cyan-400' : 'text-pink-400'}>
                        {selectedMsg.ueNet} {selectedMsg.direction}
                      </div>
                    </div>
                    
                    <div className="bg-black rounded p-3 border border-gray-800">
                      <div className="text-gray-500 mb-1">Channel</div>
                      <div className={getChannelColor(selectedMsg.channel)}>{selectedMsg.channel}</div>
                    </div>
                    
                    <div className="bg-black rounded p-3 border border-gray-800">
                      <div className="text-gray-500 mb-1">Message</div>
                      <div className={getMessageColor(selectedMsg.message)}>{selectedMsg.message}</div>
                    </div>
                    
                    <div className="bg-black rounded p-3 border border-gray-800">
                      <div className="text-gray-500 mb-2">Details</div>
                      <pre className="text-gray-400 text-xs whitespace-pre-wrap">{selectedMsg.details}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-12 h-12 mb-3 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800">
                      <div className="w-6 h-6 border-2 border-gray-700 rounded" />
                    </div>
                    <div className="text-xs text-gray-600">Select a message to view details</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
