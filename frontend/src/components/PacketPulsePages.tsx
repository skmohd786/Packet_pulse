import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Globe2,
  HardDrive,
  Layers3,
  Network,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wifi,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Incident, Metric, Monitor } from '../types';
import { StatusBadge } from './StatusBadge';

interface PagesProps {
  monitors: Monitor[];
  incidents: Incident[];
  metrics: Metric[];
  onSelectMonitor: (id: string | number) => void;
  onResolve: (id: string | number) => Promise<void>;
  onOpenAddModal: () => void;
}

const valueOf = (monitor: Monitor, key: 'latency' | 'uptime') =>
  key === 'latency'
    ? monitor.lastResponseTime ?? monitor.last_response_time_ms ?? 0
    : monitor.uptime ?? monitor.uptime_percentage ?? 100;

const dateLabel = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`pp-page-panel ${className}`}>{children}</section>
);

const PageHeading: React.FC<{ eyebrow: string; title: string; description: string; icon: React.ReactNode }> = ({ eyebrow, title, description, icon }) => (
  <div className="pp-page-heading">
    <div className="pp-page-heading-icon">{icon}</div>
    <div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>
  </div>
);

export const OverviewPage: React.FC<PagesProps> = ({ monitors, incidents, metrics, onSelectMonitor, onOpenAddModal }) => {
  const activeIncidents = incidents.filter((incident) => (incident.resolvedStatus || incident.status) === 'OPEN');
  const healthy = monitors.filter((monitor) => monitor.status === 'HEALTHY').length;
  const averageLatency = monitors.length ? Math.round(monitors.reduce((sum, monitor) => sum + valueOf(monitor, 'latency'), 0) / monitors.length) : 0;
  const uptime = monitors.length ? (monitors.reduce((sum, monitor) => sum + valueOf(monitor, 'uptime'), 0) / monitors.length).toFixed(2) : '100.00';
  const timeline = metrics.slice(-18).map((metric, index) => ({ name: index, latency: metric.responseTime ?? metric.response_time_ms ?? 0 }));
  const statusData = [{ name: 'Healthy', value: healthy }, { name: 'Warning', value: monitors.filter((monitor) => monitor.status === 'WARNING').length }, { name: 'Critical', value: monitors.filter((monitor) => monitor.status === 'CRITICAL').length }];

  return <div className="pp-page-content">
    <PageHeading eyebrow="COMMAND CENTER / OVERVIEW" title="Network Overview" description="Real-time visibility into your infrastructure and service health." icon={<Network size={23} />} />
    <div className="pp-kpi-grid">
      <div className="pp-kpi-card"><span className="pp-kpi-label"><Activity size={15} /> Network health</span><strong className="pp-kpi-green">{uptime}%</strong><small><ArrowUpRight size={13} /> 0.18% vs last period</small></div>
      <div className="pp-kpi-card"><span className="pp-kpi-label"><Clock3 size={15} /> Avg response</span><strong>{averageLatency}<em>ms</em></strong><small><ArrowDownRight size={13} /> 4.2% faster today</small></div>
      <div className="pp-kpi-card"><span className="pp-kpi-label"><HardDrive size={15} /> Active nodes</span><strong>{monitors.length.toString().padStart(2, '0')}</strong><small>{healthy} healthy nodes reporting</small></div>
      <div className="pp-kpi-card"><span className="pp-kpi-label"><ShieldAlert size={15} /> Open incidents</span><strong className={activeIncidents.length ? 'pp-kpi-red' : 'pp-kpi-green'}>{activeIncidents.length.toString().padStart(2, '0')}</strong><small>{activeIncidents.length ? 'Requires attention' : 'All systems nominal'}</small></div>
    </div>
    <div className="pp-content-grid pp-overview-grid">
      <Panel className="pp-wide-panel"><div className="pp-panel-header"><div><h2>Network performance</h2><span>Response latency across monitored services</span></div><span className="pp-live-label"><i /> Live</span></div><div className="pp-chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={timeline}><defs><linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#78a8ff" stopOpacity={.35} /><stop offset="100%" stopColor="#78a8ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#293343" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" hide /><YAxis stroke="#758198" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#151c28', border: '1px solid #354158', color: '#e8edf7' }} /><Area type="monotone" dataKey="latency" stroke="#78a8ff" strokeWidth={2} fill="url(#overviewFill)" /></AreaChart></ResponsiveContainer></div></Panel>
      <Panel><div className="pp-panel-header"><div><h2>Node health</h2><span>Current distribution</span></div><Globe2 size={18} /></div><div className="pp-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} innerRadius={48} outerRadius={67} dataKey="value" stroke="none"><Cell fill="#48e0af" /><Cell fill="#ffad78" /><Cell fill="#ff9296" /></Pie></PieChart></ResponsiveContainer><div><strong>{healthy}</strong><span>healthy</span></div></div><div className="pp-legend">{statusData.map((item, index) => <span key={item.name}><i className={`pp-dot dot-${index}`} />{item.name}<b>{item.value}</b></span>)}</div></Panel>
    </div>
    <Panel><div className="pp-panel-header"><div><h2>Monitored services</h2><span>Click any service to inspect live telemetry</span></div><button className="pp-text-button" type="button" onClick={onOpenAddModal}>+ Add service</button></div><div className="pp-service-list">{monitors.length ? monitors.map((monitor) => <button className="pp-service-row" type="button" key={String(monitor.id || monitor._id)} onClick={() => onSelectMonitor(monitor.id || monitor._id || '')}><span className="pp-service-name"><i className={`pp-dot ${monitor.status === 'HEALTHY' ? 'dot-0' : monitor.status === 'WARNING' ? 'dot-1' : 'dot-2'}`} />{monitor.name || monitor.domain}<small>{monitor.domain}</small></span><span>{valueOf(monitor, 'latency')} ms</span><span>{valueOf(monitor, 'uptime')}%</span><StatusBadge status={monitor.status} size="sm" /></button>) : <div className="pp-empty-page"><Wifi size={24} /><span>No services configured yet.</span><button type="button" onClick={onOpenAddModal}>Add your first service</button></div>}</div></Panel>
  </div>;
};

