import { useEffect, useState, useRef } from 'react';
import { X, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { getPacketDetail } from '../api';
import { getProtocolBadgeClass } from './StatCard';

// Collapsible section for layer display
function LayerSection({ title, color = 'text-text-secondary', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-bg-border/50 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-bg-elevated/50 transition-colors"
      >
        {open ? <ChevronDown size={13} className="text-text-muted flex-shrink-0" />
               : <ChevronRight size={13} className="text-text-muted flex-shrink-0" />}
        <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 grid grid-cols-2 gap-x-6 gap-y-1.5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono = false, full = false, badge }) {
  if (value == null || value === '' || value === undefined) return null;
  return (
    <div className={full ? 'col-span-2' : ''}>
      <span className="text-xs text-text-muted">{label}</span>
      <div className={`mt-0.5 text-xs ${mono ? 'font-mono' : ''} text-text-primary break-all`}>
        {badge
          ? <span className={`inline-flex px-1.5 py-0.5 rounded ${getProtocolBadgeClass(value)}`}>{String(value)}</span>
          : String(value)
        }
      </div>
    </div>
  );
}

function TCPFlagsBadges({ flags }) {
  if (!flags) return null;
  const active = Object.entries(flags).filter(([, v]) => v).map(([k]) => k);
  if (!active.length) return <span className="text-text-muted text-xs">none</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {active.map(f => (
        <span key={f} className="px-1.5 py-0.5 rounded text-xs font-mono bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
          {f}
        </span>
      ))}
    </div>
  );
}

