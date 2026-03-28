'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetShell } from '../DashboardGrid';
import { useMemberStore, useOpenClawStatusStore } from '@/domains';
import clsx from 'clsx';
import { Bot } from 'lucide-react';

/**
 * AI 团队状态 Widget
 * 
 * 展示 AI 成员工作状态（运行中/空闲）
 * 使用机器人图标 + 状态点指示
 * 
 * 设计规范 §12.1: AI 团队状态使用机器人图标 + 状态点
 */
export function AITeamWidget() {
  const { t } = useTranslation();

  const members = useMemberStore((s) => s.members);
  const getAIMembers = useMemberStore((s) => s.getAIMembers);
  const statusList = useOpenClawStatusStore((s) => s.statusList);
  const getByMemberId = useOpenClawStatusStore((s) => s.getByMemberId);

  const aiMembers = React.useMemo(() => getAIMembers(), [getAIMembers, members]);

  if (aiMembers.length === 0) return null;

  return (
    <WidgetShell title={t('dashboard.aiMemberStatus')} icon={Bot} colSpan={2}>
      <div className="space-y-2">
        {aiMembers.map((member) => {
          const status = getByMemberId(member.id);
          const isWorking = status?.status === 'working';
          return (
            <div
              key={member.id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                isWorking && 'bg-cyan-500/5 dark:bg-cyan-500/[0.03]',
              )}
            >
              <div className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300',
                isWorking
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5',
              )}>
                <Bot className={clsx('w-4 h-4', isWorking ? 'text-white' : 'text-slate-400')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {member.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={clsx(
                    'w-1.5 h-1.5 rounded-full transition-all',
                    isWorking ? 'bg-cyan-400 animate-breathe' : 'bg-slate-300 dark:bg-slate-600',
                  )} />
                  <span className="text-[11px] font-medium" style={{ color: isWorking ? 'var(--color-ai)' : 'var(--color-text-muted)' }}>
                    {isWorking ? t('dashboard.working') : t('dashboard.idle')}
                  </span>
                </div>
              </div>
              {status?.currentTaskId && (
                <div className="text-[10px] truncate font-mono px-2 py-1 rounded-md max-w-[120px]" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-hover)' }}>
                  {status.currentTaskId.slice(0, 8)}...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
