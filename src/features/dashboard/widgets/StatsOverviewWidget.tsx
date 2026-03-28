'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetShell } from '../DashboardGrid';
import { useTaskStore, useDeliveryStore, useMemberStore, useOpenClawStatusStore } from '@/domains';
import clsx from 'clsx';
import { CheckSquare, AlertCircle, Send, Bot } from 'lucide-react';

/**
 * 今日概览统计 Widget
 * 
 * 展示核心业务指标：进行中任务、待审核交付、待交付、工作 AI 数
 * 数字使用 Tabular Nums 字体保证对齐
 * 
 * 设计规范 §12.1: 数字统计卡片使用 Tabular Nums 字体
 */
export function StatsOverviewWidget() {
  const { t } = useTranslation();

  // Store 精确 selector 订阅
  const tasks = useTaskStore((s) => s.tasks);
  const deliveries = useDeliveryStore((s) => s.deliveries);
  const members = useMemberStore((s) => s.members);
  const getAIMembers = useMemberStore((s) => s.getAIMembers);
  const statusList = useOpenClawStatusStore((s) => s.statusList);
  const getByMemberId = useOpenClawStatusStore((s) => s.getByMemberId);

  const aiMembers = React.useMemo(() => getAIMembers(), [getAIMembers, members]);
  const stats = React.useMemo(() => {
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const reviewing = tasks.filter(t => t.status === 'reviewing').length;
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length;
    const workingAI = aiMembers.filter(m => {
      const s = getByMemberId(m.id);
      return s?.status === 'working';
    }).length;
    return { inProgress, reviewing, pendingDeliveries, workingAI };
  }, [tasks, deliveries, aiMembers, statusList, getByMemberId]);

  const items = [
    {
      label: t('tasks.inProgress'),
      value: stats.inProgress,
      icon: CheckSquare,
      accentColor: 'text-[#c0c1ff] dark:text-[#c0c1ff]',
      accentBg: 'bg-indigo-50 dark:bg-[#c0c1ff]/10',
      borderColor: 'border-indigo-200 dark:border-[#c0c1ff]/20',
    },
    {
      label: t('tasks.reviewing'),
      value: stats.reviewing,
      icon: AlertCircle,
      accentColor: 'text-amber-500 dark:text-[#f59e0b]',
      accentBg: 'bg-amber-50 dark:bg-[#f59e0b]/10',
      borderColor: 'border-amber-200 dark:border-[#f59e0b]/20',
    },
    {
      label: t('deliveries.pending'),
      value: stats.pendingDeliveries,
      icon: Send,
      accentColor: 'text-violet-500 dark:text-[#d0bcff]',
      accentBg: 'bg-violet-50 dark:bg-[#d0bcff]/10',
      borderColor: 'border-violet-200 dark:border-[#d0bcff]/20',
    },
    {
      label: t('members.working'),
      value: stats.workingAI,
      icon: Bot,
      accentColor: 'text-cyan-500 dark:text-[#4cd7f6]',
      accentBg: 'bg-cyan-50 dark:bg-[#4cd7f6]/10',
      borderColor: 'border-cyan-200 dark:border-[#4cd7f6]/20',
    },
  ];

  return (
    <WidgetShell colSpan={4} className="border-none p-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-1">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={clsx(
                'rounded-xl p-5 transition-all duration-200',
                'bg-white dark:bg-[#1c2028]',
                'border', item.borderColor,
                'hover:shadow-md animate-fadeIn',
              )}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  {item.label}
                </span>
                <span className={clsx(item.accentBg, 'flex h-5 w-5 rounded-md items-center justify-center')}>
                  <Icon className={clsx('w-3 h-3', item.accentColor)} />
                </span>
              </div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