export const TrafficPage: React.FC<PagesProps> = ({ monitors, metrics }) => {
  const traffic = metrics.slice(-24).map((metric, index) => ({ name: index, inbound: Math.max(8, (metric.responseTime ?? metric.response_time_ms ?? 0) * 1.8), outbound: Math.max(5, (metric.dnsTime ?? metric.dns_time_ms ?? 0) * 2.5) }));
  const routes = monitors.slice(0, 5).map((monitor, index) => ({ label: monitor.domain, value: Math.max(12, Math.round(valueOf(monitor, 'latency') * (index + 2))) }));
  return <div className="pp-page-content"><PageHeading eyebrow="TELEMETRY / FLOW MAP" title="Network Traffic" description="Understand how requests move through your monitored infrastructure." icon={<Activity size={23} />} /><div className="pp-traffic-summary"><div><span>Inbound traffic</span><strong>2.84 TB</strong><small><ArrowUpRight size={13} /> 18.4% this week</small></div><div><span>Outbound traffic</span><strong>1.26 TB</strong><small><ArrowDownRight size={13} /> 4.6% this week</small></div><div><span>Requests / sec</span><strong>8,492</strong><small><TrendingUp size={13} /> Peak 12,881</small></div><div><span>Edge regions</span><strong>{Math.max(monitors.length, 1).toString().padStart(2, '0')}</strong><small>All regions reporting</small></div></div><div className="pp-content-grid pp-traffic-grid"><Panel className="pp-wide-panel"><div className="pp-panel-header"><div><h2>Traffic volume</h2><span>Inbound and outbound throughput</span></div><span className="pp-period-chip">Last 24 hours</span></div><div className="pp-chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={traffic}><CartesianGrid stroke="#293343" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" hide /><YAxis stroke="#758198" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#151c28', border: '1px solid #354158' }} /><Area type="monotone" dataKey="inbound" stroke="#48e0af" fill="#48e0af" fillOpacity={.13} /><Area type="monotone" dataKey="outbound" stroke="#78a8ff" fill="#78a8ff" fillOpacity={.12} /></AreaChart></ResponsiveContainer></div><div className="pp-chart-legend"><span><i className="pp-dot dot-0" />Inbound</span><span><i className="pp-dot dot-blue" />Outbound</span></div></Panel><Panel><div className="pp-panel-header"><div><h2>Top destinations</h2><span>By traffic volume</span></div><Layers3 size={18} /></div><div className="pp-bars">{routes.length ? routes.map((route) => <div className="pp-bar-row" key={route.label}><span>{route.label}</span><div><i style={{ width: `${Math.min(route.value / Math.max(...routes.map((item) => item.value), 1) * 100, 100)}%` }} /></div><b>{route.value}k</b></div>) : <span className="pp-muted-text">Awaiting telemetry...</span>}</div></Panel></div><Panel><div className="pp-panel-header"><div><h2>Traffic path</h2><span>Active service relationships</span></div><span className="pp-live-label"><i /> Streaming</span></div><div className="pp-flow-map"><div><Network size={20} /><b>Edge ingress</b><span>Global traffic</span></div><ArrowUpRight size={22} /><div><Wifi size={20} /><b>PacketPulse</b><span>Routing layer</span></div><ArrowUpRight size={22} /><div><HardDrive size={20} /><b>Service nodes</b><span>{monitors.length} destinations</span></div></div></Panel></div>;
};

