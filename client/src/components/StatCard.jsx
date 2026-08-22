// Utility: map protocol name to badge class
export function getProtocolBadgeClass(protocol) {
  const p = (protocol || '').toUpperCase();
  if (p === 'TCP')   return 'badge-tcp';
  if (p === 'UDP')   return 'badge-udp';
  if (p === 'DNS')   return 'badge-dns';
  if (p === 'HTTP')  return 'badge-http';
  if (p === 'HTTPS') return 'badge-https';
  if (p === 'ARP')   return 'badge-arp';
  if (p === 'ICMP' || p === 'ICMPV6') return 'badge-icmp';
  return 'badge-other';
}

// Utility: map protocol to hex color for charts
export function getProtocolColor(protocol) {
  const p = (protocol || '').toUpperCase();
  const colors = {
    TCP:    '#3b82f6',
    UDP:    '#f97316',
    DNS:    '#8b5cf6',
    HTTP:   '#10b981',
    HTTPS:  '#06b6d4',
    ARP:    '#f59e0b',
    ICMP:   '#ec4899',
    ICMPV6: '#ec4899',
    DHCP:   '#84cc16',
    NTP:    '#a78bfa',
  };
  return colors[p] || '#6b7280';
}

/**
 * StatCard — KPI metric display card.
 * @param {string}   label      - Metric label
 * @param {string}   value      - Primary value
 * @param {string}   sub        - Secondary / subtitle text
 * @param {ReactNode} icon      - Lucide icon element
 * @param {string}   color      - Tailwind color name: 'cyan', 'blue', 'green', 'purple', 'orange', 'red'
 * @param {string}   badge      - Optional badge text
 */
export default function StatCard({ label, value, sub, icon: Icon, color = 'cyan', badge }) {
  const colorMap = {
    cyan:   { bg: 'bg-accent-cyan/10',   text: 'text-accent-cyan',   border: 'border-accent-cyan/20',   glow: 'shadow-glow-cyan'   },
    blue:   { bg: 'bg-blue-500/10',      text: 'text-blue-400',      border: 'border-blue-500/20',      glow: 'shadow-glow-blue'   },
    green:  { bg: 'bg-emerald-500/10',   text: 'text-emerald-400',   border: 'border-emerald-500/20',   glow: 'shadow-glow-green'  },
    purple: { bg: 'bg-purple-500/10',    text: 'text-purple-400',    border: 'border-purple-500/20',    glow: 'shadow-glow-purple' },
    orange: { bg: 'bg-orange-500/10',    text: 'text-orange-400',    border: 'border-orange-500/20',    glow: 'shadow-glow-orange' },
    red:    { bg: 'bg-red-500/10',       text: 'text-red-400',       border: 'border-red-500/20',       glow: '' },
    yellow: { bg: 'bg-yellow-500/10',    text: 'text-yellow-400',    border: 'border-yellow-500/20',    glow: '' },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className={`card p-4 sm:p-5 ${c.glow} hover:scale-[1.02] transition-transform duration-200 border ${c.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold font-mono ${c.text} leading-none`}>
            {value ?? '—'}
          </p>
          {sub && <p className="text-xs text-text-secondary mt-1.5 truncate">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} className={c.text} />
          </div>
        )}
      </div>
      {badge && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
          {badge}
        </div>
      )}
    </div>
  );
}
