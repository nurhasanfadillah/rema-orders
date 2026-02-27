import React from 'react';
import { OrderStatus } from '../types';
import { getStatusLabel } from '../utils';

interface Props {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const getStyles = (s: OrderStatus) => {
    switch (s) {
      case OrderStatus.PROCESSING:
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]';
      case OrderStatus.PRINTING:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
      case OrderStatus.PACKING:
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]';
      case OrderStatus.SHIPPED:
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getDotColor = (s: OrderStatus) => {
    switch (s) {
      case OrderStatus.PROCESSING: return 'bg-blue-500';
      case OrderStatus.PRINTING: return 'bg-amber-500';
      case OrderStatus.PACKING: return 'bg-purple-500';
      case OrderStatus.SHIPPED: return 'bg-emerald-500';
      default: return 'bg-zinc-500';
    }
  };

  const sizeClass = size === 'sm' ? 'text-[10px] px-2.5 py-1' : 'text-xs px-3 py-1.5';
  
  return (
    <span className={`inline-flex items-center font-bold tracking-wide rounded-full border ${getStyles(status)} ${sizeClass} transition-all duration-300`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getDotColor(status)} animate-pulse shadow-sm`}></span>
      {getStatusLabel(status)}
    </span>
  );
};