import React from 'react';
import { Activity, Plus, RefreshCw } from 'lucide-react';
import { Monitor, Incident } from '../types';

interface HeaderProps {
  monitors: Monitor[];
  incidents: Incident[];
  wsStatus: 'Connected' | 'Reconnecting' | 'Disconnected';
  onOpenAddModal: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  monitors,
  incidents,
  wsStatus,
  onOpenAddModal,
  onRefresh,
}) => {
  const activeIncidents = incidents.filter((i) => (i.resolvedStatus || i.status) === 'OPEN');
  const avgUptime =
    monitors.length > 0
      ? (
          monitors.reduce((acc, m) => acc + (m.uptime_percentage ?? m.uptime ?? 100), 0) /
          monitors.length
        ).toFixed(2)
      : '100.00';

  const hasCritical = monitors.some((m) => m.status === 'CRITICAL');
  const hasWarning = monitors.some((m) => m.status === 'WARNING');
  const systemStatus = hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'HEALTHY';

  let wsDotColor = 'bg-emerald-500';
  let wsTextColor = 'text-emerald-400';
  if (wsStatus === 'Reconnecting') {
    wsDotColor = 'bg-amber-500 animate-ping';
    wsTextColor = 'text-amber-400';
  } else if (wsStatus === 'Disconnected') {
    wsDotColor = 'bg-rose-500';
    wsTextColor = 'text-rose-400';
  }

  return (
    <header className="bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand & Monitored Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-800 rounded border border-zinc-700">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-white font-mono tracking-tight">
              PacketPulse<span className="text-zinc-500 text-xs font-normal">/observability</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono border-l border-zinc-800 pl-4">
            <span className="text-zinc-500">Status:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                systemStatus === 'CRITICAL'
                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                  : systemStatus === 'WARNING'
                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
              }`}
            >
              {systemStatus}
            </span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          {/* WebSocket Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 rounded border border-zinc-800">
            <span className={`h-2 w-2 rounded-full ${wsDotColor}`} />
            <span className={`text-[11px] font-bold uppercase ${wsTextColor}`}>
              WS {wsStatus}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 bg-zinc-950 px-3 py-1 rounded border border-zinc-800 text-[11px]">
            <div>
              <span className="text-zinc-500">Targets: </span>
              <span className="text-zinc-200 font-bold">{monitors.length}</span>
            </div>
            <div className="w-px h-3 bg-zinc-800" />
            <div>
              <span className="text-zinc-500">Avg Uptime: </span>
              <span className="text-emerald-400 font-bold">{avgUptime}%</span>
            </div>
            <div className="w-px h-3 bg-zinc-800" />
            <div>
              <span className="text-zinc-500">Incidents: </span>
              <span
                className={`font-bold ${
                  activeIncidents.length > 0 ? 'text-rose-400' : 'text-zinc-300'
                }`}
              >
                {activeIncidents.length}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition"
              title="Refresh Monitoring Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-mono font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Target</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
