'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/domains';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthGuard from './AuthGuard';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { inferNavFromPath } from './nav-config';

// 动态导入设置向导，避免 SSR 问题
const SetupWizardGuard = dynamic(
  () => import('@/features/setup-wizard/SetupWizardGuard'),
  { ssr: false }
);

// 动态导入 CommandBar，避免 SSR 问题
const CommandBar = dynamic(
  () => import('@/shared/ui/command').then((mod) => ({ default: mod.CommandBar })),
  { ssr: false }
);

interface AppShellProps {
  children: ReactNode;
  /** 页面标题（传入后隐藏面包屑和默认 Header） */
  title?: string;
  /** 自定义面包屑项（传入后自动显示面包屑） */
  breadcrumb?: { label: string; href?: string }[];
  /** 右侧 actions */
  actions?: ReactNode;
  /** 是否显示项目选择器 */
  showProjectSelector?: boolean;
  /** 是否显示 Header（默认 true，现有页面可传 false 避免双 Header） */
  showHeader?: boolean;
}

/**
 * 应用外壳：Sidebar + Header + 主内容区
 * 
 * v5.0: Sidebar 全高（含 Logo），Header 和 main 偏移 sidebar 宽度
 * - Sidebar 展开态 248px / 收缩态 64px
 * - Header sticky 在内容区域顶部
 */
export default function AppShell({ children, title, breadcrumb, actions, showProjectSelector, showHeader = true }: AppShellProps) {
  const pathname = usePathname();
  // 精确 selector 订阅
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const hydrated = useUIStore((s) => s.hydrated);
  const isOpen = hydrated ? sidebarOpen : true;
  const activeNavSection = useUIStore((s) => s.activeNavSection);
  const setActiveNavSection = useUIStore((s) => s.setActiveNavSection);

  // AppShell 层同步 activeNavSection，确保 Header 能立即读到正确值
  useEffect(() => {
    const { section } = inferNavFromPath(pathname);
    if (section !== activeNavSection) {
      setActiveNavSection(section);
    }
  }, [pathname, activeNavSection, setActiveNavSection]);

  // 决定是否显示面包屑：传入 breadcrumb 或没有传 title 时自动显示
  const shouldShowBreadcrumb = breadcrumb ? true : !title;

  return (
    <AuthGuard>
      <SetupWizardGuard />
      <Sidebar />
      <CommandBar />
      <div
        className={clsx(
          'min-h-screen transition-all duration-300 ease-out',
          isOpen ? 'ml-[248px]' : 'ml-[64px]'
        )}
      >
        {showHeader && (
          <Header
            title={title}
            breadcrumb={breadcrumb}
            showBreadcrumb={shouldShowBreadcrumb}
            actions={actions}
            showProjectSelector={showProjectSelector}
          />
        )}
        <main>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
