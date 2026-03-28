/**
 * Consumer 登录 API
 * POST /api/consumer/auth/login
 * 
 * 独立于 Member Auth，使用 consumers 表
 */

import { NextResponse } from 'next/server';
import { db, consumers } from '@/db';
import { eq } from 'drizzle-orm';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';

export const dynamic = 'force-dynamic';

const auth = new LocalAuthAdapter();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 参数校验
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // 查找 consumer
    const [consumer] = await db.select().from(consumers).where(eq(consumers.email, email.toLowerCase().trim())).limit(1);
    if (!consumer) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 验证密码
    const valid = await auth.verifyPassword(password, consumer.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 创建 token
    const token = await auth.createToken({
      sub: consumer.id,
      email: consumer.email,
      type: 'consumer',
    });

    // 返回 consumer 信息（脱敏）+ token
    const { passwordHash: _, ...safeConsumer } = consumer;

    return NextResponse.json({
      token,
      consumer: safeConsumer,
    });
  } catch (error) {
    console.error('[Consumer Login] Error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
