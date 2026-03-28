'use client';

import type { NavSection } from '@/domains/ui/store';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  Bolt,
  Handshake,
  Store,
  Settings,
} from 'lucide-react';

// 侧边栏主导航分组（图标栏）
export interface SidebarNavItem {
  section: NavSection;
  icon: LucideIcon;
  labelKey: string; // i18n key
  defaultLabel: string;
  /** 右下角 badge 数字 */
  badge?: number;
}

export const sidebarNavItems: SidebarNavItem[] = [
  { section: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', defaultLabel: 'Dashboard' },
  { section: 'projects', icon: FolderOpen, labelKey: 'nav.groupWorkspace', defaultLabel: '工作区' },
  { section: 'assets', icon: Package, labelKey: 'nav.groupAssets', defaultLabel: '资产库' },
  { section: 'automation', icon: Bolt, labelKey: 'nav.groupAutomation', defaultLabel: '自动化' },
  { section: 'collaboration', icon: Handshake, labelKey: 'nav.groupCollaboration', defaultLabel: '协作' },
  { section: 'operations', icon: Store, labelKey: 'nav.groupOperations', defaultLabel: '运营' },
  { section: 'settings', icon: Settings, labelKey: 'nav.settings', defaultLabel: '管理' },
];

// 顶部子导航配置（每个分组对应的 tab 列表）
export interface SubNavItem {
  id: string;
  href: string;
  labelKey: string;
  defaultLabel: string;
}

export interface SubNavConfig {
  section: NavSection;
  items: SubNavItem[];
}

export const subNavConfigs: SubNavConfig[] = [
  {
    section: 'dashboard',
    items: [],
  },
  {
    section: 'projects',
    items: [
      { id: 'projects', href: '/projects', labelKey: 'nav.projects', defaultLabel: '项目' },
      { id: 'tasks', href: '/tasks', labelKey: 'nav.tasks', defaultLabel: '任务' },
      { id: 'wiki', href: '/wiki', labelKey: 'nav.wiki', defaultLabel: '文档' },
      { id: 'members', href: '/members', labelKey: 'nav.members', defaultLabel: '成员' },
    ],
  },
  {
    section: 'assets',
    items: [
      { id: 'skills', href: '/skills', labelKey: 'nav.skills', defaultLabel: '技能' },
      { id: 'skillhub', href: '/skillhub', labelKey: 'nav.skillhub', defaultLabel: '技能市场' },
      { id: 'sops', href: '/sop', labelKey: 'nav.sop', defaultLabel: 'SOP' },
      { id: 'render-templates', href: '/sop?tab=render', labelKey: 'nav.renderTemplates', defaultLabel: '渲染模板' },
    ],
  },
  {
    section: 'automation',
    items: [
      { id: 'schedule', href: '/schedule', labelKey: 'nav.scheduler', defaultLabel: '定时任务' },
      { id: 'workflows', href: '/workflows', labelKey: 'nav.workflows', defaultLabel: '工作流' },
      { id: 'triggers', href: '/triggers', labelKey: 'nav.triggers', defaultLabel: '触发器' },
      { id: 'agents', href: '/agents', labelKey: 'nav.agents', defaultLabel: 'Agent' },
    ],
  },
  {
    section: 'collaboration',
    items: [
      { id: 'deliveries', href: '/deliveries', labelKey: 'nav.deliveries', defaultLabel: '交付' },
      { id: 'approvals', href: '/approvals', labelKey: 'nav.approvals', defaultLabel: '审批' },
      { id: 'sessions', href: '/sessions', labelKey: 'nav.sessions', defaultLabel: '会话' },
    ],
  },
  {
    section: 'operations',
    items: [
      { id: 'marketplace', href: '/marketplace', labelKey: 'nav.marketplace', defaultLabel: '服务市场' },
      { id: 'blog-manage', href: '/blog-manage', labelKey: 'nav.blogManage', defaultLabel: '博客' },
      { id: 'landing', href: '/operations/landing', labelKey: 'nav.operationsLanding', defaultLabel: '落地页' },
    ],
  },
  {
    section: 'settings',
    items: [
      { id: 'general', href: '/settings/general', labelKey: 'nav.settingsGeneral', defaultLabel: '通用' },
      { id: 'openclaw', href: '/settings/openclaw', labelKey: 'nav.settingsOpenClaw', defaultLabel: 'OpenClaw' },
      { id: 'mcp-token', href: '/settings/mcp-token', labelKey: 'nav.settingsMcpToken', defaultLabel: 'MCP Token' },
      { id: 'plugins', href: '/settings/plugins', labelKey: 'nav.settingsPlugins', defaultLabel: '插件' },
      { id: 'security', href: '/settings/security', labelKey: 'nav.settingsSecurity', defaultLabel: '安全' },
      { id: 'users', href: '/settings/users', labelKey: 'nav.settingsUsers', defaultLabel: '用户' },
      { id: 'debug', href: '/settings/debug', labelKey: 'nav.settingsDebug', defaultLabel: '调试工具' },
      { id: 'about', href: '/settings/about', labelKey: 'nav.settingsAbout', defaultLabel: '关于' },
    ],
  },
];

/**
 * 根据 pathname 自动推断当前 NavSection 和 SubNavItem
 */
export function inferNavFromPath(pathname: string): { section: NavSection; subNavId?: string } {
  // 按 href 前缀匹配
  const matchMap: Array<{ prefix: string; section: NavSection; subNavId: string }> = [
    { prefix: '/dashboard', section: 'dashboard', subNavId: 'dashboard' },
    { prefix: '/projects', section: 'projects', subNavId: 'projects' },
    { prefix: '/tasks', section: 'projects', subNavId: 'tasks' },
    { prefix: '/wiki', section: 'projects', subNavId: 'wiki' },
    { prefix: '/members', section: 'projects', subNavId: 'members' },
    { prefix: '/skills', section: 'assets', subNavId: 'skills' },
    { prefix: '/skillhub', section: 'assets', subNavId: 'skillhub' },
    { prefix: '/sop', section: 'assets', subNavId: 'sops' },
    { prefix: '/workflows', section: 'automation', subNavId: 'workflows' },
    { prefix: '/schedule', section: 'automation', subNavId: 'schedule' },
    { prefix: '/triggers', section: 'automation', subNavId: 'triggers' },
    { prefix: '/agents', section: 'automation', subNavId: 'agents' },
    { prefix: '/deliveries', section: 'collaboration', subNavId: 'deliveries' },
    { prefix: '/approvals', section: 'collaboration', subNavId: 'approvals' },
    { prefix: '/sessions', section: 'collaboration', subNavId: 'sessions' },
    { prefix: '/marketplace', section: 'operations', subNavId: 'marketplace' },
    { prefix: '/blog-manage', section: 'operations', subNavId: 'blog-manage' },
    { prefix: '/operations/landing', section: 'operations', subNavId: 'landing' },
    { prefix: '/consumer', section: 'operations', subNavId: 'marketplace' },
    { prefix: '/settings', section: 'settings', subNavId: 'general' },
  ];

  for (const m of matchMap) {
    if (pathname === m.prefix || pathname.startsWith(m.prefix + '/')) {
      return { section: m.section, subNavId: m.subNavId };
    }
  }

  return { section: 'dashboard' };
}

/**
 * 获取某个 section 的第一个子路由
 */
export function inferFirstRoute(section: NavSection): string | null {
  const config = subNavConfigs.find(c => c.section === section);
  if (!config || config.items.length === 0) {
    // dashboard 等无子项的 section 直接返回自身
    return '/' + section;
  }
  return config.items[0].href;
}
