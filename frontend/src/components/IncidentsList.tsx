import React from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Incident } from '../types';

interface IncidentsListProps {
  incidents: Incident[];
  onResolve: (id: string | number) => Promise<void>;
}

export const IncidentsList: React.FC<IncidentsListProps> = ({ incidents, onResolve }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-mono font-bold text-white">Incident Log</h3>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          Total: {incidents.length}
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded">
          No active incidents logged. All target monitors healthy.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {incidents.map((incident) => {
            const incId = incident.id || incident._id || '';
            const status = incident.resolvedStatus || incident.status || 'OPEN';
            const isOpen = status === 'OPEN';
            const timeVal = incident.timestamp || incident.started_at;
            const startTime = timeVal
              ? new Date(timeVal).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'N/A';

            const titleText = incident.title || incident.message || `Incident on ${incident.domain || (incident as any).domain || 'Target'}`;

            return (
              <div
                key={String(incId)}
                className={`p-3 rounded border text-xs font-mono transition-all ${
                  isOpen
                    ? 'bg-rose-950/20 border-rose-800/60'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {isOpen ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">
                          {titleText}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            isOpen
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {incident.details}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                        <span>Started: {startTime}</span>
                        {(incident.resolved_at || incident.resolvedAt) && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">
                              Resolved: {new Date(incident.resolved_at || incident.resolvedAt!).toLocaleTimeString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <button
                      onClick={() => onResolve(incId)}
                      className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 rounded text-[11px] font-medium transition"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