function HexView({ hexLines }) {
  if (!hexLines || !hexLines.length) return null;
  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Hex Dump</p>
      <div className="bg-bg-primary rounded-lg border border-bg-border p-3 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-text-muted mb-1">
              <td className="pr-4 select-none w-12">Offset</td>
              <td className="pr-4">Hex Bytes</td>
              <td>ASCII</td>
            </tr>
          </thead>
          <tbody>
            {hexLines.map((line, i) => (
              <tr key={i} className="hover:bg-bg-elevated/50 transition-colors">
                <td className="pr-4 text-text-muted select-none">{line.offset}</td>
                <td className="pr-4 text-accent-cyan">{line.hex}</td>
                <td className="text-text-secondary">{line.ascii}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PacketDetailModal({ fileId, packet, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!packet || !fileId) return;
    setLoading(true);
    setError(null);
    setDetail(null);

    getPacketDetail(fileId, packet.packetNumber)
      .then(data => setDetail(data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [fileId, packet?.packetNumber]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!packet) return null;

  const d = detail || packet;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Side Panel */}
      <aside
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-xl bg-bg-secondary border-l border-bg-border
                   z-50 flex flex-col shadow-2xl animate-slide-right overflow-hidden"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-card">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-text-primary">Packet #{packet.packetNumber}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProtocolBadgeClass(packet.protocol)}`}>
              {packet.protocol}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-text-secondary">
              <Loader2 size={18} className="animate-spin text-accent-cyan" />
              <span className="text-sm">Loading packet details…</span>
            </div>
          )}

          {error && (
            <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && (
            <>
              {/* Frame Summary */}
              <LayerSection title="Frame Summary" color="text-text-secondary">
                <Field label="Packet Number"  value={d.packetNumber} mono />
                <Field label="Timestamp"      value={d.timestamp} mono />
                <Field label="Original Length" value={d.packetLength != null ? `${d.packetLength} bytes` : null} mono />
                <Field label="Captured Length" value={d.capturedLength != null ? `${d.capturedLength} bytes` : null} mono />
                <Field label="Link Type"       value={d.linkType != null ? `${d.linkType}` : null} mono />
              </LayerSection>

              {/* Ethernet Layer */}
              {(d.srcMac || d.dstMac) && (
                <LayerSection title="Ethernet II" color="text-yellow-400">
                  <Field label="Source MAC"      value={d.srcMac} mono />
                  <Field label="Destination MAC" value={d.dstMac} mono />
                  <Field label="EtherType"        value={d.etherType} mono />
                </LayerSection>
              )}

              {/* ARP */}
              {d.protocol === 'ARP' && (
                <LayerSection title="ARP" color="text-yellow-400">
                  <Field label="Operation" value={d.arpOperation} />
                  <Field label="Sender IP" value={d.srcIP} mono />
                  <Field label="Target IP" value={d.dstIP} mono />
                </LayerSection>
              )}

              {/* IPv4 / IPv6 */}
              {(d.srcIP || d.ipVersion) && d.protocol !== 'ARP' && (
                <LayerSection title={`IPv${d.ipVersion || 4} Header`} color="text-blue-400">
                  <Field label="Source IP"      value={d.srcIP} mono />
                  <Field label="Destination IP" value={d.dstIP} mono />
                  <Field label="TTL / Hop Limit" value={d.ttl} mono />
                  <Field label="Protocol"        value={d.ipProtocol != null ? `${d.ipProtocol}` : null} mono />
                  <Field label="IP Version"      value={d.ipVersion} />
                </LayerSection>
              )}

              {/* TCP */}
              {(d.protocol === 'TCP' || d.protocol === 'HTTP' || d.protocol === 'HTTPS') && d.tcpFlags && (
                <LayerSection title="TCP Header" color="text-blue-400">
                  <Field label="Source Port"      value={d.srcPort} mono />
                  <Field label="Destination Port" value={d.dstPort} mono />
                  <Field label="Sequence Number"  value={d.tcpSeq} mono />
                  <Field label="Ack Number"       value={d.tcpAck} mono />
                  <Field label="Window Size"      value={d.tcpWindowSize} mono />
                  <Field label="Payload Size"     value={d.payloadSize != null ? `${d.payloadSize} bytes` : null} mono />
                  <div className="col-span-2">
                    <span className="text-xs text-text-muted">TCP Flags</span>
                    <div className="mt-1">
                      <TCPFlagsBadges flags={d.tcpFlags} />
                    </div>
                  </div>
                </LayerSection>
              )}

              {/* UDP */}
              {d.protocol === 'UDP' && (
                <LayerSection title="UDP Header" color="text-orange-400">
                  <Field label="Source Port"      value={d.srcPort} mono />
                  <Field label="Destination Port" value={d.dstPort} mono />
                  <Field label="UDP Length"       value={d.udpLength} mono />
                  <Field label="Payload Size"     value={d.payloadSize != null ? `${d.payloadSize} bytes` : null} mono />
                </LayerSection>
              )}

              {/* DNS */}
              {d.dns && (
                <LayerSection title="DNS" color="text-purple-400">
                  <Field label="Transaction ID" value={`0x${d.dns.id?.toString(16).padStart(4, '0')}`} mono />
                  <Field label="Type"           value={d.dns.isResponse ? 'Response' : 'Query'} />
                  <Field label="RCODE"          value={d.dns.rcodeText} />
                  <Field label="Questions"      value={d.dns.qdCount} />
                  <Field label="Answers"        value={d.dns.anCount} />

                  {d.dns.questions.map((q, i) => (
                    <div key={i} className="col-span-2 bg-bg-elevated rounded px-3 py-2 mt-1">
                      <div className="text-xs text-text-muted mb-1">Question {i + 1}</div>
                      <div className="text-xs font-mono text-purple-300">{q.name}</div>
                      <div className="text-xs text-text-secondary">Type: {q.type}</div>
                    </div>
                  ))}

                  {d.dns.answers.map((a, i) => (
                    <div key={i} className="col-span-2 bg-bg-elevated rounded px-3 py-2 mt-1">
                      <div className="text-xs text-text-muted mb-1">Answer {i + 1}</div>
                      <div className="text-xs font-mono text-purple-300">{a.name}</div>
                      <div className="text-xs text-text-secondary">Type: {a.type} | TTL: {a.ttl}s</div>
                      {a.rdata && <div className="text-xs font-mono text-accent-cyan mt-0.5">→ {a.rdata}</div>}
                    </div>
                  ))}
                </LayerSection>
              )}

              {/* HTTP */}
              {d.http && (
                <LayerSection title="HTTP" color="text-emerald-400">
                  {d.http.type === 'request' && <>
                    <Field label="Method"   value={d.httpMethod} />
                    <Field label="Path"     value={d.httpPath} mono />
                    <Field label="Host"     value={d.httpHost} mono />
                    <Field label="Version"  value={d.httpVersion} />
                  </>}
                  {d.http.type === 'response' && <>
                    <Field label="Status Code" value={`${d.httpStatusCode} ${d.httpStatusText || ''}`} />
                    <Field label="Version"     value={d.httpVersion} />
                  </>}
                  {d.http.headers && Object.entries(d.http.headers).slice(0, 8).map(([k, v]) => (
                    <Field key={k} label={k} value={v} mono />
                  ))}
                </LayerSection>
              )}

              {/* TLS */}
              {d.tls && (
                <LayerSection title="TLS / HTTPS" color="text-cyan-400">
                  <Field label="Record Type" value={d.tls.recordTypeName} />
                  <Field label="Version"     value={d.tls.version} />
                  {d.tls.handshakeTypeName && <Field label="Handshake" value={d.tls.handshakeTypeName} />}
                </LayerSection>
              )}

              {/* Hex View */}
              {detail?.hexView && detail.hexView.length > 0 && (
                <div className="border-t border-bg-border">
                  <HexView hexLines={detail.hexView} />
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
