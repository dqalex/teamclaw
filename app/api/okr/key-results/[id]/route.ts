import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { keyResults, projectObjectives } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { eventBus } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['not_started', 'in_progress', 'completed', 'at_risk'];

// GET /api/okr/key-results/[id] - 获取单个 KeyResult
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [kr] = await db.select().from(keyResults).where(eq(keyResults.id, id));
    if (!kr) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }
    return NextResponse.json(kr);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch key result' }, { status: 500 });
  }
}

// PUT /api/okr/key-results/[id] - 更新 KeyResult（自动重算 Objective progress）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [existing] = await db.select().from(keyResults).where(eq(keyResults.id, id));
    if (!existing) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    if (body.status && !VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.currentValue !== undefined) {
      if (typeof body.currentValue !== 'number') {
        return NextResponse.json({ error: 'currentValue must be a number' }, { status: 400 });
      }
      updateData.currentValue = body.currentValue;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    await db.update(keyResults).set(updateData).where(eq(keyResults.id, id));

    // 自动重算所属 Objective 的 progress
    const allKRs = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.objectiveId, existing.objectiveId));

    if (allKRs.length > 0) {
      const avgProgress = allKRs.reduce((sum, kr) => {
        const ratio = kr.targetValue > 0 ? Math.min((kr.currentValue ?? 0) / kr.targetValue, 1) : 0;
        return sum + ratio * 100;
      }, 0) / allKRs.length;
      const newProgress = Math.round(Math.min(Math.max(avgProgress, 0), 100));

      await db.update(projectObjectives)
        .set({ progress: newProgress, updatedAt: new Date() })
        .where(eq(projectObjectives.id, existing.objectiveId));
    }

    const [updated] = await db.select().from(keyResults).where(eq(keyResults.id, id));
    eventBus.emit({ type: 'key_result_updated', resourceId: id });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/okr/key-results]', err);
    return NextResponse.json({ error: 'Failed to update key result' }, { status: 500 });
  }
}

// DELETE /api/okr/key-results/[id] - 删除 KeyResult
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [existing] = await db.select().from(keyResults).where(eq(keyResults.id, id));
    if (!existing) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    await db.delete(keyResults).where(eq(keyResults.id, id));

    // 重算 Objective progress
    const allKRs = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.objectiveId, existing.objectiveId));

    if (allKRs.length > 0) {
      const avgProgress = allKRs.reduce((sum, kr) => {
        const ratio = kr.targetValue > 0 ? Math.min((kr.currentValue ?? 0) / kr.targetValue, 1) : 0;
        return sum + ratio * 100;
      }, 0) / allKRs.length;
      const newProgress = Math.round(Math.min(Math.max(avgProgress, 0), 100));
      await db.update(projectObjectives)
        .set({ progress: newProgress, updatedAt: new Date() })
        .where(eq(projectObjectives.id, existing.objectiveId));
    } else {
      await db.update(projectObjectives)
        .set({ progress: 0, updatedAt: new Date() })
        .where(eq(projectObjectives.id, existing.objectiveId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/okr/key-results]', err);
    return NextResponse.json({ error: 'Failed to delete key result' }, { status: 500 });
  }
}