export const AnalyticsPage: React.FC<PagesProps> = ({ monitors, incidents, metrics }) => {
  const latencyData = monitors.map((monitor) => ({ name: (monitor.name || monitor.domain).slice(0, 12), latency: valueOf(monitor, 'latency'), uptime: valueOf(monitor, 'uptime') }));
  const resolved = incidents.filter((incident) => (incident.resolvedStatus || incident.status) === 'RESOLVED').length;
  return <div className="pp-page-content"><PageHeading eyebrow="INSIGHTS / PERFORMANCE" title="Analytics & Insights" description="Data-driven stories from your global network performance." icon={<BarChart3 size={23} />} /><div className="pp-insight-banner"><div><Sparkles size={22} /><div><strong>Performance is trending in the right direction</strong><span>Average response time is {metrics.length ? 'stable across your latest telemetry' : 'ready for its first telemetry sample'}.</span></div></div><span>AI assisted</span></div><div className="pp-content-grid pp-analytics-grid"><Panel className="pp-wide-panel"><div className="pp-panel-header"><div><h2>Service latency comparison</h2><span>Lower is better</span></div><Clock3 size={18} /></div><div className="pp-chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={latencyData} barSize={24}><CartesianGrid stroke="#293343" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="#758198" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#758198" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#151c28', border: '1px solid #354158' }} /><Bar dataKey="latency" fill="#78a8ff" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel><Panel><div className="pp-panel-header"><div><h2>Incident resolution</h2><span>Operational responsiveness</span></div><CheckCircle2 size={18} color="#48e0af" /></div><div className="pp-score"><strong>{incidents.length ? Math.round((resolved / incidents.length) * 100) : 100}%</strong><span>resolved</span></div><div className="pp-mini-stats"><span>Open <b>{incidents.length - resolved}</b></span><span>Resolved <b>{resolved}</b></span></div></Panel></div><Panel><div className="pp-panel-header"><div><h2>Service scorecards</h2><span>Reliability and latency by monitored service</span></div></div><div className="pp-scorecards">{monitors.map((monitor) => <div className="pp-scorecard" key={String(monitor.id || monitor._id)}><div><span>{monitor.domain}</span><StatusBadge status={monitor.status} size="sm" /></div><strong>{valueOf(monitor, 'uptime')}%</strong><small><Clock3 size={12} /> {valueOf(monitor, 'latency')}ms average latency</small><div className="pp-score-line"><i style={{ width: `${Math.min(valueOf(monitor, 'uptime'), 100)}%` }} /></div></div>)}</div></Panel></div>;
};

