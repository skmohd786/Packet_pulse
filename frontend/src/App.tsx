import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Activity, ShieldCheck, AlertTriangle, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { Header } from './components/Header';
import { AddMonitorModal } from './components/AddMonitorModal';
import { LiveChart } from './components/LiveChart';
import { IncidentsList } from './components/IncidentsList';
import { MonitorsTable } from './components/MonitorsTable';
import { StatusBadge } from './components/StatusBadge';
import { Monitor, Metric, Incident } from './types';

export const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<number | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<Record<number, Metric[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Initial Data Fetch
  const fetchData = async () => {
    try {
      setLoading(true);
      const [monRes, incRes] = await Promise.all([
        fetch('/api/monitors').then((r) => r.json()),
        fetch('/api/incidents').then((r) => r.json()),
      ]);

      if (monRes.success && monRes.monitors) {
        setMonitors(monRes.monitors);
        if (monRes.monitors.length > 0 && !selectedMonitorId) {
          setSelectedMonitorId(monRes.monitors[0].id);
        }

        // Fetch initial metrics for each monitor
        for (const mon of monRes.monitors) {
          fetch(`/api/monitors/${mon.id}/metrics?limit=30`)
            .then((r) => r.json())
            .then((res) => {
              if (res.success) {
                setMetricsHistory((prev) => ({
                  ...prev,
                  [mon.id]: res.metrics,
                }));
              }
            });
        }
      }

      if (incRes.success && incRes.incidents) {
        setIncidents(incRes.incidents);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 2. Setup Socket.IO connection
    const socket: Socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    // Listen for live metrics pushed from Node backend
    socket.on(
      'metric:new',
      (data: { monitorId: number; metric: Metric; monitor: Monitor }) => {
        const { monitorId, metric, monitor } = data;

        // Update monitor state
        setMonitors((prevMonitors) => {
          const idx = prevMonitors.findIndex((m) => m.id === monitorId);
          if (idx === -1) {
            return [monitor, ...prevMonitors];
          }
          const updated = [...prevMonitors];
          updated[idx] = monitor;
          return updated;
        });

        // Append metric to history array for live charts
        setMetricsHistory((prevHistory) => {
          const existing = prevHistory[monitorId] || [];
          const updated = [...existing, metric].slice(-50); // Keep latest 50
          return {
            ...prevHistory,
            [monitorId]: updated,
          };
        });
      }
    );

    socket.on('incident:new', (newIncident: Incident) => {
      setIncidents((prev) => [newIncident, ...prev]);
    });

    socket.on('incident:resolved', (resolvedIncident: Incident) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === resolvedIncident.id ? resolvedIncident : i))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleAddMonitor = async (
    domain: string,
    name: string,
    interval: number
  ) => {
    const res = await fetch('/api/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, name, interval }),
    }).then((r) => r.json());

    if (!res.success) {
      throw new Error(res.error || 'Failed to add monitor');
    }

    setMonitors((prev) => [res.monitor, ...prev]);
    setSelectedMonitorId(res.monitor.id);
  };

  const handleDeleteMonitor = async (id: number) => {
    const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' }).then(
      (r) => r.json()
    );

    if (res.success) {
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      if (selectedMonitorId === id) {
        const remaining = monitors.filter((m) => m.id !== id);
        setSelectedMonitorId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const handleResolveIncident = async (id: number) => {
    const res = await fetch(`/api/incidents/${id}/resolve`, {
      method: 'POST',
    }).then((r) => r.json());

    if (res.success && res.incident) {
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? res.incident : i))
      );
    }
  };

  const selectedMonitor =
    monitors.find((m) => m.id === selectedMonitorId) || (monitors[0] ?? null);
  const currentMetrics = selectedMonitorId ? metricsHistory[selectedMonitorId] || [] : [];

  const avgLatency =
    monitors.length > 0
      ? Math.round(
          monitors.reduce(
            (acc, m) => acc + (m.last_response_time_ms || 0),
            0
          ) / monitors.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      <Header
        monitors={monitors}
        incidents={incidents}
        isConnected={isConnected}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 w-full space-y-8">
        {/* Metric KPI Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
              <span>Monitored Domains</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {monitors.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Active background HTTP ping jobs</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
              <span>Avg Latency (Ping)</span>
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono">
              {avgLatency} <span className="text-sm font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Real HTTP round-trip timing</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
              <span>System Health</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-1">
              <StatusBadge
                status={
                  monitors.some((m) => m.status === 'CRITICAL')
                    ? 'CRITICAL'
                    : monitors.some((m) => m.status === 'WARNING')
                    ? 'WARNING'
                    : 'HEALTHY'
                }
                size="lg"
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Dynamic condition evaluator</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
              <span>Active Incidents</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">
              {incidents.filter((i) => i.status === 'OPEN').length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Automated threshold triggers</div>
          </div>
        </div>

        {/* Live Response Time Recharts Component */}
        <LiveChart monitor={selectedMonitor} metrics={currentMetrics} />

        {/* Active Monitors Table View */}
        <MonitorsTable
          monitors={monitors}
          selectedMonitorId={selectedMonitorId}
          onSelectMonitor={(id) => setSelectedMonitorId(id)}
          onDeleteMonitor={handleDeleteMonitor}
        />

        {/* Incidents & Alerts Log */}
        <IncidentsList incidents={incidents} onResolve={handleResolveIncident} />
      </main>

      {/* Add Domain Modal */}
      <AddMonitorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMonitor}
      />
    </div>
  );
};
