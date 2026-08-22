import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Activity, ShieldCheck, AlertTriangle, Cpu, Radio, Globe } from 'lucide-react';
import { Header } from './components/Header';
import { AddMonitorModal } from './components/AddMonitorModal';
import { LiveChart } from './components/LiveChart';
import { IncidentsList } from './components/IncidentsList';
import { MonitorsTable } from './components/MonitorsTable';
import { StatusBadge } from './components/StatusBadge';
import { EmptyState } from './components/EmptyState';
import { Monitor, Metric, Incident } from './types';

export const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<number | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<Record<number, Metric[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial REST fetch to seed current telemetry state
  const fetchData = async () => {
    try {
      const [monRes, incRes] = await Promise.all([
        fetch('/api/monitors').then((r) => r.json()),
        fetch('/api/incidents').then((r) => r.json()),
      ]);

      if (monRes.success && monRes.monitors) {
        setMonitors(monRes.monitors);
        if (monRes.monitors.length > 0 && !selectedMonitorId) {
          setSelectedMonitorId(monRes.monitors[0].id);
        }

        // Fetch initial metric history for monitors
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

    // Socket.IO WebSocket telemetry connection
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

    // Listen for live real-time metrics pushed from Node backend
    socket.on(
      'metric:new',
      (data: { monitorId: number; metric: Metric; monitor: Monitor }) => {
        const { monitorId, metric, monitor } = data;

        setMonitors((prevMonitors) => {
          const idx = prevMonitors.findIndex((m) => m.id === monitorId);
          if (idx === -1) {
            return [monitor, ...prevMonitors];
          }
          const updated = [...prevMonitors];
          updated[idx] = monitor;
          return updated;
        });

        setMetricsHistory((prevHistory) => {
          const existing = prevHistory[monitorId] || [];
          const updated = [...existing, metric].slice(-50);
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
      throw new Error(res.error || 'Failed to add target');
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-10">
      <Header
        monitors={monitors}
        incidents={incidents}
        isConnected={isConnected}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onRefresh={fetchData}
      />

      {!isConnected && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <EmptyState type="disconnected" onAction={fetchData} />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full space-y-6">
        {monitors.length === 0 && !loading ? (
          <EmptyState type="no-targets" onAction={() => setIsAddModalOpen(true)} />
        ) : (
          <>
            {/* Primary Visual Element: Response-Time Telemetry Chart */}
            <LiveChart monitor={selectedMonitor} metrics={currentMetrics} />

            {/* Split Grid: Target Table & Incident Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MonitorsTable
                  monitors={monitors}
                  selectedMonitorId={selectedMonitorId}
                  onSelectMonitor={(id) => setSelectedMonitorId(id)}
                  onDeleteMonitor={handleDeleteMonitor}
                />
              </div>

              <div>
                <IncidentsList incidents={incidents} onResolve={handleResolveIncident} />
              </div>
            </div>
          </>
        )}
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
