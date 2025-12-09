interface Props {
  packetCount: number;
  deviceCount: number;
}

export default function Footer({ packetCount, deviceCount }: Props) {
  return (
    <div className="border-t border-gray-800 bg-black px-6 py-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Packets:</span>
            <span className="font-mono text-gray-400">{packetCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Devices:</span>
            <span className="font-mono text-gray-400">{deviceCount}</span>
          </div>
        </div>
        <div className="text-gray-600 font-mono">
          {new Date().toLocaleString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
          })}
        </div>
      </div>
    </div>
  );
}
