/**
 * 单个插件管理 API — GET + PUT + DELETE
 *
 * GET /api/plugins/[id] — 获取插件详情
 * PUT /api/plugins/[id] — 更新插件配置/状态（启用/禁用）
 * DELETE /api/plugins/[id] — 卸载插件
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPluginRegistry } from '@/core/plugins';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const registry = getPluginRegistry();
    const plugin = await registry.getPlugin(id);

    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    const state = await registry.getPluginState(id);
    return NextResponse.json({
      ...plugin,
      status: state?.status ?? 'discovered',
      source: state?.source ?? 'community',
      installedAt: state?.installedAt,
      userConfig: state?.userConfig ?? {},
    });
  } catch (error) {
    console.error(`[GET /api/plugins/${'id'}]`, error);
    return NextResponse.json({ error: 'Failed to get plugin' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const registry = getPluginRegistry();
    const existing = await registry.getPlugin(id);

    if (!existing) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = ['status', 'config'];

    // 过滤只允许更新的字段
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    // 处理状态变更
    if (updates.status === 'enabled') {
      await registry.enablePlugin(id);
    } else if (updates.status === 'disabled') {
      await registry.disablePlugin(id);
    }

    // 处理配置更新
    if (updates.config && typeof updates.config === 'object') {
      await registry.updatePluginConfig(id, updates.config as Record<string, unknown>);
    }

    const state = await registry.getPluginState(id);
    return NextResponse.json({ success: true, plugin: state });
  } catch (error) {
    console.error(`[PUT /api/plugins/${'id'}]`, error);
    return NextResponse.json({ error: 'Failed to update plugin' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const registry = getPluginRegistry();
    const existing = await registry.getPlugin(id);

    if (!existing) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    await registry.uninstallPlugin(id);
    return NextResponse.json({ success: true, message: `Plugin ${id} uninstalled` });
  } catch (error) {
    console.error(`[DELETE /api/plugins/${'id'}]`, error);
    return NextResponse.json({ error: 'Failed to uninstall plugin' }, { status: 500 });
  }
}
