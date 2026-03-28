import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { keyResultTasks, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isValidId } from '@/lib/security';

export const dynamic = 'force-dynamic';

// GET /api/okr/key-results/[id]/tasks - 获取关联的 Task 列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const relations = await db
      .select({ taskId: keyResultTasks.taskId })
      .from(keyResultTasks)
      .where(eq(keyResultTasks.keyResultId, id));

    if (relations.length === 0) {
      return NextResponse.json([]);
    }

    const taskIds = relations.map(r => r.taskId);
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskIds[0]));

    // 由于 drizzle eq 不支持 in 数组，手动查询
    const allTasks: typeof result = [];
    for (const taskId of taskIds) {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
      if (task) allTasks.push(task);
    }

    return NextResponse.json(allTasks);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch linked tasks' }, { status: 500 });
  }
}

// POST /api/okr/key-results/[id]/tasks - 关联 Task 到 KeyResult
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { task_id } = body;

    if (!task_id || !isValidId(task_id)) {
      return NextResponse.json({ error: 'task_id is required and must be valid' }, { status: 400 });
    }

    // 检查是否已关联
    const [existing] = await db
      .select()
      .from(keyResultTasks)
      .where(eq(keyResultTasks.keyResultId, id))
      .all()
      .find(r => r.taskId === task_id) ? [{ keyResultId: '', taskId: '' }] : [];

    // 手动检查重复
    const all = await db
      .select()
      .from(keyResultTasks)
      .where(eq(keyResultTasks.keyResultId, id));

    const alreadyLinked = all.some(r => r.taskId === task_id);
    if (alreadyLinked) {
      return NextResponse.json({ error: 'Task is already linked to this key result' }, { status: 409 });
    }

    await db.insert(keyResultTasks).values({ keyResultId: id, taskId: task_id });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/okr/key-results/tasks]', err);
    return NextResponse.json({ error: 'Failed to link task' }, { status: 500 });
  }
}
