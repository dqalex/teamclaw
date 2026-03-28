import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { proactiveRules, proactiveEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ALLOWED_FIELDS = ['name', 'triggerType', 'config', 'enabled', 'cooldownMinutes', 'projectId'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [rule] = await db.select().from(proactiveRules).where(eq(proactiveRules.id, id));
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }
  return NextResponse.json(rule);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [existing] = await db.select().from(proactiveRules).where(eq(proactiveRules.id, id));
  if (!existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  await db.update(proactiveRules).set(updates).where(eq(proactiveRules.id, id));
  const [updated] = await db.select().from(proactiveRules).where(eq(proactiveRules.id, id));
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [existing] = await db.select().from(proactiveRules).where(eq(proactiveRules.id, id));
  if (!existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  // 关联事件通过 schema 的 onDelete: 'cascade' 自动删除
  await db.delete(proactiveRules).where(eq(proactiveRules.id, id));

  return NextResponse.json({ success: true });
}