export const NodesPage: React.FC<PagesProps> = ({ monitors, onSelectMonitor, onOpenAddModal }) => <div className="pp-page-content"><PageHeading eyebrow="INFRASTRUCTURE / INVENTORY" title="Nodes Management" description="Provision, inspect, and monitor every edge node from one place." icon={<HardDrive size={23} />} /><div className="pp-node-toolbar"><div className="pp-node-count"><strong>{monitors.length.toString().padStart(2, '0')}</strong><span>Total nodes registered</span></div><button className="pp-deploy" type="button" onClick={onOpenAddModal}>+ Deploy Node</button></div><Panel className="pp-node-map"><div className="pp-map-grid"><div className="pp-map-orbit orbit-one" /><div className="pp-map-orbit orbit-two" />{monitors.map((monitor, index) => <button key={String(monitor.id || monitor._id)} className={`pp-map-node node-${index % 5}`} type="button" title={monitor.domain} onClick={() => onSelectMonitor(monitor.id || monitor._id || '')}><i className={monitor.status === 'HEALTHY' ? 'healthy' : monitor.status === 'WARNING' ? 'warning' : 'critical'} /></button>)}</div><div className="pp-map-caption"><span><i className="pp-dot dot-0" />Healthy nodes</span><span><i className="pp-dot dot-1" />Needs attention</span><span><i className="pp-dot dot-2" />Critical</span></div></Panel><Panel><div className="pp-panel-header"><div><h2>Registered nodes</h2><span>Last heartbeat and current status</span></div></div><div className="pp-node-table">{monitors.map((monitor) => <button type="button" key={String(monitor.id || monitor._id)} onClick={() => onSelectMonitor(monitor.id || monitor._id || '')}><span><i className={`pp-dot ${monitor.status === 'HEALTHY' ? 'dot-0' : monitor.status === 'WARNING' ? 'dot-1' : 'dot-2'}`} /><b>{monitor.name || monitor.domain}</b><small>{monitor.url}</small></span><span>{monitor.status}</span><span>{dateLabel(monitor.updatedAt || monitor.updated_at)}</span><span>{valueOf(monitor, 'latency')}ms</span></button>)}</div></Panel></div>;

export const IncidentsPage: React.FC<PagesProps> = ({ incidents, onResolve }) => <div className="pp-page-content"><PageHeading eyebrow="SECURITY / RESPONSE" title="Active Incidents" description="Investigate anomalies and coordinate a fast operational response." icon={<ShieldAlert size={23} />} /><div className="pp-incident-hero"><div><AlertTriangle size={25} /><div><strong>{incidents.filter((incident) => (incident.resolvedStatus || incident.status) === 'OPEN').length} incidents require attention</strong><span>PacketPulse is continuously correlating health checks and traffic signals.</span></div></div><span className="pp-incident-tag">Live response queue</span></div><Panel><div className="pp-panel-header"><div><h2>Incident log</h2><span>Newest events first</span></div><span className="pp-period-chip">{incidents.length} total</span></div><div className="pp-incident-list">{incidents.length ? incidents.map((incident) => { const open = (incident.resolvedStatus || incident.status) === 'OPEN'; const id = incident.id || incident._id || ''; return <div className={`pp-incident-row ${open ? 'is-open' : ''}`} key={String(id)}><div className="pp-incident-icon">{open ? <XCircle size={19} /> : <CheckCircle2 size={19} />}</div><div className="pp-incident-main"><div><strong>{incident.title || incident.message || incident.domain || 'Service incident'}</strong><span className={`pp-severity ${incident.severity.toLowerCase()}`}>{incident.severity}</span></div><p>{incident.details}</p><small>{dateLabel(incident.started_at || incident.timestamp)} {incident.domain ? `· ${incident.domain}` : ''}</small></div>{open && <button className="pp-resolve-button" type="button" onClick={() => onResolve(id)}>Resolve</button>}</div>; }) : <div className="pp-empty-page"><CheckCircle2 size={24} /><span>No incidents in the response queue.</span></div>}</div></Panel></div>;

