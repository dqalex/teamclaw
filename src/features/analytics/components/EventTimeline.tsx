'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  Zap, FileText, User, MessageSquare, CheckCircle,
  Clock, AlertTriangle
} from 'lucide-react';
import { Spinner } from '@/src/shared/ui/spinner';

export interface EventLogItem {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId?: string;
  tokenCount?: number;
  createdAt: string;
}

interface EventTimelineProps {
  events: EventLogItem[];
  loading?: boolean;
}

// 事件类型 → 图标映射
function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'task_created':
    case 'task_completed':
      return <CheckCircle className="w-3.5 h-3.5" />;
    case 'task_status_changed':
      return <Clock className="w-3.5 h-3.5" />;
    case 'document_created':
    case 'document_updated':
      return <FileText className="w-3.5 h-3.5" />;
    case 'member_joined':
      return <User className="w-3.5 h-3.5" />;
    case 'chat_message':
      return <MessageSquare className="w-3.5 h-3.5" />;
    case 'token_threshold':
      return <AlertTriangle className="w-3.5 h-3.5" />;
    default:
      return <Zap className="w-3.5 h-3.5" />;
  }
}

function getEventColor(eventType: string): string {
  if (eventType.includes('token') || eventType.includes('threshold')) return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
  if (eventType.includes('task_completed')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
  if (eventType.includes('created')) return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
  if (eventType.includes('updated') || eventType.includes('changed')) return 'text-violet-500 bg-violet-50 dark:bg-violet-500/10';
  return 'text-slate-500 bg-slate-100 dark:bg-white/10';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function formatTokenCount(count?: number): string | null {
  if (count == null) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M tokens`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K tokens`;
  return `${count} tokens`;
}

// 按日期分组
function groupByDate(events: EventLogItem[]): { date: string; items: EventLogItem[] }[] {
  const groups: Record<string, EventLogItem[]> = {};
  for (const evt of events) {
    const dateKey = new Date(evt.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(evt);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

export default function EventTimeline({ events, loading }: EventTimelineProps) {
  const { t } = useTranslation();

  const groupedEvents = useMemo(() => groupByDate(events), [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {t('analytics.noEvents')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map(({ date, items }) => (
        <div key={date}>
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>
            {date}
          </div>
          <div className="relative pl-6 space-y-1">
            {/* 时间线竖线 */}
            <div
              className="absolute left-[7px] top-2 bottom-2 w-px"
              style={{ background: 'var(--border)' }}
            />
            {items.map((evt) => {
              const colorClasses = getEventColor(evt.eventType);
              const tokenLabel = formatTokenCount(evt.tokenCount);
              return (
                <div key={evt.id} className="relative flex items-start gap-3 py-2 group">
                  {/* 圆点 */}
                  <div className={clsx('absolute -left-6 top-2.5 w-3.5 h-3.5 rounded-full flex items-center justify-center', colorClasses)}>
                    {getEventIcon(evt.eventType)}
                  </div>
                  {/* 内容 */}
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {evt.eventType.replace(/_/g, ' ')}
                      </span>
                      {evt.entityType && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}>
                          {evt.entityType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tokenLabel && (
                        <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">
                          {tokenLabel}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {formatTime(evt.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
