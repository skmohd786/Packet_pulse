import React, { useState } from 'react';
import { Activity, Bell, CheckCircle2, ChevronRight, Eye, EyeOff, KeyRound, Laptop, LockKeyhole, LogOut, Monitor as MonitorIcon, Palette, ShieldCheck, Smartphone, UserRound, X } from 'lucide-react';
import { Incident, Monitor } from '../types';

interface ProfileSettingsProps {
  monitors: Monitor[];
  incidents: Incident[];
}

const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`pp-page-panel pp-settings-card ${className}`}>{children}</section>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <button className={`pp-switch ${checked ? 'is-on' : ''}`} type="button" aria-label={label} aria-pressed={checked} onClick={onChange}><i /></button>
);

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ monitors, incidents }) => {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('packetpulse.profile.name') || 'PacketPulse Admin');
  const [email, setEmail] = useState(() => localStorage.getItem('packetpulse.profile.email') || 'admin@packetpulse.local');
  const [username, setUsername] = useState(() => localStorage.getItem('packetpulse.profile.username') || 'packetpulse-admin');
  const [draft, setDraft] = useState({ displayName, email, username });
  const [saved, setSaved] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [nodeAlerts, setNodeAlerts] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  const beginEdit = () => { setDraft({ displayName, email, username }); setEditing(true); };
  const cancelEdit = () => { setDraft({ displayName, email, username }); setEditing(false); };
  const saveProfile = () => {
    setDisplayName(draft.displayName || 'PacketPulse Admin');
    setEmail(draft.email || 'admin@packetpulse.local');
    setUsername(draft.username || 'packetpulse-admin');
    localStorage.setItem('packetpulse.profile.name', draft.displayName);
    localStorage.setItem('packetpulse.profile.email', draft.email);
    localStorage.setItem('packetpulse.profile.username', draft.username);
    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  return (
    <div className="pp-page-content pp-profile-page">
      <div className="pp-settings-heading"><div><div className="pp-breadcrumb"><span>Dashboard</span><ChevronRight size={13} /><strong>Profile &amp; Settings</strong></div><h1>Profile &amp; Settings</h1><p>Manage your account, security, and workspace preferences.</p></div><div className="pp-account-status"><span /><b>Account active</b></div></div>
      <div className="pp-settings-layout">
        <div className="pp-settings-left">
          <Panel className="pp-profile-main-card"><div className="pp-profile-hero"><div className="pp-profile-avatar pp-profile-avatar-large">PP</div><div><h2>{displayName}</h2><p>{email}</p><div className="pp-profile-badges"><span><UserRound size={12} /> Administrator</span><span className="is-active"><CheckCircle2 size={12} /> Active</span></div></div><button className="pp-outline-button" type="button" onClick={beginEdit}><UserRound size={14} /> Edit profile</button></div><div className="pp-card-divider" /><div className="pp-card-title"><div><h3>Personal information</h3><span>Update the details associated with your account.</span></div>{editing && <span className="pp-editing-label">Editing</span>}</div><div className="pp-profile-fields pp-profile-fields-standard"><label>Full name<input disabled={!editing} value={editing ? draft.displayName : displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} /></label><label>Email address<input disabled={!editing} value={editing ? draft.email : email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} type="email" /></label><label>Role<input value="Administrator" disabled /></label><label>Username<input disabled={!editing} value={editing ? draft.username : username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} /></label></div>{editing && <div className="pp-form-actions"><button className="pp-cancel-button" type="button" onClick={cancelEdit}>Cancel</button><button className="pp-deploy pp-save-button" type="button" onClick={saveProfile}>Save changes</button></div>}{saved && <div className="pp-save-confirmation pp-toast-inline"><CheckCircle2 size={15} />Profile changes saved</div>}</Panel>
          <Panel><div className="pp-card-title"><div><h3>Session</h3><span>Review the devices currently connected to your account.</span></div><Laptop size={19} color="#78a8ff" /></div><div className="pp-session-list"><div><Smartphone size={17} /><span><b>Current session</b><small>Windows desktop · Chrome · Just now</small></span><em>Current</em></div><div><Laptop size={17} /><span><b>Last login</b><small>September 6, 2026 · 01:04 UTC</small></span><ChevronRight size={16} /></div></div><button className="pp-danger-outline" type="button" onClick={() => setSignOutOpen(true)}><LogOut size={15} /> Sign out of all devices</button></Panel>
        </div>
        <div className="pp-settings-right">
          <Panel><div className="pp-card-title"><div><h3>Security</h3><span>Protect your account and access.</span></div><ShieldCheck size={19} color="#48a8ff" /></div><button className="pp-action-row" type="button" onClick={() => setPasswordOpen(true)}><span className="pp-row-icon"><KeyRound size={16} /></span><span><b>Change password</b><small>Keep your credentials up to date.</small></span><ChevronRight size={16} /></button><div className="pp-action-row"><span className="pp-row-icon"><LockKeyhole size={16} /></span><span><b>Two-factor authentication</b><small>Extra protection for your account.</small></span><Toggle checked={twoFactor} onChange={() => setTwoFactor((value) => !value)} label="Toggle two-factor authentication" /></div><button className="pp-action-row" type="button"><span className="pp-row-icon"><MonitorIcon size={16} /></span><span><b>Active sessions</b><small>1 device currently signed in.</small></span><ChevronRight size={16} /></button></Panel>
          <Panel><div className="pp-card-title"><div><h3>Notifications</h3><span>Choose which updates you receive.</span></div><Bell size={19} color="#78a8ff" /></div><div className="pp-action-row"><span className="pp-row-icon"><ShieldCheck size={16} /></span><span><b>Security alerts</b><small>Important account and access events.</small></span><Toggle checked={securityAlerts} onChange={() => setSecurityAlerts((value) => !value)} label="Toggle security alerts" /></div><div className="pp-action-row"><span className="pp-row-icon"><Activity size={16} /></span><span><b>Node status alerts</b><small>Health changes from monitored nodes.</small></span><Toggle checked={nodeAlerts} onChange={() => setNodeAlerts((value) => !value)} label="Toggle node status alerts" /></div><div className="pp-action-row"><span className="pp-row-icon"><Bell size={16} /></span><span><b>System notifications</b><small>Product and workspace announcements.</small></span><Toggle checked={systemNotifications} onChange={() => setSystemNotifications((value) => !value)} label="Toggle system notifications" /></div><div className="pp-action-row"><span className="pp-row-icon"><Activity size={16} /></span><span><b>Email notifications</b><small>Send alerts to {email}.</small></span><Toggle checked={emailNotifications} onChange={() => setEmailNotifications((value) => !value)} label="Toggle email notifications" /></div></Panel>
          <Panel><div className="pp-card-title"><div><h3>Appearance</h3><span>Set how PacketPulse feels to use.</span></div><Palette size={19} color="#78a8ff" /></div><div className="pp-action-row"><span className="pp-row-icon"><Palette size={16} /></span><span><b>Theme</b><small>Dark theme is optimized for operations.</small></span><strong className="pp-setting-value">Dark</strong></div><div className="pp-action-row"><span className="pp-row-icon"><MonitorIcon size={16} /></span><span><b>Compact mode</b><small>Reduce spacing for denser data views.</small></span><Toggle checked={compactMode} onChange={() => setCompactMode((value) => !value)} label="Toggle compact mode" /></div></Panel>
        </div>
      </div>
      <div className="pp-settings-footnote"><Activity size={14} /> {monitors.length} monitors connected <span /> {incidents.filter((incident) => (incident.resolvedStatus || incident.status) === 'OPEN').length} open incidents <span /> PRO workspace</div>
      {passwordOpen && <div className="pp-modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setPasswordOpen(false)}><div className="pp-settings-modal" role="dialog" aria-modal="true" aria-labelledby="password-title"><button className="pp-modal-close" type="button" onClick={() => setPasswordOpen(false)}><X size={17} /></button><div className="pp-modal-icon"><KeyRound size={20} /></div><h2 id="password-title">Change password</h2><p>Choose a strong password you have not used elsewhere.</p><label>Current password<input type={passwordVisible ? 'text' : 'password'} /></label><label>New password<input type={passwordVisible ? 'text' : 'password'} /></label><label>Confirm new password<input type={passwordVisible ? 'text' : 'password'} /></label><button className="pp-password-visibility" type="button" onClick={() => setPasswordVisible((value) => !value)}>{passwordVisible ? <EyeOff size={14} /> : <Eye size={14} />} {passwordVisible ? 'Hide passwords' : 'Show passwords'}</button><div className="pp-form-actions"><button className="pp-cancel-button" type="button" onClick={() => setPasswordOpen(false)}>Cancel</button><button className="pp-deploy pp-save-button" type="button" onClick={() => setPasswordOpen(false)}>Update password</button></div></div></div>}
      {signOutOpen && <div className="pp-modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setSignOutOpen(false)}><div className="pp-settings-modal pp-confirm-modal" role="dialog" aria-modal="true"><div className="pp-modal-icon pp-danger-icon"><LogOut size={20} /></div><h2>Sign out everywhere?</h2><p>This will end all active PacketPulse sessions, including this device.</p><div className="pp-form-actions"><button className="pp-cancel-button" type="button" onClick={() => setSignOutOpen(false)}>Cancel</button><button className="pp-danger-button" type="button" onClick={() => setSignOutOpen(false)}>Sign out all devices</button></div></div></div>}
    </div>
  );
};