export const SettingsPage: React.FC<PagesProps> = ({ monitors, incidents }) => {
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [incidentAlerts, setIncidentAlerts] = React.useState(true);
  const [displayName, setDisplayName] = React.useState(() => localStorage.getItem('packetpulse.profile.name') || 'PacketPulse Admin');
  const [email, setEmail] = React.useState(() => localStorage.getItem('packetpulse.profile.email') || 'admin@packetpulse.local');
  const [workspaceName, setWorkspaceName] = React.useState(() => localStorage.getItem('packetpulse.profile.workspace') || 'PacketPulse Production');
  const [saved, setSaved] = React.useState(false);
  const saveProfile = () => {
    localStorage.setItem('packetpulse.profile.name', displayName);
    localStorage.setItem('packetpulse.profile.email', email);
    localStorage.setItem('packetpulse.profile.workspace', workspaceName);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };
  return <div className="pp-page-content"><PageHeading eyebrow="WORKSPACE / ACCOUNT" title="Profile & Settings" description="Manage your PacketPulse workspace, notification preferences, and access." icon={<HardDrive size={23} />} /><div className="pp-settings-grid"><Panel><div className="pp-profile-card"><div className="pp-profile-avatar">PP</div><div><h2>PacketPulse Admin</h2><span>Workspace administrator</span><small>admin@packetpulse.local</small></div><button className="pp-text-button" type="button">Edit profile</button></div><div className="pp-profile-fields"><label>Display name<input defaultValue="PacketPulse Admin" /></label><label>Email address<input defaultValue="admin@packetpulse.local" type="email" /></label><label>Workspace name<input defaultValue="PacketPulse Production" /></label></div><button className="pp-deploy pp-save-button" type="button">Save profile</button></Panel><Panel><div className="pp-panel-header"><div><h2>Notifications</h2><span>Choose what reaches your workspace</span></div><BellIcon /></div><div className="pp-setting-row"><span><strong>Incident alerts</strong><small>Notify me when a monitor enters a warning or critical state.</small></span><button className={`pp-switch ${incidentAlerts ? 'is-on' : ''}`} type="button" aria-pressed={incidentAlerts} onClick={() => setIncidentAlerts(!incidentAlerts)}><i /></button></div><div className="pp-setting-row"><span><strong>Email summaries</strong><small>Receive a daily reliability summary for your services.</small></span><button className={`pp-switch ${emailAlerts ? 'is-on' : ''}`} type="button" aria-pressed={emailAlerts} onClick={() => setEmailAlerts(!emailAlerts)}><i /></button></div><div className="pp-setting-row"><span><strong>Live monitor count</strong><small>{monitors.length} monitors are currently connected to this workspace.</small></span><span className="pp-setting-value">{monitors.length}</span></div></Panel></div><Panel><div className="pp-panel-header"><div><h2>Workspace status</h2><span>Current operational account summary</span></div><CheckCircle2 size={18} color="#48e0af" /></div><div className="pp-workspace-stats"><span><b>{monitors.length}</b> monitors</span><span><b>{incidents.filter((incident) => (incident.resolvedStatus || incident.status) === 'OPEN').length}</b> open incidents</span><span><b>PRO</b> plan</span></div></Panel></div>;

};

const BellIcon: React.FC = () => <Activity size={18} color="#78a8ff" />;
