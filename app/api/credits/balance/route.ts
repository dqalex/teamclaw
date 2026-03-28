/**
 * 积分余额查询 API
 * GET /api/credits/balance
 */
import { NextResponse } from 'next/server';
import { db, consumers } from '@/db';
import { eq } from 'drizzle-orm';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';

export const dynamic = 'force-dynamic';
const auth = new LocalAuthAdapter();

export async function GET(request: Request) {
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
    const [consumer] = await db
      .select({ id: consumers.id, credits: consumers.credits })
      .from(consumers)
      .where(eq(consumers.id, consumerId))
      .limit(1);

    if (!consumer) {
      return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    return NextResponse.json({ credits: consumer.credits ?? 0 });
  } catch (error) {
    console.error('[Credits Balance] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
