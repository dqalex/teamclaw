'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Settings 入口页面 — 重定向到 /settings/general
 * 
 * 原来的 687 行单体文件已拆分为独立子路由：
 * - /settings/general    — 通用设置（主题/语言/数据/密码）
 * - /settings/openclaw   — OpenClaw Gateway 设置
 * - /settings/plugins   — 插件中心 🆕
 * - /settings/mcp-token  — MCP Token 管理
 * - /settings/security   — 安全设置（SSRF/安全码/系统初始化）
 * - /settings/landing    — 首页内容管理
 * - /settings/debug      — 调试工具
 * - /settings/about      — 关于系统
 * 
 * 兼容性：保留 ?tab=xxx 查询参数的跳转映射
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // 兼容旧 URL 中的 ?tab=xxx 查询参数
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    const tabToRoute: Record<string, string> = {
      general: '/settings/general',
      openclaw: '/settings/openclaw',
      plugins: '/settings/plugins',
      'mcp-token': '/settings/mcp-token',
      security: '/settings/security',
      landing: '/settings/landing',
      debug: '/settings/debug',
      about: '/settings/about',
    };

    const targetRoute = tab && tabToRoute[tab] ? tabToRoute[tab] : '/settings/general';
    router.replace(targetRoute);
  }, [router]);

  return null;
}
