/**
 * Consumer 当前用户信息 API
 * GET /api/consumer/auth/me
 * 
 * 验证 Authorization header 中的 token，返回 consumer 信息
 */

import { NextResponse } from 'next/server';
import { db, consumers } from '@/db';
import { eq } from 'drizzle-orm';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';

export const dynamic = 'force-dynamic';

const auth = new LocalAuthAdapter();

export async function GET(request: Request) {
  try {
    // 从 Authorization header 获取 token
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

    // 查找 consumer
    const [consumer] = await db.select().from(consumers).where(eq(consumers.id, consumerId)).limit(1);
    if (!consumer) {
      return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    // 返回（脱敏，不返回 passwordHash）
    const { passwordHash: _, ...safeConsumer } = consumer;

    return NextResponse.json({ consumer: safeConsumer });
  } catch (error) {
    console.error('[Consumer Me] Error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
