import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Header } from './components/Header';
import { AddMonitorModal } from './components/AddMonitorModal';
import { LiveChart } from './components/LiveChart';
import { IncidentsList } from './components/IncidentsList';
import { MonitorsTable } from './components/MonitorsTable';
import { EmptyState } from './components/EmptyState';
import { Monitor, Metric, Incident } from './types';

export const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | number | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>('15m');
  const [metricsHistory, setMetricsHistory] = useState<Record<string, Metric[]>>({});
  const [wsStatus, setWsStatus] = useState<'Connected' | 'Reconnecting' | 'Disconnected'>('Disconnected');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial monitors and incidents
  const fetchData = async () => {
    try {
      const [monRes, incRes] = await Promise.all([
        fetch('/api/monitors').then((r) => r.json()),
        fetch('/api/incidents').then((r) => r.json()),
      ]);

      if (monRes.success && monRes.monitors) {
        setMonitors(monRes.monitors);
        if (monRes.monitors.length > 0 && !selectedMonitorId) {
          const firstId = monRes.monitors[0].id || monRes.monitors[0]._id;
          setSelectedMonitorId(firstId);
        }
      }

      if (incRes.success && incRes.incidents) {
        setIncidents(incRes.incidents);
      }
    } catch (err) {
      console.error('Failed to load initial telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metrics history for selected monitor and time range
  const fetchMetricsForMonitor = async (monitorId: string | number, range: string) => {
    try {
      const res = await fetch(`/api/monitors/${monitorId}/metrics?range=${range}&limit=100`).then((r) => r.json());
      if (res.success && res.metrics) {
        setMetricsHistory((prev) => ({
          ...prev,
          [String(monitorId)]: res.metrics,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch historical metrics:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket.IO Real-Time Telemetry Connection
    // Architecture: Monitoring Engine -> New Metric -> Node.js Backend -> Socket.IO/WebSocket -> React Dashboard
    const socket: Socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket.IO WebSocket connected');
      setWsStatus('Connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO WebSocket disconnected');
      setWsStatus('Disconnected');
    });

    socket.io.on('reconnect_attempt', () => {
      setWsStatus('Reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setWsStatus('Disconnected');
    });

    // Receive live real-time metrics pushed from Node backend
    socket.on(
      'metric:new',
      (data: { monitorId: string | number; metric: Metric; monitor: Monitor }) => {
        const { monitorId, metric, monitor } = data;
        const targetId = String(monitorId || monitor.id || monitor._id);

        setMonitors((prevMonitors) => {
          const idx = prevMonitors.findIndex(
            (m) => String(m.id || m._id) === targetId
          );
          if (idx === -1) {
            return [monitor, ...prevMonitors];
          }
          const updated = [...prevMonitors];
          updated[idx] = monitor;
          return updated;
        });

        // Feed real live metric into current metrics history for charts
        setMetricsHistory((prevHistory) => {
          const existing = prevHistory[targetId] || [];
          const updated = [...existing, metric].slice(-100);
          return {
            ...prevHistory,
            [targetId]: updated,
          };
        });
      }
    );

    socket.on('incident:new', (newIncident: Incident) => {
      setIncidents((prev) => [newIncident, ...prev]);
    });

    socket.on('incident:update', (updatedIncident: Incident) => {
      const incId = String(updatedIncident.id || updatedIncident._id);
      setIncidents((prev) =>
        prev.map((i) => (String(i.id || i._id) === incId ? updatedIncident : i))
      );
    });

    socket.on('incident:resolved', (resolvedIncident: Incident) => {
      const incId = String(resolvedIncident.id || resolvedIncident._id);
      setIncidents((prev) =>
        prev.map((i) => (String(i.id || i._id) === incId ? resolvedIncident : i))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Trigger metrics fetch whenever selected monitor or range changes
  useEffect(() => {
    if (selectedMonitorId) {
      fetchMetricsForMonitor(selectedMonitorId, selectedRange);
    }
  }, [selectedMonitorId, selectedRange]);

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
    const newId = res.monitor.id || res.monitor._id;
    setSelectedMonitorId(newId);
  };

  const handleDeleteMonitor = async (id: string | number) => {
    const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' }).then(
      (r) => r.json()
    );

    if (res.success) {
      setMonitors((prev) =>
        prev.filter((m) => String(m.id || m._id) !== String(id))
      );
      if (String(selectedMonitorId) === String(id)) {
        const remaining = monitors.filter((m) => String(m.id || m._id) !== String(id));
        setSelectedMonitorId(
          remaining.length > 0 ? remaining[0].id || remaining[0]._id! : null
        );
      }
    }
  };

  const handleResolveIncident = async (id: string | number) => {
    const res = await fetch(`/api/incidents/${id}/resolve`, {
      method: 'POST',
    }).then((r) => r.json());

    if (res.success && res.incident) {
      const resId = String(res.incident.id || res.incident._id);
      setIncidents((prev) =>
        prev.map((i) => (String(i.id || i._id) === resId ? res.incident : i))
      );
    }
  };

  const selectedMonitor =
    monitors.find((m) => String(m.id || m._id) === String(selectedMonitorId)) ||
    (monitors[0] ?? null);

  const activeMetricsKey = selectedMonitor
    ? String(selectedMonitor.id || selectedMonitor._id)
    : '';
  const currentMetrics = activeMetricsKey ? metricsHistory[activeMetricsKey] || [] : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-10">
      <Header
        monitors={monitors}
        incidents={incidents}
        wsStatus={wsStatus}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onRefresh={fetchData}
      />

      {wsStatus === 'Disconnected' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <EmptyState type="disconnected" onAction={fetchData} />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full space-y-6">
        {monitors.length === 0 && !loading ? (
          <EmptyState type="no-targets" onAction={() => setIsAddModalOpen(true)} />
        ) : (
          <>
            {/* Primary Visual Element: Response Time & Historical Metrics Chart */}
            <LiveChart
              monitor={selectedMonitor}
              metrics={currentMetrics}
              selectedRange={selectedRange}
              onRangeChange={(r) => setSelectedRange(r)}
            />

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
