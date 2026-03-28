'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  BarChart3, Activity, TrendingUp, Clock, Zap,
  ChevronRight, Calendar, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/shared/ui/tabs';
import { Badge } from '@/src/shared/ui/badge';
import { Progress } from '@/src/shared/ui/progress';
import { Spinner } from '@/src/shared/ui/spinner';
import StatCard from './components/StatCard';
import AgentRankTable, { type AgentStat } from './components/AgentRankTable';
import EventTimeline, { type EventLogItem } from './components/EventTimeline';

// Store 类型（由 Phase 4A 后端创建，此处定义本地 fallback）
interface AnalyticsData {
  totalTokens: number;
  estimatedCost: number;
  taskCount: number;
  completedTasks: number;
  agentStats: AgentStat[];
  tokenByDay: { date: string; tokens: number }[];
}

interface ProactiveEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId?: string;
  tokenCount?: number;
  createdAt: string;
}

// 尝试从 store 导入，如果不存在则用空对象占位
let useProactiveStore: () => {
  analytics: AnalyticsData | null;
  eventLogs: EventLogItem[];
  loading: boolean;
  error: string | null;
  fetchAnalytics: (params?: Record<string, unknown>) => Promise<void>;
  fetchEventLogs: (params?: Record<string, unknown>) => Promise<void>;
  projects: { id: string; name: string }[];
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/src/domains/proactive');
  useProactiveStore = mod.useProactiveStore;
} catch {
  useProactiveStore = () => ({
    analytics: null,
    eventLogs: [],
    loading: false,
    error: null,
    fetchAnalytics: async () => {},
    fetchEventLogs: async () => {},
    projects: [],
  });
}

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { analytics, eventLogs, loading, error, fetchAnalytics, fetchEventLogs, projects } = useProactiveStore();

  const [period, setPeriod] = React.useState<Period>('week');
  const [selectedProject, setSelectedProject] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<string>('overview');

  // 数据加载
  useEffect(() => {
    fetchAnalytics({ period, projectId: selectedProject || undefined });
    fetchEventLogs({ limit: 50 });
  }, [period, selectedProject, fetchAnalytics, fetchEventLogs]);

  // 周期选项
  const periodOptions: { value: Period; label: string; icon: React.ReactNode }[] = useMemo(() => [
    { value: 'today', label: t('analytics.today'), icon: <Clock className="w-3.5 h-3.5" /> },
    { value: 'week', label: t('analytics.week'), icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'month', label: t('analytics.month'), icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'quarter', label: t('analytics.quarter'), icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'year', label: t('analytics.year'), icon: <Calendar className="w-3.5 h-3.5" /> },
  ], [t]);

  // 完成率
  const completionRate = useMemo(() => {
    if (!analytics || analytics.taskCount === 0) return 0;
    return Math.round((analytics.completedTasks / analytics.taskCount) * 100);
  }, [analytics]);

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
          <BarChart3 className="w-5 h-5" style={{ color: 'var(--brand)' }} />
          <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
            {t('analytics.title')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* 周期选择器 */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
            {periodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  period === opt.value
                    ? 'bg-white dark:bg-slate-700/80 shadow-sm'
                    : 'hover:bg-white/50 dark:hover:bg-white/10',
                )}
                style={{ color: period === opt.value ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* 项目筛选器 */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
              <Filter className="w-3.5 h-3.5" />
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="bg-transparent border-none outline-none text-xs cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <option value="">{t('projects.allProjects')}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="shrink-0 px-6 pt-4">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
            <TabsTrigger value="agents">{t('analytics.agents')}</TabsTrigger>
            <TabsTrigger value="timeline">{t('analytics.timeline')}</TabsTrigger>
          </TabsList>

          {/* 总览 Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={t('analytics.totalTokens')}
                value={analytics ? formatNumber(analytics.totalTokens) : '0'}
                icon={<Zap className="w-4 h-4" style={{ color: 'var(--brand)' }} />}
                subtitle={analytics ? `${analytics.tokenByDay.length} ${t('analytics.today').toLowerCase()} days` : undefined}
              />
              <StatCard
                title={t('analytics.totalCost')}
                value={analytics ? formatCost(analytics.estimatedCost) : '$0.00'}
                icon={<Activity className="w-4 h-4 text-emerald-500" />}
              />
              <StatCard
                title={t('analytics.taskCount')}
                value={analytics ? analytics.taskCount : 0}
                subtitle={analytics ? `${analytics.completedTasks} ${t('analytics.completedTasks').toLowerCase()}` : undefined}
                icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
              />
              <StatCard
                title={t('analytics.completionRate')}
                value={`${completionRate}%`}
                icon={<TrendingUp className="w-4 h-4 text-violet-500" />}
                trend={completionRate >= 70 ? 'up' : completionRate >= 40 ? 'neutral' : 'down'}
                trendValue={completionRate >= 70 ? '+5%' : completionRate >= 40 ? '0%' : '-3%'}
              />
            </div>

            {/* 完成率进度条 */}
            {analytics && analytics.taskCount > 0 && (
              <div className="mt-6 card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('analytics.completionRate')}
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>
                    {completionRate}%
                  </span>
                </div>
                <Progress value={completionRate} max={100} size="md" />
                <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{t('analytics.completedTasks')}: {analytics.completedTasks}</span>
                  <span>{t('analytics.taskCount')}: {analytics.taskCount}</span>
                </div>
              </div>
            )}

            {/* 最近事件预览 */}
            <div className="mt-6 card p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('analytics.recentEvents')}
                </span>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className="flex items-center gap-1 text-xs hover:underline"
                  style={{ color: 'var(--brand)' }}
                >
                  {t('common.more')}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <EventTimeline events={eventLogs.slice(0, 10)} />
            </div>
          </TabsContent>

          {/* Agent 效能 Tab */}
          <TabsContent value="agents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.agentEfficiency')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AgentRankTable agents={analytics?.agentStats ?? []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 时间线 Tab */}
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.eventLog')}</CardTitle>
              </CardHeader>
              <CardContent>
                <EventTimeline events={eventLogs} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
