import { Link, useNavigate } from 'react-router-dom';
import { Activity, Upload, ChevronRight, Radio } from 'lucide-react';

export default function Header({ fileId, filename, packetCount }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-bg-border bg-bg-secondary/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent-gradient flex items-center justify-center shadow-glow-cyan">
            <Activity size={16} className="text-bg-primary" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-text-primary tracking-tight">Packet</span>
            <span className="text-base font-bold text-accent-cyan tracking-tight">Pulse</span>
          </div>
          <span className="hidden sm:block text-xs text-text-muted font-mono bg-bg-elevated border border-bg-border px-2 py-0.5 rounded">
            v1.0
          </span>
        </Link>

        {/* Active capture badge */}
        {fileId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-bg-border rounded-lg flex-1 max-w-md overflow-hidden">
            <Radio size={12} className="text-accent-green flex-shrink-0 animate-pulse" />
            <span className="text-xs text-text-secondary font-mono truncate">
              {filename || fileId}
            </span>
            {packetCount !== undefined && (
              <>
                <ChevronRight size={12} className="text-text-muted flex-shrink-0" />
                <span className="text-xs text-accent-cyan font-mono flex-shrink-0">
                  {packetCount.toLocaleString()} pkts
                </span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary text-sm py-1.5 px-3"
            title="Upload new capture"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">New Capture</span>
          </button>
        </div>
      </div>
    </header>
  );
}
