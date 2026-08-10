import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProtocolBadgeClass } from './StatCard';

// Format timestamp to short readable form
function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, 23);
  } catch { return iso; }
}

// Format port with service annotation
function fmtPort(port) {
  if (port == null) return '—';
  return port;
}

const COLUMNS = [
  { key: 'packetNumber', label: '#',        sortable: true,  width: 'w-12' },
  { key: 'timestamp',    label: 'Time',     sortable: true,  width: 'w-44' },
  { key: 'srcIP',        label: 'Source IP',sortable: true,  width: 'w-36' },
  { key: 'dstIP',        label: 'Dest IP',  sortable: true,  width: 'w-36' },
  { key: 'protocol',     label: 'Protocol', sortable: true,  width: 'w-24' },
  { key: 'srcPort',      label: 'Src Port', sortable: true,  width: 'w-20' },
  { key: 'dstPort',      label: 'Dst Port', sortable: true,  width: 'w-20' },
  { key: 'packetLength', label: 'Length',   sortable: true,  width: 'w-20' },
  { key: 'info',         label: 'Info',     sortable: false, width: 'flex-1' },
];

function SortIcon({ col, sortKey, sortDir }) {
  if (col.key !== sortKey) return <ChevronUp size={12} className="text-text-muted opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-accent-cyan" />
    : <ChevronDown size={12} className="text-accent-cyan" />;
}

function PacketInfo({ pkt }) {
  if (pkt.protocol === 'DNS') {
    const dir = pkt.dnsIsResponse ? 'Resp' : 'Query';
    const answers = pkt.dnsAnswerIPs && pkt.dnsAnswerIPs.length > 0
      ? ` → ${pkt.dnsAnswerIPs.slice(0, 2).join(', ')}`
      : '';
    return <span className="text-purple-400">{dir}: {pkt.dnsQueryName || '?'} ({pkt.dnsQueryType || 'A'}){answers}</span>;
  }
  if (pkt.protocol === 'HTTP') {
    if (pkt.httpMethod) return <span className="text-emerald-400">{pkt.httpMethod} {pkt.httpPath}</span>;
    if (pkt.httpStatusCode) return <span className="text-emerald-300">{pkt.httpStatusCode} {pkt.httpStatusText || ''}</span>;
  }
  if (pkt.protocol === 'HTTPS') {
    return <span className="text-cyan-400">Encrypted TLS Traffic</span>;
  }
  if (pkt.protocol === 'TCP') {
    const flags = pkt.tcpFlagString && pkt.tcpFlagString !== 'none' ? `[${pkt.tcpFlagString}]` : '';
    return <span className="text-blue-400">{flags} {pkt.service || ''}</span>;
  }
  if (pkt.protocol === 'ARP') {
    return <span className="text-yellow-400">Who has {pkt.dstIP}? Tell {pkt.srcIP}</span>;
  }
  return <span className="text-text-muted">{pkt.service || pkt.protocol || ''}</span>;
}

export default function PacketTable({
  packets = [],
  total = 0,
  page = 1,
  limit = 100,
  totalPages = 1,
  loading = false,
  selectedPacket = null,
  onSelectPacket,
  onPageChange,
}) {
  const [sortKey, setSortKey] = useState('packetNumber');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!packets.length) return [];
    return [...packets].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [packets, sortKey, sortDir]);

  // Loading skeleton rows
  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="p-4 border-b border-bg-border">
          <div className="skeleton h-5 w-32 rounded" />
        </div>
        <div className="overflow-x-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-bg-border/50">
              {[12, 44, 36, 36, 24, 20, 20, 20, 48].map((w, j) => (
                <div key={j} className={`skeleton h-4 rounded`} style={{ width: `${w * 4}px` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in">
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-primary">Packet List</span>
          <span className="text-xs text-text-secondary font-mono bg-bg-elevated px-2 py-0.5 rounded">
            {total.toLocaleString()} packets
          </span>
        </div>
        {/* Pagination Info */}
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>Page {page} / {totalPages}</span>
          <button
            onClick={() => onPageChange && onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1 rounded hover:bg-bg-elevated disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onPageChange && onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1 rounded hover:bg-bg-elevated disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-bg-border bg-bg-elevated/50">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  className={`px-3 py-2.5 text-left font-medium text-text-secondary uppercase tracking-wider
                    ${col.sortable ? 'cursor-pointer hover:text-text-primary select-none' : ''}
                    whitespace-nowrap`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🔍</span>
                    <span>No packets found</span>
                    <span className="text-xs">Try adjusting your search or filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((pkt) => {
                const isSelected = selectedPacket?.packetNumber === pkt.packetNumber;
                return (
                  <tr
                    key={pkt.packetNumber}
                    onClick={() => onSelectPacket && onSelectPacket(pkt)}
                    className={`border-b border-bg-border/30 transition-colors duration-100
                      ${isSelected ? 'table-row-selected' : 'table-row-hover'}`}
                  >
                    <td className="px-3 py-2 font-mono text-text-muted">{pkt.packetNumber}</td>
                    <td className="px-3 py-2 font-mono text-text-secondary whitespace-nowrap">
                      {fmtTime(pkt.timestamp)}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-primary whitespace-nowrap">
                      {pkt.srcIP || <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-primary whitespace-nowrap">
                      {pkt.dstIP || <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getProtocolBadgeClass(pkt.protocol)}`}>
                        {pkt.protocol || '?'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">
                      {fmtPort(pkt.srcPort)}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">
                      {fmtPort(pkt.dstPort)}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">
                      {pkt.packetLength != null ? `${pkt.packetLength}B` : '—'}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate">
                      <PacketInfo pkt={pkt} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-bg-border flex items-center justify-between text-xs text-text-secondary">
          <span>
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            {/* Page number buttons */}
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange && onPageChange(p)}
                  className={`w-7 h-7 rounded text-xs transition-colors ${
                    p === page
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                      : 'hover:bg-bg-elevated text-text-muted'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
