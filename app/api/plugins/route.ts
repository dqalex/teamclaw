/**
 * 插件列表 API — GET（列表）+ POST（安装）
 *
 * GET /api/plugins — 获取所有已发现插件的状态
 * POST /api/plugins — 安装新插件（从 ClawHub 或本地）
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPluginRegistry } from '@/core/plugins';

export async function GET() {
  try {
    const registry = getPluginRegistry();
    const plugins = await registry.discover();
    const states = await registry.getAllPluginStates();

    const items = plugins.map((plugin) => {
      const state = states[plugin.id];
      return {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        type: plugin.type,
        status: state?.status ?? 'discovered',
        source: state?.source ?? 'community',
        icon: plugin.icon,
        capabilities: plugin.capabilities,
        installedAt: state?.installedAt,
        errorMessage: state?.errorMessage,
      };
    });

    return NextResponse.json({ plugins: items });
  } catch (error) {
    console.error('[GET /api/plugins]', error);
    return NextResponse.json({ error: 'Failed to list plugins' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, targetDir } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Missing required field: slug' }, { status: 400 });
    }

    // ClawHub 安装通过异步任务处理，这里返回 accepted
    const registry = getPluginRegistry();
    const existing = await registry.getPlugin(slug);
    if (existing) {
      return NextResponse.json({ error: 'Plugin already installed' }, { status: 409 });
    }

    // 实际安装将在 ClawHub 客户端实现中完成
    return NextResponse.json({
      success: true,
      message: `Plugin ${slug} installation queued`,
      installPath: targetDir ?? 'skills/',
    });
  } catch (error) {
    console.error('[POST /api/plugins]', error);
    return NextResponse.json({ error: 'Failed to install plugin' }, { status: 500 });
  }
}
