import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { keyResultTasks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// DELETE /api/okr/key-results/[id]/tasks/[taskId] - 解除 KeyResult ↔ Task 关联
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params;

    const deleted = await db
      .delete(keyResultTasks)
      .where(and(eq(keyResultTasks.keyResultId, id), eq(keyResultTasks.taskId, taskId)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/okr/key-results/tasks]', err);
    return NextResponse.json({ error: 'Failed to unlink task' }, { status: 500 });
  }
}
