import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projectObjectives, keyResults } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { eventBus } from '@/lib/event-bus';
import { isValidId } from '@/lib/security';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['draft', 'active', 'completed', 'archived'];

// GET /api/okr/objectives - 列出 Objectives
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('project_id');
  const status = searchParams.get('status');

  if (!projectId || !isValidId(projectId)) {
    return NextResponse.json({ error: 'project_id is required and must be valid' }, { status: 400 });
  }

  try {
    const conditions = [eq(projectObjectives.projectId, projectId)];
    if (status && status !== 'all') {
      if (!VALID_STATUS.includes(status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUS.join(', ')}` }, { status: 400 });
      }
      conditions.push(eq(projectObjectives.status, status as 'draft' | 'active' | 'completed' | 'archived'));
    }

    const objectives = await db
      .select()
      .from(projectObjectives)
      .where(and(...conditions))
      .orderBy(desc(projectObjectives.createdAt));

    // 获取每个 Objective 的 KeyResults
    const objectivesWithKRs = await Promise.all(
      objectives.map(async (obj) => {
        const krs = await db
          .select()
          .from(keyResults)
          .where(eq(keyResults.objectiveId, obj.id))
          .orderBy(desc(keyResults.createdAt));
        return { ...obj, keyResults: krs };
      })
    );

    return NextResponse.json(objectivesWithKRs);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch objectives' }, { status: 500 });
  }
}

// POST /api/okr/objectives - 创建 Objective
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, title, description, due_date } = body;

    if (!project_id || !isValidId(project_id)) {
      return NextResponse.json({ error: 'project_id is required and must be valid' }, { status: 400 });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const now = new Date();
    const id = generateId();

    await db.insert(projectObjectives).values({
      id,
      projectId: project_id,
      title: title.trim(),
      description: description?.trim() || null,
      progress: 0,
      dueDate: due_date ? new Date(due_date) : null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(projectObjectives).where(eq(projectObjectives.id, id));
    eventBus.emit({ type: 'objective_created', resourceId: id });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[POST /api/okr/objectives]', err);
    return NextResponse.json({ error: 'Failed to create objective' }, { status: 500 });
  }
}
