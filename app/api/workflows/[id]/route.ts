import { db } from '@/db';
import { NextRequest, NextResponse } from 'next/server';
import { workflows, workflowRuns, tasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { isValidId } from '@/lib/security';
import { eventBus } from '@/shared/lib/event-bus';

export const dynamic = 'force-dynamic';

// PUT 允许更新的字段白名单
const ALLOWED_FIELDS = new Set([
  'name',
  'description',
  'nodes',
  'entryNodeId',
  'projectId',
  'status',
]);

// GET /api/workflows/[id] - 获取 Workflow 详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid workflow ID format' }, { status: 400 });
  }

  try {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error(`[GET /api/workflows/${id}] Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
  }
}

// PUT /api/workflows/[id] - 更新 Workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid workflow ID format' }, { status: 400 });
  }

  try {
    // 校验资源存在
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // 白名单过滤
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    await db
      .update(workflows)
      .set(updateData)
      .where(eq(workflows.id, id));

    const [updated] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`[PUT /api/workflows/${id}] Error:`, error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

// DELETE /api/workflows/[id] - 删除 Workflow
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid workflow ID format' }, { status: 400 });
  }

  try {
    // 校验资源存在
    const [existing] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // 级联删除：清理关联的 workflowRuns + tasks 的外键引用
    await db.transaction(async (tx) => {
      await tx.delete(workflowRuns).where(eq(workflowRuns.workflowId, id));
      await tx.update(tasks).set({ workflowId: null, workflowRunId: null }).where(eq(tasks.workflowId, id));
      await tx.delete(workflows).where(eq(workflows.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/workflows/${id}] Error:`, error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}
