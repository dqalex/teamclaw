import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectObjectives, keyResults, keyResultTasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { eventBus } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['draft', 'active', 'completed', 'archived'];

// GET /api/okr/objectives/[id] - 获取单个 Objective
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [objective] = await db.select().from(projectObjectives).where(eq(projectObjectives.id, id));
    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    const krs = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.objectiveId, id));

    return NextResponse.json({ ...objective, keyResults: krs });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch objective' }, { status: 500 });
  }
}

// PUT /api/okr/objectives/[id] - 更新 Objective
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [existing] = await db.select().from(projectObjectives).where(eq(projectObjectives.id, id));
    if (!existing) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    if (body.status && !VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const allowedFields = ['title', 'description', 'progress', 'dueDate', 'status'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.dueDate && typeof updateData.dueDate === 'string') {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    await db.update(projectObjectives).set(updateData).where(eq(projectObjectives.id, id));
    const [updated] = await db.select().from(projectObjectives).where(eq(projectObjectives.id, id));
    eventBus.emit({ type: 'objective_updated', resourceId: id });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update objective' }, { status: 500 });
  }
}

// DELETE /api/okr/objectives/[id] - 删除 Objective（级联删除 keyResultTasks → keyResults → objective）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [existing] = await db.select().from(projectObjectives).where(eq(projectObjectives.id, id));
    if (!existing) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    // 级联删除：keyResultTasks → keyResults → objective
    db.transaction((tx) => {
      // 获取该 objective 下所有 keyResult IDs
      const krIds = tx.select({ id: keyResults.id }).from(keyResults).where(eq(keyResults.objectiveId, id)).all().map(r => r.id);
      if (krIds.length > 0) {
        // 删除 keyResultTasks 关联
        for (const krId of krIds) {
          tx.delete(keyResultTasks).where(eq(keyResultTasks.keyResultId, krId)).run();
        }
        // 删除 keyResults
        tx.delete(keyResults).where(eq(keyResults.objectiveId, id)).run();
      }
      // 删除 objective
      tx.delete(projectObjectives).where(eq(projectObjectives.id, id)).run();
    });

    eventBus.emit({ type: 'objective_deleted', resourceId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/okr/objectives]', err);
    return NextResponse.json({ error: 'Failed to delete objective' }, { status: 500 });
  }
}
