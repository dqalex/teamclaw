'use client';

import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, trendValue }: StatCardProps) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-hover)' }}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
        {trend && trendValue && (
          <span className={clsx(
            'flex items-center gap-0.5 text-xs font-medium mb-0.5',
            trend === 'up' && 'text-emerald-500',
            trend === 'down' && 'text-red-500',
            trend === 'neutral' && 'text-slate-400 dark:text-slate-500',
          )}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</span>
      )}
    </div>
  );
}
