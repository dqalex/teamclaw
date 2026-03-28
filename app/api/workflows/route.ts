import { db } from '@/db';
import { NextRequest, NextResponse } from 'next/server';
import { workflows, type NewWorkflow, type Workflow } from '@/db/schema';
import type { WorkflowNode } from '@/core/workflow/types';
import { eq, desc, sql, and } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { isValidId } from '@/lib/security';
import { eventBus } from '@/shared/lib/event-bus';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));
  return { page, limit, offset: (page - 1) * limit };
}

// GET /api/workflows - 获取 Workflow 列表
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');

  try {
    if (projectId && !isValidId(projectId)) {
      return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 });
    }

    const { page, limit, offset } = getPaginationParams(searchParams);

    // 构建查询条件
    const conditions: Array<ReturnType<typeof eq>> = [];
    if (projectId) conditions.push(eq(workflows.projectId, projectId));
    if (status) {
    const validStatuses = ['draft', 'published', 'archived'] as const;
    type WorkflowStatus = typeof validStatuses[number];
    if (!validStatuses.includes(status as WorkflowStatus)) {
      return NextResponse.json({ error: 'Invalid status. Must be draft, published, or archived' }, { status: 400 });
    }
    conditions.push(eq(workflows.status, status as WorkflowStatus));
    }

    const whereClause = conditions.length > 0
      ? and(...conditions)
      : undefined;

    // 总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflows)
      .where(whereClause ?? sql`1=1`);

    // 分页查询
    const data = await db
      .select()
      .from(workflows)
      .where(whereClause ?? sql`1=1`)
      .orderBy(desc(workflows.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasMore: offset + data.length < count,
      },
    });
  } catch (error) {
    console.error('[GET /api/workflows] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

// POST /api/workflows - 创建 Workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, projectId, nodes, entryNodeId } = body as {
      name?: string;
      description?: string;
      projectId?: string;
      nodes?: unknown;
      entryNodeId?: string;
    };

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid field: name' }, { status: 400 });
    }
    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Missing or invalid field: nodes' }, { status: 400 });
    }
    if (!entryNodeId || typeof entryNodeId !== 'string') {
      // 新建工作流时允许无入口节点（尚无节点）
      if (Array.isArray(nodes) && nodes.length > 0) {
        return NextResponse.json({ error: 'Missing or invalid field: entryNodeId' }, { status: 400 });
      }
    }

    if (projectId && !isValidId(projectId)) {
      return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 });
    }

    const id = generateId();

    const newWorkflow: NewWorkflow = {
      id,
      name,
      description: description ?? null,
      nodes: nodes as WorkflowNode[],
      entryNodeId,
      projectId: projectId ?? null,
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(workflows).values(newWorkflow);
    const [created] = await db.select().from(workflows).where(eq(workflows.id, id));

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/workflows] Error:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}
