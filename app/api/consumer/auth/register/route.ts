/**
 * Consumer 注册 API
 * POST /api/consumer/auth/register
 * 
 * 独立于 Member Auth，创建 consumers 表记录
 */

import { NextResponse } from 'next/server';
import { db, consumers } from '@/db';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';
import { eventBus } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';

const auth = new LocalAuthAdapter();

// 邮箱格式校验
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    // 参数校验
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // 检查 email 唯一性
    const normalizedEmail = email.toLowerCase().trim();
    const [existing] = await db.select({ id: consumers.id }).from(consumers).where(eq(consumers.email, normalizedEmail)).limit(1);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // 创建 consumer
    const now = new Date();
    const consumerId = generateId();
    const passwordHash = await auth.hashPassword(password);

    const newConsumer = {
      id: consumerId,
      email: normalizedEmail,
      displayName: displayName.trim(),
      passwordHash,
      tier: 'free' as const,
      credits: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(consumers).values(newConsumer);

    // 发射 SSE 事件
    eventBus.emit({ type: 'consumer_registered', resourceId: consumerId });

    // 返回（脱敏）
    const { passwordHash: _, ...safeConsumer } = newConsumer;

    return NextResponse.json({ consumer: safeConsumer }, { status: 201 });
  } catch (error) {
    console.error('[Consumer Register] Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
