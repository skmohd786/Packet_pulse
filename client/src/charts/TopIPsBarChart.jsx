import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const COLORS = [
  '#00d4ff', '#3b82f6', '#8b5cf6', '#10b981', '#f97316',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#a78bfa',
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg px-3 py-2 shadow-card text-xs">
      <p className="font-mono text-text-primary mb-1">{payload[0]?.payload?.ip}</p>
      <p className="text-accent-cyan font-semibold">{payload[0]?.value?.toLocaleString()} packets</p>
    </div>
  );
};

const CustomLabel = ({ x, y, width, value }) => (
  <text x={x + width + 6} y={y + 10} fill="#94a3b8" fontSize={10} fontFamily="JetBrains Mono">
    {value.toLocaleString()}
  </text>
);

export default function TopIPsBarChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
        barSize={14}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2d3d" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#4b5563', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: '#1f2d3d' }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="ip"
          width={110}
          tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,212,255,0.05)' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} label={<CustomLabel />}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
