import React from 'react';
import { AlertCircle, Globe, Radio, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-targets' | 'connecting' | 'disconnected' | 'failed';
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction }) => {
  if (type === 'no-targets') {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-10 text-center font-mono">
        <Globe className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-300">No Monitored Targets Configured</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
          Add a target domain or URL (e.g. <code className="text-emerald-400">google.com</code>) to initiate real HTTP health checks and telemetry recording.
        </p>
        {onAction && (
          <button
            onClick={onAction}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition"
          >
            + Add Target Domain
          </button>
        )}
      </div>
    );
  }

  if (type === 'disconnected') {
    return (
      <div className="bg-rose-950/20 border border-rose-800/60 rounded-lg p-4 font-mono text-xs text-rose-300 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>WebSocket Stream Disconnected. Reconnecting to telemetry backend...</span>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-800/60 border border-rose-800 text-rose-200 rounded text-[11px]"
          >
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center font-mono text-xs text-zinc-500">
      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
      <span>Loading monitoring configuration...</span>
    </div>
  );
};
