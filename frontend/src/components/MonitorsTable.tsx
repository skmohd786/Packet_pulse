import React from 'react';
import { ExternalLink, Trash2, Globe, ArrowUpRight } from 'lucide-react';
import { Monitor } from '../types';
import { StatusBadge } from './StatusBadge';

interface MonitorsTableProps {
  monitors: Monitor[];
  selectedMonitorId: number | null;
  onSelectMonitor: (id: number) => void;
  onDeleteMonitor: (id: number) => Promise<void>;
}

export const MonitorsTable: React.FC<MonitorsTableProps> = ({
  monitors,
  selectedMonitorId,
  onSelectMonitor,
  onDeleteMonitor,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          Active Monitored Targets
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {monitors.length} Active Targets
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Domain / Name</th>
              <th className="py-3 px-4">Health Status</th>
              <th className="py-3 px-4">HTTP Status</th>
              <th className="py-3 px-4">Response Latency</th>
              <th className="py-3 px-4">Uptime</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {monitors.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  No domain monitors configured. Click "Add Domain" above.
                </td>
              </tr>
            ) : (
              monitors.map((m) => {
                const isSelected = m.id === selectedMonitorId;
                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMonitor(m.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/10 border-l-4 border-cyan-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-xs">
                          {m.name || m.domain}
                        </span>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-500 hover:text-cyan-400 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {m.domain}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold">
                      <span
                        className={
                          m.last_status_code && m.last_status_code < 400
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {m.last_status_code ? `HTTP ${m.last_status_code}` : 'N/A'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {m.last_response_time_ms != null ? `${m.last_response_time_ms} ms` : '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {m.uptime_percentage}%
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectMonitor(m.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Inspect Telemetry Chart"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMonitor(m.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                          title="Delete Monitor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
