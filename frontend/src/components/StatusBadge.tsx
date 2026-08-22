import React from 'react';
import { HealthStatus } from '../types';

interface StatusBadgeProps {
  status: HealthStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let bgColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let dotColor = 'bg-emerald-500';
  let label = 'HEALTHY';

  if (status === 'WARNING') {
    bgColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotColor = 'bg-amber-500';
    label = 'WARNING';
  } else if (status === 'CRITICAL') {
    bgColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    dotColor = 'bg-rose-500';
    label = 'CRITICAL';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-bold',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${bgColor} ${sizeClasses[size]}`}>
      <span className={`relative flex h-2 w-2`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
      </span>
      <span>{label}</span>
    </div>
  );
};
