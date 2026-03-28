'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetShell } from '../DashboardGrid';
import { useProjectStore, useTaskStore, useMemberStore, useDocumentStore, useDeliveryStore, useGatewayStore } from '@/domains';
import Link from 'next/link';
import clsx from 'clsx';
import {
  CheckSquare, FileText, Users, Send, FolderKanban, Bot, Clock,
  ArrowUpRight,
} from 'lucide-react';

/**
 * 快捷入口 Widget
 * 
 * 设计规范 §12.1: 快捷入口提供 [+ 新建任务] [📋 查看任务] 等快速导航
 * 卡片悬停: shadow + translateY(-2px) 200ms ease-out
 */
export function QuickActionsWidget() {
  const { t } = useTranslation();

  const projects = useProjectStore((s) => s.projects);
  const tasks = useTaskStore((s) => s.tasks);
  const members = useMemberStore((s) => s.members);
  const documents = useDocumentStore((s) => s.documents);
  const deliveries = useDeliveryStore((s) => s.deliveries);
  const agentsList = useGatewayStore((s) => s.agentsList);
  const cronJobs = useGatewayStore((s) => s.cronJobs);

  const links = [
    { href: '/tasks', label: t('tasks.title'), icon: CheckSquare, desc: `${tasks.length} ${t('projects.tasks')}`, color: 'from-indigo-500 to-blue-500' },
    { href: '/wiki', label: t('wiki.title'), icon: FileText, desc: `${documents.length} ${t('projects.docs')}`, color: 'from-emerald-500 to-teal-500' },
    { href: '/members', label: t('members.title'), icon: Users, desc: `${members.length} ${t('nav.members')}`, color: 'from-violet-500 to-purple-500' },
    { href: '/deliveries', label: t('deliveries.title'), icon: Send, desc: `${deliveries.filter(d => d.status === 'pending').length} ${t('deliveries.pending')}`, color: 'from-amber-500 to-orange-500' },
    { href: '/projects', label: t('projects.title'), icon: FolderKanban, desc: `${projects.length} ${t('nav.projects')}`, color: 'from-pink-500 to-rose-500' },
    { href: '/agents', label: t('agents.title'), icon: Bot, desc: `${agentsList.length} Agent`, color: 'from-cyan-500 to-blue-500' },
    { href: '/schedule', label: t('scheduler.title'), icon: Clock, desc: `${cronJobs.length} ${t('scheduler.jobs')}`, color: 'from-slate-500 to-gray-600' },
  ];

  return (
    <WidgetShell colSpan={4} title={t('dashboard.quickAccess')} className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 -mt-2">
        {links.map((link, i) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3.5 p-3.5 rounded-lg transition-all duration-200 hover:shadow-md animate-fadeIn"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-hover)',
                animationDelay: `${i * 50}ms`,
              }}
            >
              <div className={clsx(
                'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110',
                link.color,
              )}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{link.label}</div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{link.desc}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ color: 'var(--color-text-muted)' }} />
            </Link>
          );
        })}
      </div>
    </WidgetShell>
  );
}
