import React from 'react';
import { ExternalLink, Trash2, Globe } from 'lucide-react';
import { Monitor } from '../types';
import { StatusBadge } from './StatusBadge';

interface MonitorsTableProps {
  monitors: Monitor[];
  selectedMonitorId: string | number | null;
  onSelectMonitor: (id: string | number) => void;
  onDeleteMonitor: (id: string | number) => Promise<void>;
}

export const MonitorsTable: React.FC<MonitorsTableProps> = ({
  monitors,
  selectedMonitorId,
  onSelectMonitor,
  onDeleteMonitor,
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-mono font-bold text-white">Monitored Targets</h3>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          {monitors.length} Active Configs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-3">Target Domain</th>
              <th className="py-2.5 px-3">Condition</th>
              <th className="py-2.5 px-3">HTTP Status</th>
              <th className="py-2.5 px-3">Latency</th>
              <th className="py-2.5 px-3">Uptime</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {monitors.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-zinc-500">
                  No monitoring targets configured.
                </td>
              </tr>
            ) : (
              monitors.map((m) => {
                const monId = m.id || m._id || '';
                const isSelected = String(monId) === String(selectedMonitorId);
                const statusCode = m.last_status_code ?? m.lastStatusCode ?? null;
                const responseTime = m.last_response_time_ms ?? m.lastResponseTime ?? null;
                const uptime = m.uptime_percentage ?? m.uptime ?? 100;
                const interval = m.check_interval_seconds ?? m.interval ?? 5;

                return (
                  <tr
                    key={String(monId)}
                    onClick={() => onSelectMonitor(monId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-zinc-950 border-l-2 border-emerald-500'
                        : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">
                          {m.domain}
                        </span>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-500 hover:text-emerald-400 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Interval: {interval}s
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge status={m.status} size="sm" />
                    </td>

                    <td className="py-3 px-3 font-semibold">
                      <span
                        className={
                          statusCode && statusCode < 400
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {statusCode ? `HTTP ${statusCode}` : 'N/A'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-zinc-300">
                      {responseTime != null ? `${responseTime} ms` : '—'}
                    </td>

                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {uptime}%
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectMonitor(monId)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] transition"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => onDeleteMonitor(monId)}
                          className="p-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded border border-rose-900/60 transition"
                          title="Delete Target"
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
