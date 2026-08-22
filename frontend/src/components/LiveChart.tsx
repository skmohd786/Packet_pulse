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
import { Activity, Clock, Globe, Zap } from 'lucide-react';
import { Metric, Monitor } from '../types';
import { StatusBadge } from './StatusBadge';

interface LiveChartProps {
  monitor: Monitor | null;
  metrics: Metric[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  monitor,
  metrics,
  selectedRange,
  onRangeChange,
}) => {
  if (!monitor) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <Globe className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <h4 className="text-sm font-mono font-medium text-zinc-400">No Target Selected</h4>
        <p className="text-xs text-zinc-600 mt-1">Select a monitor below or add a new domain to start tracing live response time.</p>
      </div>
    );
  }

  const chartData = metrics.map((m) => {
    const d = new Date(m.created_at);
    const time = ['6h', '24h'].includes(selectedRange)
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      time,
      latency: m.response_time_ms,
      statusCode: m.status_code || 0,
      isUp: m.is_up,
      status: m.status,
    };
  });

  const latencies = metrics.map((m) => m.response_time_ms);
  const currentLatency = monitor.last_response_time_ms ?? 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : currentLatency;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : currentLatency;
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : currentLatency;

  const lastChecked = monitor.updated_at
    ? new Date(monitor.updated_at).toLocaleTimeString()
    : 'Just now';

  const ranges = ['15m', '1h', '6h', '24h'];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      {/* Top Header Information Area */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-mono font-bold text-white">
                {monitor.domain}
              </h3>
              <StatusBadge status={monitor.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 mt-1">
              <span>Target: <span className="text-zinc-300">{monitor.url}</span></span>
              <span>•</span>
              <span>Interval: <span className="text-zinc-300">{monitor.check_interval_seconds}s</span></span>
              <span>•</span>
              <span>Last Checked: <span className="text-zinc-300">{lastChecked}</span></span>
            </div>
          </div>
        </div>

        {/* Latency Quick Stats Pill Strip */}
        <div className="grid grid-cols-4 gap-3 bg-zinc-950 px-3.5 py-2 rounded border border-zinc-800 text-xs font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Current</div>
            <div className="text-sm font-bold text-emerald-400">{currentLatency} ms</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Min</div>
            <div className="text-sm font-bold text-zinc-300">{minLatency} ms</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Avg</div>
            <div className="text-sm font-bold text-zinc-300">{avgLatency} ms</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Max</div>
            <div className="text-sm font-bold text-zinc-400">{maxLatency} ms</div>
          </div>
        </div>
      </div>

      {/* Main Response Time Telemetry Graph & Time Range Selector */}
      <div className="pt-5">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-3 flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Activity className="w-4 h-4 text-emerald-400" />
            Response Time (ms) — Real & Historical Metrics ({selectedRange})
          </span>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded border border-zinc-800">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => onRangeChange(r)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition ${
                  selectedRange === r
                    ? 'bg-zinc-800 text-emerald-400 font-bold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs">
              No metrics stored for range {selectedRange}...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  unit="ms"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#f4f4f5',
                    fontFamily: 'JetBrains Mono',
                  }}
                  formatter={(val: any) => [`${val} ms`, 'Response Time']}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
