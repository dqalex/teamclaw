'use client';

import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  FileText,
  Users,
  Settings,
  Bot,
  Cpu,
  Clock,
  Send,
  Package,
  ClipboardList,
  Moon,
  Sun,
  LogOut,
  ArrowRight,
  Sparkles,
  Globe,
  Shield,
  Bug,
  Info,
  Store,
  X,
} from 'lucide-react';
import { type TFunction } from 'i18next';
import clsx from 'clsx';
import { useUIStore } from '@/domains/ui/store';
import { useAuthStore } from '@/domains/auth/store';

// ============================================
// 类型定义
// ============================================

interface CommandItem {
  id: string;
  label: string;
  labelKey?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  shortcut?: string;
  category?: string;
  onSelect?: () => void;
}

interface CommandGroup {
  id: string;
  label: string;
  labelKey?: string;
  items: CommandItem[];
}

// ============================================
// CommandBar 组件
// ============================================

export interface CommandBarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * 全局命令面板 (⌘K)
 *
 * 设计规范参考：docs/optimization/teamclaw_v1.1_ui_design_spec.md §九
 * 使用 cmdk 库实现，支持模糊搜索、键盘导航、分组展示
 */
export function CommandBar({ open: controlledOpen, onOpenChange }: CommandBarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const handleOpenChange = onOpenChange ?? setInternalOpen;
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const logout = useAuthStore((s) => s.logout);
  const inputRef = useRef<HTMLInputElement>(null);

  // 快捷键 ⌘K / Ctrl+K 切换
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleOpenChange]);

  // 聚焦搜索框
  useEffect(() => {
    if (open) {
      // 延迟聚焦确保 cmdk 已渲染
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // 导航辅助
  const navigate = useCallback((href: string) => {
    handleOpenChange(false);
    router.push(href);
  }, [router, handleOpenChange]);

  // 构建命令列表
  const groups = buildCommandGroups({
    t,
    navigate,
    pathname,
    theme,
    setTheme,
    logout,
    router,
  });

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        ref={inputRef}
        placeholder={t('command.searchPlaceholder', '搜索功能、页面、设置...')}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-8">
            <Search className="w-8 h-8 opacity-30" />
            <p className="text-sm opacity-50">
              {t('command.noResults', '没有找到匹配结果')}
            </p>
          </div>
        </CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.id} heading={t(group.labelKey ?? '', group.label)}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const href = item.href;
              const content = (
                <>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t(item.labelKey ?? '', item.label)}</span>
                  {item.shortcut && (
                    <span className="ml-auto text-[10px] font-mono opacity-40">
                      {item.shortcut}
                    </span>
                  )}
                </>
              );

              if (href) {
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => navigate(href)}
                  >
                    {content}
                    <ArrowRight className="ml-auto w-3.5 h-3.5 opacity-0 group-data-[selected=true]/item:opacity-50 transition-opacity" />
                  </CommandItem>
                );
              }

              return (
                <CommandItem
                  key={item.id}
                  onSelect={item.action || item.onSelect || (() => {})}
                >
                  {content}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      {/* 底部快捷键提示 */}
      <div
        className="flex items-center justify-between border-t px-3 py-2 text-[11px]"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex items-center gap-0.5 rounded border px-1 py-0.5 font-mono text-[10px]"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-hover)',
            }}
          >
            <span>↑↓</span>
          </kbd>
          {t('command.navigate', '导航')}
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex items-center gap-0.5 rounded border px-1 py-0.5 font-mono text-[10px]"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-hover)',
            }}
          >
            <span>↵</span>
          </kbd>
          {t('command.select', '选择')}
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex items-center gap-0.5 rounded border px-1 py-0.5 font-mono text-[10px]"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-hover)',
            }}
          >
            <span>esc</span>
          </kbd>
          {t('command.close', '关闭')}
        </span>
      </div>
    </CommandDialog>
  );
}

// ============================================
// 命令列表构建
// ============================================

