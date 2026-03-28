import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { eventLogs, tasks } from '@/db/schema';
import { eq, and, gte, desc, count, sum, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const period = searchParams.get('period') || 'week';
    const groupBy = searchParams.get('group_by') || 'agent';

    const now = new Date();
    let periodStart: Date;
    switch (period) {
      case 'today':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        periodStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Token 归因
    const tokenConditions = [gte(eventLogs.createdAt, periodStart)];
    if (projectId) tokenConditions.push(eq(eventLogs.projectId, projectId));

    const tokenResult = await db.select({
      totalTokens: sum(eventLogs.tokenCount),
      totalCost: sum(eventLogs.tokenCost),
      eventCount: count(),
    })
      .from(eventLogs)
      .where(and(...tokenConditions));

    // Agent 分组统计
    let agentStats: Array<{ agentId: string; agentName: string; tokenCount: number; completedTasks: number }> = [];
    if (groupBy === 'agent') {
      const agentResult = await db.select({
        actorId: eventLogs.actorId,
        totalTokens: sum(eventLogs.tokenCount),
        eventCount: count(),
      })
        .from(eventLogs)
        .where(and(...tokenConditions))
        .groupBy(eventLogs.actorId)
        .orderBy(desc(sum(eventLogs.tokenCount)))
        .limit(10);

      agentStats = agentResult.map(r => ({
        agentId: r.actorId || 'system',
        agentName: r.actorId || 'System',
        tokenCount: Number(r.totalTokens) || 0,
        completedTasks: r.eventCount || 0,
      }));
    }

    // 任务统计
    const taskConditions = [gte(tasks.createdAt, periodStart)];
    if (projectId) taskConditions.push(eq(tasks.projectId, projectId));

    const taskResult = await db.select({
      total: count(),
      completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
    })
      .from(tasks)
      .where(and(...taskConditions));

    return NextResponse.json({
      totalTokens: tokenResult[0]?.totalTokens || 0,
      totalCost: tokenResult[0]?.totalCost || 0,
      eventCount: tokenResult[0]?.eventCount || 0,
      taskCount: taskResult[0]?.total || 0,
      completedTasks: taskResult[0]?.completed || 0,
      agentStats,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    });
  } catch (error) {
    console.error('[Analytics Summary] Error:', error);
    return NextResponse.json({ error: 'Failed to get analytics summary' }, { status: 500 });
  }
}
