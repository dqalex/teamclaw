/**
 * Marketplace 服务激活 API
 * POST /api/marketplace/services/[id]/activate
 * 
 * 使用激活码激活服务（需 Consumer Auth）
 */

import { NextResponse } from 'next/server';
import { db, services, activationKeys, subscriptions, consumers } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';
import { generateId } from '@/lib/id';
import { eventBus } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';

const auth = new LocalAuthAdapter();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;

    // 验证 Consumer Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = await auth.verifyToken(authHeader.slice(7));
    if (!payload || (payload as Record<string, unknown>).type !== 'consumer' || !(payload as Record<string, unknown>).sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const consumerId = (payload as Record<string, unknown>).sub as string;

    // 解析请求体
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Activation key is required' }, { status: 400 });
    }

    // 校验 service 存在
    const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // 查找 activationKey
    const [activationKey] = await db.select().from(activationKeys).where(
      and(
        eq(activationKeys.key, key.trim()),
        eq(activationKeys.serviceId, serviceId),
      ),
    ).limit(1);

    if (!activationKey) {
      return NextResponse.json({ error: 'Invalid activation key' }, { status: 404 });
    }

    // 检查 key 状态
    if (activationKey.status !== 'unused') {
      return NextResponse.json({ error: `Activation key already ${activationKey.status}` }, { status: 400 });
    }

    // 检查过期
    if (activationKey.expiresAt && activationKey.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Activation key has expired' }, { status: 400 });
    }

    const now = new Date();

    // 更新 key 状态为 activated
    await db.update(activationKeys).set({
      status: 'activated',
      activatedBy: consumerId,
      activatedAt: now,
    }).where(eq(activationKeys.id, activationKey.id));

    // 创建 lifetime 订阅
    const subscriptionId = generateId();
    await db.insert(subscriptions).values({
      id: subscriptionId,
      consumerId,
      serviceId,
      plan: 'lifetime',
      status: 'active',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // 发射 SSE 事件
    eventBus.emit({ type: 'service_activated', resourceId: serviceId });

    return NextResponse.json({
      subscriptionId,
      consumerId,
      serviceId,
      plan: 'lifetime',
      status: 'active',
      activatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[Marketplace Activate] Error:', error);
    return NextResponse.json({ error: 'Failed to activate service' }, { status: 500 });
  }
}
