'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetShell } from '../DashboardGrid';
import { useDeliveryStore } from '@/domains';
import { Send, CheckCircle, Clock, XCircle } from 'lucide-react';
import clsx from 'clsx';

/**
 * 最近交付 Widget
 * 
 * 展示最近的交付物及其审核状态
 * 
 * 设计规范 §12.1: 最近交付列表
 */
export function RecentDeliveriesWidget() {
  const { t } = useTranslation();

  const deliveries = useDeliveryStore((s) => s.deliveries);

  // 取最近 5 条交付，按时间倒序
  const recentDeliveries = React.useMemo(() => {
    return [...deliveries]
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [deliveries]);

  if (recentDeliveries.length === 0) return null;

  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-amber-500', label: t('deliveries.pending') },
    approved: { icon: CheckCircle, color: 'text-emerald-500', label: t('deliveries.approved') },
    rejected: { icon: XCircle, color: 'text-red-500', label: t('deliveries.rejected') },
    completed: { icon: CheckCircle, color: 'text-emerald-500', label: t('dashboard.completed') },
  };

  return (
    <WidgetShell title={t('deliveries.title')} icon={Send} colSpan={2}>
      <div className="space-y-1.5">
        {recentDeliveries.map((delivery) => {
          const config = statusConfig[delivery.status] || statusConfig.pending;
          const Icon = config.icon;
          return (
            <div
              key={delivery.id}
              className="flex items-center gap-2.5 p-2.5 rounded-lg transition-colors duration-150"
              style={{ background: 'var(--color-bg-hover)' }}
            >
              <Icon className={clsx('w-3.5 h-3.5 flex-shrink-0', config.color)} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {delivery.title || delivery.description || `#${delivery.id.slice(0, 8)}`}
                </div>
              </div>
              <span className={clsx('text-[10px] font-semibold flex-shrink-0', config.color)}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
