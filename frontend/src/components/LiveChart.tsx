import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, Clock } from 'lucide-react';
import { Metric, Monitor } from '../types';

interface LiveChartProps {
  monitor: Monitor | null;
  metrics: Metric[];
}

export const LiveChart: React.FC<LiveChartProps> = ({ monitor, metrics }) => {
  if (!monitor) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
        Select a monitor to view live response time telemetry.
      </div>
    );
  }

  const chartData = metrics.map((m) => {
    const time = new Date(m.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return {
      time,
      latency: m.response_time_ms,
      statusCode: m.status_code || 0,
      isUp: m.is_up,
      status: m.status,
    };
  });

  const latestLatency = monitor.last_response_time_ms ?? 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Live Response-Time Telemetry
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
              {monitor.domain}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Real-time HTTP latency stream over WebSockets</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <div>
            <span className="text-slate-400">Current Ping: </span>
            <span className="text-cyan-400 font-bold">{latestLatency} ms</span>
          </div>
          <div className="w-px h-3.5 bg-slate-800" />
          <div>
            <span className="text-slate-400">HTTP Status: </span>
            <span
              className={`font-bold ${
                monitor.last_status_code === 200
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {monitor.last_status_code ?? 'Err'}
            </span>
          </div>
          <div className="w-px h-3.5 bg-slate-800" />
          <div>
            <span className="text-slate-400">Uptime: </span>
            <span className="text-emerald-400 font-bold">
              {monitor.uptime_percentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Awaiting first ping telemetry cycle...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                unit="ms"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                  fontFamily: 'JetBrains Mono',
                }}
                formatter={(val: any) => [`${val} ms`, 'Response Time']}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#latencyGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
