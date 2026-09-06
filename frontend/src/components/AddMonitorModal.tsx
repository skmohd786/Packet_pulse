import React, { useState } from 'react';
import { X, Globe, Clock, Tag } from 'lucide-react';

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (domain: string, name: string, interval: number) => Promise<void>;
}

export const AddMonitorModal: React.FC<AddMonitorModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [interval, setInterval] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      setError('Please enter a domain or URL.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onAdd(domain.trim(), name.trim(), interval);
      setDomain('');
      setName('');
      setInterval(5);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-5 shadow-2xl relative font-mono">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-zinc-800">
          <Globe className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Add Monitored Target</h3>
            <p className="text-[11px] text-zinc-500">Configure real HTTP check parameters</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">
              Domain or Target URL *
            </label>
            <input
              type="text"
              placeholder="e.g. example.com or api.github.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">
              Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Core Service API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">
              Check Interval (Seconds)
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value={3}>3 Seconds</option>
              <option value={5}>5 Seconds (Default)</option>
              <option value={10}>10 Seconds</option>
              <option value={30}>30 Seconds</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded font-bold transition disabled:opacity-50"
            >
              {loading ? 'Initiating...' : 'Start Monitoring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
