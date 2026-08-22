import React from 'react';
import { Activity, Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Monitor, Incident } from '../types';
import { StatusBadge } from './StatusBadge';

interface MonitorOverviewProps {
  monitors: Monitor[];
  incidents: Incident[];
  selectedMonitor: Monitor | null;
}

export const MonitorOverview: React.FC<MonitorOverviewProps> = ({
  monitors,
  incidents,
  selectedMonitor,
}) => {
  const activeIncidents = incidents.filter((i) => (i.resolvedStatus || i.status) === 'OPEN');
  
  const statusCode = selectedMonitor
    ? (selectedMonitor.lastStatusCode ?? selectedMonitor.last_status_code ?? 200)
    : '200';

  const latency = selectedMonitor
    ? (selectedMonitor.lastResponseTime ?? selectedMonitor.last_response_time_ms ?? 0)
    : 0;

  const uptime = selectedMonitor
    ? (selectedMonitor.uptime ?? selectedMonitor.uptime_percentage ?? 100)
    : 100;

  const status = selectedMonitor ? selectedMonitor.status : 'HEALTHY';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-zinc-400 mb-1 text-xs">
          <span>Website Condition</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-1">
          <StatusBadge status={status} size="md" />
        </div>
        <div className="text-[10px] text-zinc-500 mt-2">Dynamic condition evaluator</div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-zinc-400 mb-1 text-xs">
          <span>HTTP Status</span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-xl font-bold text-emerald-400">
          HTTP {statusCode}
        </div>
        <div className="text-[10px] text-zinc-500 mt-1">Real-time HTTP response code</div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-zinc-400 mb-1 text-xs">
          <span>Response Latency</span>
          <Cpu className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-xl font-bold text-cyan-400">
          {latency} <span className="text-xs font-normal text-zinc-500">ms</span>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1">Round-trip HTTP check ping</div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-zinc-400 mb-1 text-xs">
          <span>Uptime</span>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-emerald-400">
          {uptime}%
        </div>
        <div className="text-[10px] text-zinc-500 mt-1">Aggregate target availability</div>
      </div>
    </div>
  );
};
