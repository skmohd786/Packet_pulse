import React from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { Incident } from '../types';

interface IncidentsListProps {
  incidents: Incident[];
  onResolve: (id: number) => Promise<void>;
}

export const IncidentsList: React.FC<IncidentsListProps> = ({ incidents, onResolve }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          Incident Log & Dashboard Alerts
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          Total: {incidents.length}
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
          No operational incidents detected. All system monitors healthy.
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {incidents.map((incident) => {
            const isOpen = incident.status === 'OPEN';
            const startTime = new Date(incident.started_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={incident.id}
                className={`p-4 rounded-xl border transition-all ${
                  isOpen
                    ? 'bg-rose-500/5 border-rose-500/30'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        isOpen
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isOpen ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          {incident.title}
                        </h4>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            isOpen
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {incident.details}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Started: {startTime}</span>
                        {incident.resolved_at && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">
                              Resolved: {new Date(incident.resolved_at).toLocaleTimeString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <button
                      onClick={() => onResolve(incident.id)}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
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
