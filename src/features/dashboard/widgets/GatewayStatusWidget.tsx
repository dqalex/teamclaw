'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetShell } from '../DashboardGrid';
import { useGatewayStore } from '@/core/gateway/store';
import { useOpenClawStatusStore } from '@/domains';
import { RelativeTimeDisplay } from '@/shared/components/RelativeTimeDisplay';
import Link from 'next/link';
import clsx from 'clsx';
import {
  Wifi, WifiOff, RefreshCw, AlertCircle, Settings,
  Monitor, MessageSquare, Clock, Zap, Shield, Heart,
  Bot, Database, Radio, ChevronDown, CheckCircle, XCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { useState } from 'react';

/**
 * Gateway 状态卡片 Widget
 * 
 * 展示 OpenClaw Gateway 连接状态、核心指标（Uptime/Sessions/Cron/Channels）
 * AI 青色高亮，醒目展示系统核心状态
 * 
 * 设计规范 §12.1: Gateway 状态卡片使用 AI 青色高亮
 */
export function GatewayStatusWidget() {
  const { t } = useTranslation();
  const [showChannels, setShowChannels] = useState(false);

  // Gateway Store 订阅（精确 selector）
  const connected = useGatewayStore((s) => s.connected);
  const connectionMode = useGatewayStore((s) => s.connectionMode);
  const serverProxyConnected = useGatewayStore((s) => s.serverProxyConnected);
  const connectionStatus = useGatewayStore((s) => s.connectionStatus);
  const gwError = useGatewayStore((s) => s.error);
  const snapshot = useGatewayStore((s) => s.snapshot);
  const health = useGatewayStore((s) => s.health);
  const sessions = useGatewayStore((s) => s.sessions);
  const sessionsCount = useGatewayStore((s) => s.sessionsCount);
  const cronJobs = useGatewayStore((s) => s.cronJobs);
  const agentsList = useGatewayStore((s) => s.agentsList);
  const agentHealthList = useGatewayStore((s) => s.agentHealthList);
  const skills = useGatewayStore((s) => s.skills);
  const helloPayload = useGatewayStore((s) => s.helloPayload);
  const lastChannelsRefresh = useGatewayStore((s) => s.lastChannelsRefresh);
  const refreshSnapshot = useGatewayStore((s) => s.refreshSnapshot);
  const refreshHealth = useGatewayStore((s) => s.refreshHealth);

  const statusList = useOpenClawStatusStore((s) => s.statusList);
  const getByMemberId = useOpenClawStatusStore((s) => s.getByMemberId);

  const isGwConnected = connectionMode === 'server_proxy' ? serverProxyConnected : connected;

  const handleRefresh = () => {
    refreshSnapshot();
    refreshHealth();
  };

  const formatUptime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <WidgetShell
      colSpan={4}
      className={clsx(
        'relative overflow-hidden',
        isGwConnected
          ? 'bg-white dark:bg-[#181c24] dark:border-white/5'
          : 'bg-white dark:bg-[#1c2028]',
      )}
    >
      {/* 连接状态指示光晕 */}
      {isGwConnected && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-cyan-500/[0.03] dark:from-emerald-500/[0.05] dark:to-cyan-500/[0.05]" />
      )}

      <div className="relative">
        {/* 连接状态标题栏 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <div className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 shadow-inner',
              isGwConnected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400',
            )}>
              {isGwConnected ? (
                <Wifi className="w-5 h-5 animate-pulse" />
              ) : (
                <WifiOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                OpenClaw Gateway
              </h2>
              {isGwConnected ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-breathe" />
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t('dashboard.connected')}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('dashboard.disconnected')}
                </span>
              )}
            </div>
          </div>
          {isGwConnected && (
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-3.5 h-3.5" /> {t('dashboard.refresh')}
            </Button>
          )}
        </div>

        {/* 未连接提示 */}
        {!isGwConnected && (
          <div className="mt-3 p-3.5 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-hover)' }}>
            <div className="flex items-center gap-3">
              {connectionStatus?.startsWith('error_') ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                <Settings className="w-4 h-4 text-amber-500" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {connectionStatus === 'error_auth' ? 'Gateway 认证失败' :
                   connectionStatus === 'error_connection' ? 'Gateway 连接失败' :
                   t('dashboard.configureGateway')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {connectionStatus === 'error_auth' ? 'Token 无效或已过期，请在设置中检查 Gateway 配置' :
                   connectionStatus === 'error_connection' ? '无法连接到 Gateway，请检查地址是否正确或 Gateway 是否已启动' :
                   t('dashboard.configureGatewayDesc')}
                </p>
              </div>
              <Link href="/settings?tab=gateway" className="ml-auto">
                <Button size="sm">
                  <Settings className="w-3.5 h-3.5" /> {t('dashboard.goToSettings')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {gwError && <p className="text-xs text-red-500 mt-2 font-medium">{gwError}</p>}

        {/* 已连接 — 核心指标 */}
        {isGwConnected && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <MetricItem icon={Wifi} label={t('dashboard.status')} value="OK" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
              <MetricItem icon={Activity} label={t('dashboard.uptime')} value={snapshot?.uptimeMs ? formatUptime(snapshot.uptimeMs) : '--'} />
              <MetricItem icon={Zap} label="Tick Interval" value={(helloPayload?.policy?.tickIntervalMs ?? snapshot?.policy?.tickIntervalMs) ? `${helloPayload?.policy?.tickIntervalMs ?? snapshot?.policy?.tickIntervalMs}ms` : '--'} bg="bg-indigo-50 dark:bg-indigo-500/10" iconColor="text-indigo-500" />
              <MetricItem icon={RefreshCw} label={t('dashboard.channelRefresh')} value={<RelativeTimeDisplay timestamp={lastChannelsRefresh} />} bg="bg-amber-50 dark:bg-amber-500/10" iconColor="text-amber-500" />
            </div>

            {/* Instances / Sessions / Cron */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <MiniStatCard icon={Monitor} label="Instances" value={snapshot?.presence?.length ?? 0} sub={t('dashboard.onlineInstances')} />
              <MiniStatCard icon={MessageSquare} label="Sessions" value={sessionsCount || sessions.length} sub={t('dashboard.activeSessions')} />
              <MiniStatCard icon={Clock} label="Cron" value={
                cronJobs.length > 0
                  ? (cronJobs.some(j => j.enabled) ? t('dashboard.enabled') : t('dashboard.disabled'))
                  : '--'
              } sub={(() => {
                const enabledJobs = cronJobs.filter(j => j.enabled);
                if (enabledJobs.length === 0) return t('dashboard.tasks', { count: cronJobs.length });
                const nextJob = enabledJobs
                  .filter(j => j.state?.nextRunAtMs)
                  .sort((a, b) => (a.state?.nextRunAtMs ?? 0) - (b.state?.nextRunAtMs ?? 0))[0];
                if (nextJob?.state?.nextRunAtMs) {
                  return <RelativeTimeDisplay timestamp={nextJob.state.nextRunAtMs} />;
                }
                return t('dashboard.enabledOfTotal', { enabled: enabledJobs.length, total: cronJobs.length });
              })()} />
            </div>

            {/* 补充信息 */}
            <div className="grid grid-cols-4 gap-3 mt-3">
              <MiniInfoRow icon={Shield} label={t('dashboard.authMode')} value={snapshot?.authMode || 'none'} iconColor="text-indigo-500" />
              {health && <MiniInfoRow icon={Heart} label={t('dashboard.heartbeatInterval')} value={`${health.heartbeatSeconds}s`} iconColor="text-pink-500" />}
              <MiniInfoRow icon={Bot} label="Agents" value={String(agentsList.length)} iconColor="text-indigo-500" />
              <MiniInfoRow icon={Database} label="Skills" value={String(skills.length)} iconColor="text-violet-500" />
            </div>

            {/* 频道状态 */}
            {health && health.channels && Object.keys(health.channels).length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowChannels(!showChannels)}
                  className="flex items-center gap-2 text-xs font-semibold mb-2.5 transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <Radio className="w-3.5 h-3.5" />
                  {t('dashboard.channelStatus')} ({Object.keys(health.channels).length})
                  <ChevronDown className={clsx('w-3 h-3 transition-transform duration-200', showChannels && 'rotate-180')} />
                </button>
                {showChannels && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 animate-fadeIn">
                    {(health.channelOrder || Object.keys(health.channels)).map(name => {
                      const ch = health.channels[name];
                      if (!ch) return null;
                      const label = health.channelLabels?.[name] || name;
                      const isOk = ch.configured && ch.linked;
                      return (
                        <div key={name} className="rounded-lg p-2.5 border flex items-center gap-2 transition-all duration-200" style={{ borderColor: 'var(--color-border)' }}>
                          {isOk ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> :
                            ch.configured ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> :
                            <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
                            <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              {ch.configured ? (ch.linked ? t('dashboard.configuredLinked') : t('dashboard.configuredNotLinked')) : t('dashboard.notConfigured')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Agent 健康状态 */}
            {agentHealthList.length > 0 && (
              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="text-xs font-bold mb-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('dashboard.agentStatus')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {agentHealthList.map(agent => (
                    <div key={agent.agentId} className="rounded-lg p-3 border flex items-center gap-2.5 transition-all duration-200" style={{ borderColor: 'var(--color-border)' }}>
                      <div className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        agent.isDefault ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-slate-50 dark:bg-white/5',
                      )}>
                        <Bot className="w-4 h-4" style={{ color: agent.isDefault ? 'var(--color-brand)' : 'var(--color-text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {agent.name || agent.agentId}
                          </span>
                          {agent.isDefault && <span className="text-[9px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.5 rounded">{t('dashboard.defaultLabel')}</span>}
                        </div>
                        <div className="text-[10px] flex items-center gap-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          <span>{agent.sessions.count} {t('dashboard.sessions')}</span>
                          <span>{t('dashboard.heartbeat')} {agent.heartbeat.enabled ? agent.heartbeat.every : t('dashboard.off')}</span>
                          {agent.heartbeat.model && <span>{agent.heartbeat.model}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetShell>
  );
}

/* --- 内部辅助组件 --- */

function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}

function MetricItem({
  icon: Icon, label, value, color, bg, iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  color?: string;
  bg?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', bg || 'bg-violet-50 dark:bg-violet-500/10')}>
        <Icon className={clsx('w-3.5 h-3.5', iconColor || color || 'text-violet-500')} />
      </div>
      <div>
        <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
        <div className={clsx('text-xs font-bold tabular-nums', color || '')} style={!color ? { color: 'var(--color-text-primary)' } : {}}>
          {value}
        </div>
      </div>
    </div>
  );
}

function MiniStatCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <div className="rounded-lg p-3.5 border transition-all duration-200 hover:shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-hover)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      <div className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
    </div>
  );
}

function MiniInfoRow({
  icon: Icon, label, value, iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <div className="rounded-lg p-2.5 border flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
      <Icon className={clsx('w-3.5 h-3.5 flex-shrink-0', iconColor || 'text-indigo-500')} />
      <div className="min-w-0">
        <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
        <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
