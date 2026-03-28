/**
 * Marketplace 服务评分 API
 * POST /api/marketplace/services/[id]/rate
 * 
 * 需 Consumer Auth
 */

import { NextResponse } from 'next/server';
import { db, consumers, services, serviceRatings } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';
import { generateId } from '@/lib/id';
import { updateServiceRating } from '@/src/domains/marketplace/scoring';
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
    const p = payload as Record<string, unknown> | null;
    if (!p || p.type !== 'consumer' || !p.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const consumerId = p.sub as string;

    // 校验 service 存在
    const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // 解析请求体
    const body = await request.json();
    const { rating, feedback } = body;

    // 校验 rating 1-5
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // 创建评分记录
    const now = new Date();
    const ratingId = generateId();

    await db.insert(serviceRatings).values({
      id: ratingId,
      serviceId,
      consumerId,
      rating: Math.round(rating),
      feedback: typeof feedback === 'string' ? feedback.slice(0, 1000) : null,
      createdAt: now,
    });

    // 聚合更新 service 的 averageRating 和 ratingCount
    await updateServiceRating(serviceId);

    // 发射 SSE 事件
    eventBus.emit({ type: 'service_rating_submitted', resourceId: serviceId });

    return NextResponse.json({
      id: ratingId,
      serviceId,
      consumerId,
      rating: Math.round(rating),
      feedback: typeof feedback === 'string' ? feedback.slice(0, 1000) : null,
      createdAt: now.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('[Marketplace Rate] Error:', error);
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
  }
}
