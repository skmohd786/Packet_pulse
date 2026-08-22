import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Package, Wifi, Globe, Server, HardDrive, Maximize2,
  Search, X, Loader2, AlertCircle, BarChart3
} from 'lucide-react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import PacketTable from '../components/PacketTable';
import PacketDetailModal from '../components/PacketDetailModal';
import ProtocolPieChart from '../charts/ProtocolPieChart';
import TrafficTimeChart from '../charts/TrafficTimeChart';
import TopIPsBarChart from '../charts/TopIPsBarChart';
import { getPackets, getStats } from '../api';

const PROTOCOL_FILTERS = ['All', 'TCP', 'UDP', 'DNS', 'HTTP', 'HTTPS', 'ARP', 'ICMP'];

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function DashboardPage() {
  const { fileId }    = useParams();
  const location      = useLocation();
  const navigate      = useNavigate();
  const state         = location.state || {};

  // ── State ──────────────────────────────────────────────────────────────────
  const [packets, setPackets]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [stats, setStats]               = useState(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableError, setTableError]     = useState(null);
  const [statsError, setStatsError]     = useState(null);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [protocolFilter, setProtocolFilter] = useState('All');
  const [activeTab, setActiveTab]       = useState('packets'); // 'packets' | 'charts'

  const debouncedSearch = useDebounce(searchQuery, 400);

  // ── Load Statistics ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fileId) return;
    setStatsLoading(true);
    setStatsError(null);

    getStats(fileId)
      .then(data => setStats(data))
      .catch(err => setStatsError(err.response?.data?.error || err.message))
      .finally(() => setStatsLoading(false));
  }, [fileId]);

  // ── Load Packets (with filter/search/page deps) ────────────────────────────
  const fetchPackets = useCallback(async (currentPage = 1) => {
    if (!fileId) return;
    setTableLoading(true);
    setTableError(null);

    const params = {
      page: currentPage,
      limit: 100,
    };
    if (debouncedSearch.trim()) params.query = debouncedSearch.trim();
    if (protocolFilter && protocolFilter !== 'All') params.protocol = protocolFilter;

    try {
      const data = await getPackets(fileId, params);
      setPackets(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
    } catch (err) {
      setTableError(err.response?.data?.error || err.message);
      if (err.response?.status === 404) {
        setTimeout(() => navigate('/'), 3000);
      }
    } finally {
      setTableLoading(false);
    }
  }, [fileId, debouncedSearch, protocolFilter, navigate]);

  useEffect(() => {
    setPage(1);
    fetchPackets(1);
  }, [debouncedSearch, protocolFilter, fileId]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchPackets(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filename from navigation state or fileId
  const displayFilename = state.filename || fileId;
  const displayPacketCount = stats?.totalPackets ?? state.packetCount;

  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Header fileId={fileId} filename={displayFilename} packetCount={displayPacketCount} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Stats Error ───────────────────────────────────────────────────── */}
        {statsError && (
          <div className="flex items-center gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            <AlertCircle size={16} className="flex-shrink-0" />
            {statsError}
          </div>
        )}

        {/* ── KPI Stat Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total Packets"
            value={statsLoading ? '…' : (stats?.totalPackets?.toLocaleString() ?? '0')}
            icon={Package}
            color="cyan"
            sub={stats?.fileInfo?.linkTypeName}
          />
          <StatCard
            label="TCP Packets"
            value={statsLoading ? '…' : (stats?.tcpPackets?.toLocaleString() ?? '0')}
            icon={Globe}
            color="blue"
            sub="Connection-oriented"
          />
          <StatCard
            label="UDP Packets"
            value={statsLoading ? '…' : (stats?.udpPackets?.toLocaleString() ?? '0')}
            icon={Wifi}
            color="orange"
            sub="Connectionless"
          />
          <StatCard
            label="DNS Queries"
            value={statsLoading ? '…' : (stats?.dnsPackets?.toLocaleString() ?? '0')}
            icon={Server}
            color="purple"
            sub="Name resolution"
          />
          <StatCard
            label="HTTP Packets"
            value={statsLoading ? '…' : (stats?.httpPackets?.toLocaleString() ?? '0')}
            icon={Globe}
            color="green"
            sub={stats?.httpsPackets ? `+${stats.httpsPackets} HTTPS` : 'Web traffic'}
          />
          <StatCard
            label="Avg Packet Size"
            value={statsLoading ? '…' : (stats?.avgPacketSize != null ? `${stats.avgPacketSize}B` : '0B')}
            icon={HardDrive}
            color="yellow"
            sub={stats?.largestPacket
              ? `Largest: #${stats.largestPacket.packetNumber} (${stats.largestPacket.size}B)`
              : 'Per packet'
            }
          />
        </div>

        {/* ── Tab Switcher ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-bg-card rounded-xl border border-bg-border p-1 w-fit">
          <button
            onClick={() => setActiveTab('packets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'packets'
                ? 'bg-bg-elevated text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Package size={14} />
            Packets
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'charts'
                ? 'bg-bg-elevated text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <BarChart3 size={14} />
            Analytics
          </button>
        </div>

        {/* ── Packets Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'packets' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search + Protocol Filters */}
            <div className="card p-3 flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by IP, protocol, port, domain, path…"
                  className="input-cyber w-full pl-9 pr-8 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Protocol Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PROTOCOL_FILTERS.map(p => (
                  <button
                    key={p}
                    onClick={() => setProtocolFilter(p)}
                    className={`btn-filter text-xs py-1 px-3 ${
                      protocolFilter === p ? 'btn-filter-active' : 'btn-filter-inactive'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Error */}
            {tableError && !tableLoading && (
              <div className="flex items-center gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                <AlertCircle size={16} />
                {tableError}
              </div>
            )}

            {/* Packet Table */}
            <PacketTable
              packets={packets}
              total={total}
              page={page}
              limit={100}
              totalPages={totalPages}
              loading={tableLoading}
              selectedPacket={selectedPacket}
              onSelectPacket={setSelectedPacket}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {/* ── Analytics Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'charts' && (
          <div className="space-y-5 animate-fade-in">
            {statsLoading ? (
              <div className="flex items-center justify-center py-24 gap-3 text-text-secondary">
                <Loader2 size={20} className="animate-spin text-accent-cyan" />
                <span>Loading analytics…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">

                {/* Protocol Distribution Pie */}
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-text-primary mb-1">Protocol Distribution</h2>
                  <p className="text-xs text-text-muted mb-4">Breakdown of captured protocols</p>
                  <ProtocolPieChart data={stats?.protocolDistribution || []} />
                </div>

                {/* Traffic Over Time */}
                <div className="card p-5 lg:col-span-1 xl:col-span-2">
                  <h2 className="text-sm font-semibold text-text-primary mb-1">Traffic Over Time</h2>
                  <p className="text-xs text-text-muted mb-4">Packets per time interval</p>
                  <TrafficTimeChart data={stats?.trafficOverTime || []} />
                </div>

                {/* Top Source IPs */}
                <div className="card p-5 lg:col-span-2 xl:col-span-3">
                  <h2 className="text-sm font-semibold text-text-primary mb-1">Top Source IPs</h2>
                  <p className="text-xs text-text-muted mb-4">Most active source addresses</p>
                  <TopIPsBarChart data={stats?.topSourceIPs || []} />
                </div>

                {/* Protocol Details Table */}
                {stats?.protocolDistribution?.length > 0 && (
                  <div className="card p-5 lg:col-span-2 xl:col-span-3">
                    <h2 className="text-sm font-semibold text-text-primary mb-4">Protocol Breakdown</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-bg-border text-text-muted uppercase tracking-wider">
                            <th className="text-left pb-2 pr-6">Protocol</th>
                            <th className="text-right pb-2 pr-6">Packets</th>
                            <th className="text-right pb-2 pr-6">Percentage</th>
                            <th className="text-left pb-2">Distribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.protocolDistribution.map(d => (
                            <tr key={d.protocol} className="border-b border-bg-border/30 hover:bg-bg-elevated/30">
                              <td className="py-2.5 pr-6">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium badge-${d.protocol.toLowerCase()}`}
                                  style={{ background: `${getProtocolColorHex(d.protocol)}20`, color: getProtocolColorHex(d.protocol), border: `1px solid ${getProtocolColorHex(d.protocol)}40` }}>
                                  {d.protocol}
                                </span>
                              </td>
                              <td className="py-2.5 pr-6 text-right font-mono text-text-primary">
                                {d.count.toLocaleString()}
                              </td>
                              <td className="py-2.5 pr-6 text-right font-mono text-text-secondary">
                                {d.percentage}%
                              </td>
                              <td className="py-2.5">
                                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden w-32">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${d.percentage}%`, background: getProtocolColorHex(d.protocol) }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Packet Detail Side Panel ──────────────────────────────────────── */}
      {selectedPacket && (
        <PacketDetailModal
          fileId={fileId}
          packet={selectedPacket}
          onClose={() => setSelectedPacket(null)}
        />
      )}
    </div>
  );
}

// Helper for the breakdown table row colors
function getProtocolColorHex(protocol) {
  const colors = {
    TCP: '#3b82f6', UDP: '#f97316', DNS: '#8b5cf6',
    HTTP: '#10b981', HTTPS: '#06b6d4', ARP: '#f59e0b',
    ICMP: '#ec4899', NTP: '#a78bfa', DHCP: '#84cc16',
  };
  return colors[protocol?.toUpperCase()] || '#6b7280';
}
