import React, { useState } from 'react';
import {
  Activity,
  Bell,
  Boxes,
  CheckCircle2,
  HelpCircle,
  Gauge,
  Network,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  LogOut,
  KeyRound,
  UsersRound,
  UserRound,
  X,
} from 'lucide-react';
import { Monitor, Incident } from '../types';

interface HeaderProps {
  monitors: Monitor[];
  incidents: Incident[];
  wsStatus: 'Connected' | 'Reconnecting' | 'Disconnected';
  onOpenAddModal: () => void;
  onRefresh: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  monitors,
  incidents,
  wsStatus,
  onOpenAddModal,
  onRefresh,
  activePage,
  onNavigate,
}) => {
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | 'utility' | null>(null);
  const [utilityLabel, setUtilityLabel] = useState('Docs');
  const activeIncidents = incidents.filter((i) => (i.resolvedStatus || i.status) === 'OPEN');
  const avgUptime =
    monitors.length > 0
      ? (
          monitors.reduce((acc, m) => acc + (m.uptime_percentage ?? m.uptime ?? 100), 0) /
          monitors.length
        ).toFixed(2)
      : '100.00';

  const hasCritical = monitors.some((m) => m.status === 'CRITICAL');
  const hasWarning = monitors.some((m) => m.status === 'WARNING');
  const systemStatus = hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'HEALTHY';

  let wsDotColor = 'bg-emerald-500';
  let wsTextColor = 'text-emerald-400';
  if (wsStatus === 'Reconnecting') {
    wsDotColor = 'bg-amber-500 animate-ping';
    wsTextColor = 'text-amber-400';
  } else if (wsStatus === 'Disconnected') {
    wsDotColor = 'bg-rose-500';
    wsTextColor = 'text-rose-400';
  }

  const navItems = [
    { label: 'Dashboard', icon: Gauge, page: 'overview' },
    { label: 'Network Traffic', icon: Network, page: 'traffic' },
    { label: 'Security', icon: Shield, page: 'incidents' },
    { label: 'Analytics', icon: Activity, page: 'analytics' },
    { label: 'Nodes', icon: Boxes, page: 'nodes' },
    { label: 'Settings', icon: Settings, page: 'settings' },
  ];

  const toggleMenu = (menu: 'notifications' | 'profile' | 'utility') => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const openUtility = (label: string) => {
    setUtilityLabel(label);
    setOpenMenu('utility');
  };

  return (
    <>
      <aside className="pp-sidebar">
        <div className="pp-brand">
          <div className="pp-brand-mark"><Network size={22} /></div>
          <div><strong>PacketPulse</strong><span>Network Intelligence</span></div>
        </div>
        <nav className="pp-nav" aria-label="Primary navigation">
          {navItems.map(({ label, icon: Icon, page }) => (
            <button className={`pp-nav-item${activePage === page ? ' is-active' : ''}`} key={label} type="button" onClick={() => onNavigate(page)}>
              <Icon size={19} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="pp-sidebar-bottom">
          <div className="pp-plan"><span>PRO PLAN</span><strong>{monitors.length || 0} active monitors</strong><div className="pp-progress"><i /></div></div>
          <button className="pp-nav-item" type="button" onClick={() => { onNavigate('settings'); setOpenMenu(null); }}><HelpCircle size={19} /><span>Help Center</span></button>
          <button className="pp-nav-item" type="button" onClick={() => { onNavigate('settings'); setOpenMenu(null); }}><Sparkles size={19} /><span>Upgrade Plan</span></button>
        </div>
      </aside>
      <header className="pp-topbar">
        <div className="pp-search"><span>⌕</span><input aria-label="Search" placeholder="Search resources, logs, settings..." /><kbd>/</kbd></div>
        <div className="pp-toplinks"><button type="button" onClick={() => openUtility('Docs')}>Docs</button><button type="button" onClick={() => openUtility('API')}>API</button><button type="button" onClick={() => openUtility('Status')}>Status</button></div>
        <div className="pp-top-actions">
          <div className="pp-live"><span className={`pp-live-dot ${wsDotColor}`} />{wsStatus}</div>
          <button className="pp-icon-button" type="button" title="Refresh monitoring data" onClick={onRefresh}><RefreshCw size={17} /></button>
          <div className="pp-menu-anchor"><button className="pp-icon-button pp-notification-button" type="button" title="Notifications" onClick={() => toggleMenu('notifications')}><Bell size={18} />{activeIncidents.length > 0 && <span className="pp-notification-count">{Math.min(activeIncidents.length, 9)}</span>}</button>{openMenu === 'notifications' && <div className="pp-popover pp-notifications"><div className="pp-popover-header"><strong>Notifications</strong><button type="button" onClick={() => setOpenMenu(null)}><X size={15} /></button></div>{activeIncidents.length ? activeIncidents.slice(0, 4).map((incident) => <button className="pp-notification-item" type="button" key={String(incident.id || incident._id)} onClick={() => { onNavigate('incidents'); setOpenMenu(null); }}><span className="pp-notification-dot" /><span><b>{incident.title || incident.domain || 'Active incident'}</b><small>{incident.severity} · needs attention</small></span></button>) : <div className="pp-popover-empty"><CheckCircle2 size={18} />All systems are quiet.</div>}</div>}</div>
          <button className="pp-deploy" type="button" onClick={onOpenAddModal}><Plus size={16} /> Deploy Node</button>
          <div className="pp-menu-anchor"><button className="pp-avatar pp-avatar-button" type="button" title="Open profile menu" onClick={() => toggleMenu('profile')}>PP</button>{openMenu === 'profile' && <div className="pp-profile-panel"><div className="pp-profile-panel-head"><div className="pp-profile-panel-avatar">PP<span /></div><div><div className="pp-profile-panel-name"><strong>PacketPulse Admin</strong><b>OWNER</b></div><small>admin@packetpulse.local <span>▣</span></small></div></div><div className="pp-profile-workspace"><span className="pp-workspace-dot" /><strong>Production Cluster US-East</strong><b>v2.14.0</b></div><div className="pp-profile-actions"><button type="button" onClick={() => { onNavigate('settings'); setOpenMenu(null); }}><span><UserRound size={15} /></span><strong>Profile &amp; Settings</strong><kbd>⌘,</kbd></button><button type="button" onClick={() => setOpenMenu(null)}><span><UsersRound size={15} /></span><strong>Team &amp; Access Roles</strong><small>12 members</small></button><button type="button" onClick={() => setOpenMenu(null)}><span><KeyRound size={15} /></span><strong>API Keys &amp; Telemetry Tokens</strong><ChevronRightIcon /></button></div><div className="pp-profile-panel-footer"><button type="button" onClick={() => { onNavigate('settings'); setOpenMenu(null); }}><Settings size={14} /> Workspace settings</button><button type="button" onClick={() => setOpenMenu(null)}><LogOut size={14} /> Sign out</button></div></div>}</div>
        </div>
      </header>
      {openMenu === 'utility' && <div className="pp-utility-popover"><strong>{utilityLabel}</strong><span>{utilityLabel === 'Status' ? `System ${systemStatus.toLowerCase()} · WebSocket ${wsStatus.toLowerCase()}.` : utilityLabel === 'API' ? 'The monitoring API is connected and ready for requests.' : 'Review PacketPulse workspace guidance and operational references.'}</span><button type="button" onClick={() => { onNavigate(utilityLabel === 'Status' ? 'overview' : 'settings'); setOpenMenu(null); }}>{utilityLabel === 'Status' ? 'Open dashboard' : 'Open workspace settings'}</button></div>}
      <div className="pp-status-strip"><span className="pp-status-pulse" /> System operational <span className="pp-strip-divider" /> {monitors.length} monitors <span className="pp-strip-divider" /> {activeIncidents.length} open incidents <span className={`pp-system-status ${systemStatus.toLowerCase()}`}>{systemStatus}</span><span className="pp-strip-uptime">Avg uptime <b>{avgUptime}%</b></span></div>
    </>
  );
};

const ChevronRightIcon: React.FC = () => <span className="pp-panel-chevron">›</span>;
