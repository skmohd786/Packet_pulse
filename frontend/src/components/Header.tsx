import React from 'react';
import { Activity, Plus, ShieldCheck, AlertTriangle, Radio } from 'lucide-react';
import { Monitor, Incident } from '../types';

interface HeaderProps {
  monitors: Monitor[];
  incidents: Incident[];
  isConnected: boolean;
  onOpenAddModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  monitors,
  incidents,
  isConnected,
  onOpenAddModal,
}) => {
  const activeIncidents = incidents.filter((i) => i.status === 'OPEN');
  const avgUptime =
    monitors.length > 0
      ? (
          monitors.reduce((acc, m) => acc + (m.uptime_percentage || 100), 0) /
          monitors.length
        ).toFixed(2)
      : '100.00';

  const hasCritical = monitors.some((m) => m.status === 'CRITICAL');
  const hasWarning = monitors.some((m) => m.status === 'WARNING');
  const systemStatus = hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'HEALTHY';

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white font-mono">
                Packet<span className="text-cyan-400">Pulse</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                MVP v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-Time Website & Health Observability</p>
          </div>
        </div>

        {/* System Stats Bar */}
        <div className="flex items-center gap-6 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-slate-400">WebSocket:</span>
            <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {isConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="w-px h-4 bg-slate-800" />

          <div>
            <span className="text-slate-400">Monitors: </span>
            <span className="text-white font-bold">{monitors.length}</span>
          </div>

          <div className="w-px h-4 bg-slate-800" />

          <div>
            <span className="text-slate-400">Uptime: </span>
            <span className="text-emerald-400 font-bold font-mono">{avgUptime}%</span>
          </div>

          <div className="w-px h-4 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            {activeIncidents.length > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-slate-400">Incidents: </span>
            <span
              className={`font-bold font-mono ${
                activeIncidents.length > 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {activeIncidents.length}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Domain</span>
        </button>
      </div>
    </header>
  );
};
