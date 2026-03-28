/**
 * Marketplace 服务订阅 API
 * POST /api/marketplace/services/[id]/subscribe
 * 
 * 订阅服务（需 Consumer Auth）
 */

import { NextResponse } from 'next/server';
import { db, services, subscriptions, serviceUsage } from '@/db';
import { eq, and } from 'drizzle-orm';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';
import { generateId } from '@/lib/id';

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
    const p = payload as Record<string, unknown> | null;
    if (!p || p.type !== 'consumer' || !p.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const consumerId = p.sub as string;

    // 解析请求体
    const body = await request.json();
    const plan = body.plan || 'monthly';

    const validPlans = ['trial', 'monthly', 'yearly', 'lifetime'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` }, { status: 400 });
    }

    // 校验 service 存在
    const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // 检查是否已有 active 订阅
    const [existing] = await db.select().from(subscriptions).where(
      and(
        eq(subscriptions.consumerId, consumerId),
        eq(subscriptions.serviceId, serviceId),
        eq(subscriptions.status, 'active'),
      ),
    ).limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Already subscribed to this service' }, { status: 409 });
    }

    const now = new Date();

    // 计算到期时间
    let expiresAt: Date | null = null;
    if (plan === 'monthly') {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (plan === 'yearly') {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
    // trial 和 lifetime 无 expiresAt

    // 创建订阅
    const subscriptionId = generateId();
    await db.insert(subscriptions).values({
      id: subscriptionId,
      consumerId,
      serviceId,
      plan,
      status: 'active',
      startedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // 创建用量记录（按月周期）
    const periodEnd = plan === 'yearly'
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const usageId = generateId();
    await db.insert(serviceUsage).values({
      id: usageId,
      consumerId,
      serviceId,
      subscriptionId,
      tokenCount: 0,
      requestCount: 0,
      periodStart: now,
      periodEnd,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      subscriptionId,
      consumerId,
      serviceId,
      plan,
      status: 'active',
      startedAt: now.toISOString(),
      expiresAt: expiresAt?.toISOString() || null,
    }, { status: 201 });
  } catch (error) {
    console.error('[Marketplace Subscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
