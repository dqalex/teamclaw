'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * Dashboard Widget 配置接口
 * 定义每个 Widget 的布局和元数据
 */
export interface WidgetConfig {
  id: string;
  title?: string;
  /** CSS Grid 列跨度 */
  colSpan?: 1 | 2 | 3 | 4;
  /** CSS Grid 行跨度 */
  rowSpan?: 1 | 2;
  /** 是否可见（可由用户偏好控制） */
  visible?: boolean;
  /** 加载顺序优先级（越小越先渲染） */
  priority?: number;
}

/**
 * Dashboard 网格布局容器
 * 
 * 设计规范：8px 网格系统，CSS Grid 自适应布局
 * - 默认 4 列（lg），2 列（md），1 列（sm）
 * - Widget 间距 24px（var(--space-6)）
 */
export function DashboardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Widget 容器 — 统一的卡片外壳
 * 
 * 提供一致的视觉样式：
 * - 半透明背景 + 毛玻璃（暗色模式）
 * - 悬停阴影提升
 * - 过渡动画 200ms ease-out
 */
export function WidgetShell({
  title,
  icon: Icon,
  action,
  colSpan = 1,
  rowSpan = 1,
  className,
  children,
}: {
  title?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  className?: string;
  children: React.ReactNode;
}) {
  const colClass: Record<number, string> = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-2 lg:col-span-4',
  };

  return (
    <div
      className={clsx(
        colClass[colSpan],
        'rounded-xl border transition-all duration-200',
        'p-5',
        'bg-white dark:bg-[#1c2028]',
        'border-[#e8ebf2] dark:border-white/5',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[var(--brand)]" />
              </div>
            )}
            {title && (
              <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
