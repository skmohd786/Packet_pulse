import React from 'react';
import { HealthStatus } from '../types';

interface StatusBadgeProps {
  status: HealthStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  let bgColor = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60';
  let dotColor = 'bg-emerald-500';
  let label = 'HEALTHY';

  if (status === 'WARNING') {
    bgColor = 'bg-amber-950/40 text-amber-400 border-amber-800/60';
    dotColor = 'bg-amber-500';
    label = 'WARNING';
  } else if (status === 'CRITICAL') {
    bgColor = 'bg-rose-950/40 text-rose-400 border-rose-800/60';
    dotColor = 'bg-rose-500';
    label = 'CRITICAL';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded border font-mono font-semibold tracking-wide uppercase ${bgColor} ${padding}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </div>
  );
};
