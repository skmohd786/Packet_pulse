import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

function fmtTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toISOString().slice(11, 19); // HH:MM:SS
  } catch { return iso; }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg px-3 py-2 shadow-card text-xs">
      <p className="text-text-muted mb-1">{fmtTime(label)}</p>
      <p className="text-accent-cyan font-semibold">{payload[0]?.value?.toLocaleString()} packets</p>
      {payload[1] && <p className="text-blue-400">{payload[1]?.value?.toLocaleString()} bytes</p>}
    </div>
  );
};

export default function TrafficTimeChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No data available
      </div>
    );
  }

  // Limit to 100 data points for performance
  const displayData = data.length > 100
    ? data.filter((_, i) => i % Math.ceil(data.length / 100) === 0)
    : data;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={displayData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2d3d" />
        <XAxis
          dataKey="time"
          tickFormatter={fmtTime}
          tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={{ stroke: '#1f2d3d' }}
        />
        <YAxis
          tick={{ fill: '#4b5563', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#00d4ff"
          strokeWidth={1.5}
          fill="url(#colorCount)"
          dot={false}
          activeDot={{ r: 4, fill: '#00d4ff', stroke: '#0a0d14', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
