interface Props {
  onAction: (action: string) => void;
}

export default function IconToolbar({ onAction }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
      <button onClick={() => onAction('start')} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 rounded">
        Start
      </button>
      <button onClick={() => onAction('stop')} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 rounded">
        Stop
      </button>
      <button onClick={() => onAction('export')} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded">
        Export
      </button>
      <button onClick={() => onAction('clear')} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded">
        Clear
      </button>
    </div>
  );
}