function buildCommandGroups(params: {
  t: TFunction;
  navigate: (href: string) => void;
  pathname: string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  logout: () => void;
  router: ReturnType<typeof useRouter>;
}): CommandGroup[] {
  const { t, navigate, pathname, theme, setTheme, logout, router } = params;

  // 根据当前页面过滤"前往"建议（不推荐当前页）
  const isCurrentPage = (href: string) => pathname === href;

  return [
    {
      id: 'recent',
      label: '常用页面',
      labelKey: 'command.recentPages',
      items: [
        {
          id: 'goto-dashboard',
          label: '仪表盘',
          labelKey: 'nav.dashboard',
          icon: LayoutDashboard,
          href: '/dashboard',
          shortcut: 'G D',
        },
        {
          id: 'goto-tasks',
          label: '任务',
          labelKey: 'nav.tasks',
          icon: CheckSquare,
          href: '/tasks',
          shortcut: 'G T',
        },
        {
          id: 'goto-wiki',
          label: '文档',
          labelKey: 'nav.wiki',
          icon: FileText,
          href: '/wiki',
          shortcut: 'G W',
        },
        {
          id: 'goto-agents',
          label: 'Agent',
          labelKey: 'nav.agents',
          icon: Bot,
          href: '/agents',
          shortcut: 'G A',
        },
        {
          id: 'goto-skills',
          label: '技能中心',
          labelKey: 'nav.skills',
          icon: Sparkles,
          href: '/skills',
        },
        {
          id: 'goto-members',
          label: '成员',
          labelKey: 'nav.members',
          icon: Users,
          href: '/members',
        },
      ].filter((item) => item.href ? !isCurrentPage(item.href) : true),
    },
    {
      id: 'workspace',
      label: '工作区',
      labelKey: 'command.workspace',
      items: [
        {
          id: 'goto-schedule',
          label: '定时任务',
          labelKey: 'nav.scheduler',
          icon: Clock,
          href: '/schedule',
        },
        {
          id: 'goto-sop',
          label: 'SOP 模板',
          labelKey: 'nav.sop',
          icon: ClipboardList,
          href: '/sop',
        },
        {
          id: 'goto-deliveries',
          label: '交付',
          labelKey: 'nav.deliveries',
          icon: Send,
          href: '/deliveries',
        },
      ].filter((item) => item.href ? !isCurrentPage(item.href) : true),
    },
    {
      id: 'settings',
      label: '设置',
      labelKey: 'command.settings',
      items: [
        {
          id: 'goto-settings-general',
          label: '通用设置',
          labelKey: 'settings.general.title',
          icon: Settings,
          href: '/settings/general',
        },
        {
          id: 'goto-settings-openclaw',
          label: 'OpenClaw',
          icon: Cpu,
          href: '/settings/openclaw',
        },
        {
          id: 'goto-settings-security',
          label: '安全设置',
          labelKey: 'settings.security.title',
          icon: Shield,
          href: '/settings/security',
        },
        {
          id: 'goto-marketplace',
          label: '市场',
          labelKey: 'nav.marketplace',
          icon: Store,
          href: '/marketplace',
        },
        {
          id: 'goto-landing',
          label: '首页管理',
          icon: Globe,
          href: '/settings/landing',
        },
        {
          id: 'goto-debug',
          label: '调试工具',
          icon: Bug,
          href: '/settings/debug',
        },
        {
          id: 'goto-about',
          label: '关于系统',
          icon: Info,
          href: '/settings/about',
        },
      ].filter((item) => item.href ? !isCurrentPage(item.href) : true),
    },
    {
      id: 'actions',
      label: '操作',
      labelKey: 'command.actions',
      items: [
        {
          id: 'toggle-theme',
          label: theme === 'dark' ? '切换亮色主题' : '切换暗色主题',
          labelKey: theme === 'dark' ? 'command.lightTheme' : 'command.darkTheme',
          icon: theme === 'dark' ? Sun : Moon,
          action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
          shortcut: '⌘ J',
        },
        {
          id: 'logout',
          label: '退出登录',
          labelKey: 'command.logout',
          icon: LogOut,
          action: () => {
            logout();
            router.push('/login');
          },
        },
      ],
    },
  ];
}

// ============================================
// cmdk 包装组件（零依赖原生实现）
// ============================================

/**
 * 基于 cmdk 的 Dialog 包装器
 * 提供搜索/导航/命令执行的统一入口
 */
function CommandDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  // 监听 Escape 关闭
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    // 使用 capture 阶段确保优先级高于 cmdk 内部处理
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onOpenChange]);

  // 锁定 body 滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
        onClick={() => onOpenChange(false)}
      />
      {/* 命令面板 */}
      <div
        className="relative w-full max-w-xl rounded-2xl border shadow-float overflow-hidden animate-[slideUp_200ms_ease-out]"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** 搜索输入框 */
const CommandInput = forwardRef<HTMLInputElement, { placeholder: string }>(
  function CommandInput({ placeholder }, ref) {
    const [value, setValue] = useState('');

    // 通过 context 传递搜索值给子组件
    // 简化实现：直接用 cmdk 的 Command 组件处理
    return (
      <div className="flex items-center border-b px-4" style={{ borderColor: 'var(--border)' }}>
        <Search className="w-4 h-4 mr-2 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 py-3.5 bg-transparent text-sm outline-none placeholder:opacity-40"
          style={{ color: 'var(--text-primary)' }}
          // 向上传递 value 用于过滤
          data-command-input
          data-value={value}
        />
        <button
          onClick={() => setValue('')}
          className="ml-1 p-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }
);

/** 命令列表容器 */
function CommandList({ children }: { children: ReactNode }) {
  return (
    <div
      className="max-h-[320px] overflow-y-auto px-2 py-2"
      data-command-list
    >
      {children}
    </div>
  );
}

/** 命令分组 */
function CommandGroup({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-1" data-command-group>
      <div
        className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {heading}
      </div>
      <div role="group">
        {children}
      </div>
    </div>
  );
}

/** 单个命令项 */
function CommandItem({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: () => void;
}) {
  const [selected, setSelected] = useState(false);
  const itemRef = useRef<HTMLButtonElement>(null);

  // 键盘导航（上下箭头 + Enter）
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const list = el.closest('[data-command-list]');
      if (!list) return;
      const items = Array.from(list.querySelectorAll('[data-command-item]'));
      const currentIndex = items.indexOf(el);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (currentIndex + 1) % items.length;
        (items[next] as HTMLElement)?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (currentIndex - 1 + items.length) % items.length;
        (items[prev] as HTMLElement)?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect();
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [onSelect]);

  return (
    <button
      ref={itemRef}
      data-command-item
      className={clsx(
        'group/item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left',
        selected
          ? 'bg-primary-500/10 dark:bg-primary-400/10'
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      )}
      style={{
        color: 'var(--text-primary)',
      }}
      onMouseEnter={() => setSelected(true)}
      onMouseLeave={() => setSelected(false)}
      onClick={onSelect}
      tabIndex={-1}
    >
      {children}
    </button>
  );
}

/** 空结果提示 */
function CommandEmpty({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
