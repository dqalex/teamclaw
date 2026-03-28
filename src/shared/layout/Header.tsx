'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUIStore, useProjectStore } from '@/domains';
import UserMenu from '@/shared/layout/UserMenu';
import GlobalSearch from '@/shared/layout/GlobalSearch';
import { Breadcrumb, type BreadcrumbItem } from '@/shared/ui/breadcrumb';
import { NotificationCenter } from '@/shared/ui/notification-center';
import { subNavConfigs } from './nav-config';
import clsx from 'clsx';

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
  showProjectSelector?: boolean;
  breadcrumb?: BreadcrumbItem[];
  showBreadcrumb?: boolean;
}

/**
 * 判断子导航项是否激活，支持 query 参数匹配
 */
function isSubNavActive(pathname: string, searchParams: URLSearchParams, href: string): boolean {
  // 不含 query 的纯路径匹配
  if (href === pathname) return true;
  if (pathname.startsWith(href + '/')) return true;

  // 带 query 的匹配（如 /sop?tab=render）
  const hashIdx = href.indexOf('?');
  if (hashIdx !== -1) {
    const basePath = href.slice(0, hashIdx);
    const params = new URLSearchParams(href.slice(hashIdx));
    if (pathname !== basePath && !pathname.startsWith(basePath + '/')) return false;
    for (const [key, val] of params) {
      if (searchParams.get(key) !== val) return false;
    }
    return true;
  }

  return false;
}

export default function Header({ title, actions, breadcrumb, showBreadcrumb = true }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const activeNavSection = useUIStore((s) => s.activeNavSection);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  // 工作区内进入 /tasks、/wiki 时清除项目筛选，展示全部
  const handleSubNavClick = useCallback((href: string) => {
    if (href === '/tasks' || href === '/wiki') {
      setCurrentProject(null);
    }
  }, [setCurrentProject]);

  // 当前 section 对应的子导航
  const currentSubNav = subNavConfigs.find(c => c.section === activeNavSection)?.items ?? [];

  return (
    <header className="h-14 px-6 border-b sticky top-0 z-[5] backdrop-blur-xl flex items-center justify-between" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
      {/* 左侧：子导航 tab（设计稿风格，与面包屑/标题同级） */}
      <div className="flex items-center gap-4 min-w-0 flex-shrink-0 h-full">
        {/* 子导航 tab — 始终显示在有子导航的 section */}
        {currentSubNav.length > 0 ? (
          <nav className="flex items-center h-full gap-1">
            {currentSubNav.map((sub) => {
              const isActive = isSubNavActive(pathname, searchParams, sub.href);
              return (
                <Link
                  key={sub.id}
                  href={sub.href}
                  onClick={() => handleSubNavClick(sub.href)}
                  className={clsx(
                    'h-full px-4 flex items-center text-[13px] font-medium transition-colors border-b-2 -mb-[1px]',
                    isActive
                      ? 'text-[var(--brand)] border-[var(--brand)]'
                      : 'border-transparent hover:text-[var(--text-primary)]'
                  )}
                  style={!isActive ? { color: 'var(--text-tertiary)' } : undefined}
                >
                  {t(sub.labelKey, sub.defaultLabel)}
                </Link>
              );
            })}
          </nav>
        ) : (
          /* 无子导航时显示面包屑或标题 */
          <>
            {showBreadcrumb && !title && <Breadcrumb items={breadcrumb} />}
            {title && (
              <h1 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h1>
            )}
          </>
        )}
      </div>

      {/* 右侧：搜索 → actions → 通知 → 用户菜单 */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="hidden md:block">
          <GlobalSearch />
        </div>

        {actions && <div className="flex items-center">{actions}</div>}

        <NotificationCenter />

        <UserMenu />
      </div>
    </header>
  );
}
