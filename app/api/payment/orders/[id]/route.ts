import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { eventLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 从 eventLogs 查询订单记录
    const [order] = await db.select().from(eventLogs).where(eq(eventLogs.entityId, id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('[Payment Order Detail] Error:', error);
    return NextResponse.json({ error: 'Failed to get order' }, { status: 500 });
  }
}
