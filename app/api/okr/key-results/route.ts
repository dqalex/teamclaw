import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { keyResults } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { isValidId } from '@/lib/security';

export const dynamic = 'force-dynamic';

// GET /api/okr/key-results?objective_id=xxx - 列出 KeyResults
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const objectiveId = searchParams.get('objective_id');

  if (!objectiveId || !isValidId(objectiveId)) {
    return NextResponse.json({ error: 'objective_id is required and must be valid' }, { status: 400 });
  }

  try {
    const data = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.objectiveId, objectiveId))
      .orderBy(desc(keyResults.createdAt));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch key results' }, { status: 500 });
  }
}

// POST /api/okr/key-results - 创建 KeyResult
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { objective_id, title, targetValue, unit, description } = body;

    if (!objective_id || !isValidId(objective_id)) {
      return NextResponse.json({ error: 'objective_id is required and must be valid' }, { status: 400 });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (targetValue === undefined || targetValue === null || typeof targetValue !== 'number' || targetValue <= 0) {
      return NextResponse.json({ error: 'targetValue must be a positive number' }, { status: 400 });
    }

    const now = new Date();
    const id = generateId();

    await db.insert(keyResults).values({
      id,
      objectiveId: objective_id,
      title: title.trim(),
      description: description?.trim() || null,
      targetValue,
      currentValue: 0,
      unit: unit?.trim() || null,
      status: 'not_started',
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(keyResults).where(eq(keyResults.id, id));
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[POST /api/okr/key-results]', err);
    return NextResponse.json({ error: 'Failed to create key result' }, { status: 500 });
  }
}
