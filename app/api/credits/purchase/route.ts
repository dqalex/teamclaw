/**
 * 积分充值 API
 * POST /api/credits/purchase
 */
import { NextResponse } from 'next/server';
import { db, consumers } from '@/db';
import { creditsTransactions } from '@/core/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/shared/lib/id';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';
import { eventBus } from '@/shared/lib/event-bus';

export const dynamic = 'force-dynamic';
const auth = new LocalAuthAdapter();

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await auth.verifyToken(token);
    if (!payload || (payload as Record<string, unknown>).type !== 'consumer' || !(payload as Record<string, unknown>).sub) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const consumerId = (payload as Record<string, unknown>).sub as string;
    const body = await request.json();
    const { creditsAmount } = body;

    // 参数校验
    if (!creditsAmount || typeof creditsAmount !== 'number' || creditsAmount <= 0) {
      return NextResponse.json({ error: 'Credits amount must be a positive number' }, { status: 400 });
    }
    if (creditsAmount > 100000) {
      return NextResponse.json({ error: 'Maximum 100,000 credits per purchase' }, { status: 400 });
    }

    // 检查 consumer 存在
    const [consumer] = await db.select({ id: consumers.id, credits: consumers.credits }).from(consumers).where(eq(consumers.id, consumerId)).limit(1);
    if (!consumer) {
      return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    const now = new Date();
    const newBalance = (consumer.credits ?? 0) + creditsAmount;
    const transactionId = generateId();

    // 原子操作：增加 credits + 记录交易
    await db.update(consumers).set({
      credits: newBalance,
      updatedAt: now,
    }).where(eq(consumers.id, consumerId));

    await db.insert(creditsTransactions).values({
      id: transactionId,
      consumerId,
      amount: creditsAmount,
      balance: newBalance,
      type: 'purchase',
      description: `Purchased ${creditsAmount} credits`,
      createdAt: now,
    });

    // SSE 事件
    eventBus.emit({
      type: 'credits_purchased',
      resourceId: consumerId,
      data: { transactionId, creditsAdded: creditsAmount, newBalance },
    });

    return NextResponse.json({
      transactionId,
      creditsAdded: creditsAmount,
      newBalance,
    });
  } catch (error) {
    console.error('[Credits Purchase] Error:', error);
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 });
  }
}
