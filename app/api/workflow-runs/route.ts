import { db } from '@/db';
import { NextRequest, NextResponse } from 'next/server';
import { workflowRuns } from '@/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { isValidId } from '@/lib/security';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));
  return { page, limit, offset: (page - 1) * limit };
}

// GET /api/workflow-runs - 获取 Workflow Run 列表
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const workflowId = searchParams.get('workflowId');
  const taskId = searchParams.get('taskId');

  try {
    if (workflowId && !isValidId(workflowId)) {
      return NextResponse.json({ error: 'Invalid workflowId format' }, { status: 400 });
    }
    if (taskId && !isValidId(taskId)) {
      return NextResponse.json({ error: 'Invalid taskId format' }, { status: 400 });
    }

    const { page, limit, offset } = getPaginationParams(searchParams);

    // 构建查询条件
    const conditions: Array<ReturnType<typeof eq>> = [];
    if (workflowId) conditions.push(eq(workflowRuns.workflowId, workflowId));
    if (taskId) conditions.push(eq(workflowRuns.taskId, taskId));

    const whereClause = conditions.length > 0
      ? and(...conditions)
      : undefined;

    // 总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowRuns)
      .where(whereClause ?? sql`1=1`);

    // 分页查询
    const data = await db
      .select()
      .from(workflowRuns)
      .where(whereClause ?? sql`1=1`)
      .orderBy(desc(workflowRuns.createdAt))
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
    console.error('[GET /api/workflow-runs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow runs' }, { status: 500 });
  }
}
