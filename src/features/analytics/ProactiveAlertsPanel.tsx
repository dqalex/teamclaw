'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  AlertTriangle, Info, XCircle, Bell, CheckCircle,
  ChevronRight, Filter, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/ui/card';
import { Badge } from '@/src/shared/ui/badge';
import { Spinner } from '@/src/shared/ui/spinner';

// Store 类型（由 Phase 4A 后端创建）
interface ProactiveEvent {
  id: string;
  ruleName: string;
  ruleType: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'triggered' | 'acted' | 'dismissed' | 'failed';
  message: string;
  context?: Record<string, unknown>;
  entityId?: string;
  entityType?: string;
  createdAt: string;
  actedAt?: string;
}

// 尝试从 store 导入
let useProactiveStore: () => {
  events: ProactiveEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: (params?: Record<string, unknown>) => Promise<void>;
  dismissEvent: (id: string) => Promise<void>;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/src/domains/proactive');
  useProactiveStore = mod.useProactiveStore;
} catch {
  useProactiveStore = () => ({
    events: [],
    loading: false,
    error: null,
    fetchEvents: async () => {},
    dismissEvent: async () => {},
  });
}

type SeverityFilter = 'all' | 'info' | 'warning' | 'critical';

// 严重性配置
const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    badge: 'info' as const,
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    badge: 'warning' as const,
  },
  critical: {
    icon: XCircle,
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    badge: 'danger' as const,
  },
} as const;

// 状态配置
const STATUS_CONFIG = {
  triggered: { label: 'triggered', badge: 'warning' as const },
  acted: { label: 'acted', badge: 'success' as const },
  dismissed: { label: 'dismissed', badge: 'default' as const },
  failed: { label: 'failed', badge: 'danger' as const },
} as const;

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

export default function ProactiveAlertsPanel() {
  const { t } = useTranslation();
  const { events, loading, error, fetchEvents, dismissEvent } = useProactiveStore();

  const [severityFilter, setSeverityFilter] = React.useState<SeverityFilter>('all');

  useEffect(() => {
    fetchEvents({ status: 'triggered', limit: 50 });
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    if (severityFilter === 'all') return events;
    return events.filter(e => e.severity === severityFilter);
  }, [events, severityFilter]);

  // 统计
  const counts = useMemo(() => ({
    all: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    warning: events.filter(e => e.severity === 'warning').length,
    info: events.filter(e => e.severity === 'info').length,
  }), [events]);

  const handleDismiss = useCallback(async (id: string) => {
    await dismissEvent(id);
  }, [dismissEvent]);

  const handleRefresh = useCallback(() => {
    fetchEvents({ status: 'triggered', limit: 50 });
  }, [fetchEvents]);

  // 加载态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  // 错误态
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 页面头部 */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
            {t('analytics.proactiveAlerts')}
          </h1>
          <Badge variant="warning">{counts.all}</Badge>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors hover:bg-white/50 dark:hover:bg-white/10"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('common.refresh')}
        </button>
      </div>

      {/* 严重性过滤 */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3">
        {(['all', 'critical', 'warning', 'info'] as SeverityFilter[]).map(sev => {
          const count = counts[sev];
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
                severityFilter === sev
                  ? 'bg-white dark:bg-slate-700/80 shadow-sm'
                  : 'hover:bg-white/50 dark:hover:bg-white/10',
              )}
              style={{ color: severityFilter === sev ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {sev === 'critical' && <XCircle className="w-3 h-3 text-red-500" />}
              {sev === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
              {sev === 'info' && <Info className="w-3 h-3 text-blue-500" />}
              {t(`analytics.${sev === 'all' ? 'allSeverities' : sev}`)}
              {count > 0 && (
                <span className="ml-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 预警列表 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('analytics.noAlerts')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map(evt => {
              const config = SEVERITY_CONFIG[evt.severity];
              const statusCfg = STATUS_CONFIG[evt.status];
              const Icon = config.icon;
              return (
                <div key={evt.id} className="card p-4 flex items-start gap-3">
                  <div className={clsx('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5', config.bg)}>
                    <Icon className={clsx('w-4 h-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {evt.ruleName}
                      </span>
                      <Badge variant={config.badge}>{evt.severity}</Badge>
                      <Badge variant={statusCfg.badge}>{t(`analytics.${statusCfg.label}`)}</Badge>
                    </div>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {evt.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {formatTime(evt.createdAt)}
                      </span>
                      {evt.status === 'triggered' && (
                        <button
                          onClick={() => handleDismiss(evt.id)}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {t('analytics.dismiss')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
