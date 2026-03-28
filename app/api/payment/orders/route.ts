import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { eventLogs } from '@/db/schema';
import { eq, desc, and, like } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consumerId = searchParams.get('consumer_id');
    const eventType = searchParams.get('event_type');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    // 从 eventLogs 查询支付相关订单记录
    const conditions = [];
    conditions.push(eq(eventLogs.entityType, 'order'));

    if (eventType) {
      conditions.push(eq(eventLogs.eventType, eventType));
    }

    // 通过 payload 中的 consumerId 过滤（JSON 查询用 LIKE 近似匹配）
    const orders = await db.select()
      .from(eventLogs)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(eventLogs.createdAt))
      .limit(limit);

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[Payment Orders] Error:', error);
    return NextResponse.json({ error: 'Failed to get orders' }, { status: 500 });
  }
}
