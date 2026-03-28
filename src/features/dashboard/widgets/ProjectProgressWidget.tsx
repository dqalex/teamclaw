'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetShell } from '../DashboardGrid';
import { useProjectStore, useTaskStore } from '@/domains';
import { FolderKanban } from 'lucide-react';

/**
 * 项目进度 Widget
 * 
 * 展示各项目的任务完成进度
 * 使用细长进度条，减少视觉重量
 * 
 * 设计规范 §12.1: 项目进度使用细长进度条
 */
export function ProjectProgressWidget() {
  const { t } = useTranslation();

  const projects = useProjectStore((s) => s.projects);
  const tasks = useTaskStore((s) => s.tasks);

  if (projects.length === 0) return null;

  return (
    <WidgetShell title={t('dashboard.projectOverview')} icon={FolderKanban} colSpan={2}>
      <div className="space-y-2.5">
        {projects.map((project) => {
          const projectTasks = tasks.filter(t => t.projectId === project.id);
          const completed = projectTasks.filter(t => t.status === 'completed').length;
          const total = projectTasks.length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return (
            <div key={project.id} className="py-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {project.name}
                </span>
                <span className="text-[11px] font-semibold tabular-nums ml-2" style={{ color: 'var(--color-text-muted)' }}>
                  {completed}/{total}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: pct === 100 ? 'var(--color-success)' : 'var(--color-brand)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
