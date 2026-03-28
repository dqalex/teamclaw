'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import clsx from 'clsx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// 页面路径到面包屑标签的映射
const PATH_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  wiki: 'Wiki',
  projects: 'Projects',
  members: 'Members',
  schedule: 'Scheduler',
  skills: 'Skills',
  sop: 'SOP',
  skillhub: 'SkillHub',
  deliveries: 'Deliveries',
  approvals: 'Approvals',
  agents: 'Agents',
  sessions: 'Sessions',
  settings: 'Settings',
  marketplace: 'Marketplace',
  workflows: 'Workflows',
  triggers: 'Triggers',
  analytics: 'Analytics',
  consumer: 'Consumer',
  login: 'Login',
  register: 'Register',
  profile: 'Profile',
};

/**
 * Breadcrumb 组件 — 面包屑导航
 *
 * 支持两种模式：
 * 1. 传入 items prop 显式定义面包屑
 * 2. 不传 items 时自动从当前 pathname 生成面包屑
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  const autoItems = useAutoBreadcrumbItems(pathname);

  const displayItems = items ?? autoItems;

  if (displayItems.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link
            href="/dashboard"
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200',
              'hover:bg-slate-100 dark:hover:bg-white/5',
              'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            )}
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
        </li>
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;

          return (
            <li key={`${item.href}-${item.label}`} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              {isLast || !item.href ? (
                <span
                  className="px-2 py-1 text-[13px] font-medium truncate max-w-[180px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={clsx(
                    'px-2 py-1 text-[13px] rounded-lg transition-all duration-200 truncate max-w-[180px]',
                    'hover:bg-slate-100 dark:hover:bg-white/5',
                    'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * 从 pathname 自动生成面包屑项
 */
function useAutoBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  for (let i = 0; i < segments.length; i++) {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = PATH_LABELS[segments[i]] ?? decodeURIComponent(segments[i]);
    items.push({ label, href });
  }

  return items;
}

export default Breadcrumb;
