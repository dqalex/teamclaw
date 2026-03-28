import { db } from '@/db/index';
import { proactiveEvents, eventLogs, tasks } from '@/db/schema';
import { eq, and, desc, sql, gte, count, sum } from 'drizzle-orm';
import { eventBus } from '@/shared/lib/event-bus';

// get_proactive_events
export async function handleGetProactiveEvents(params: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const status = (params.status as string) || 'triggered';
  const severity = params.severity as string | undefined;
  const projectId = params.project_id as string | undefined;
  const limit = Math.min((params.limit as number) || 20, 100);

  const conditions = [];
  if (status !== 'all') conditions.push(eq(proactiveEvents.status, status as 'triggered' | 'acted' | 'dismissed' | 'failed'));
  if (severity) conditions.push(eq(proactiveEvents.severity, severity as 'info' | 'warning' | 'critical'));
  if (projectId) conditions.push(eq(proactiveEvents.projectId, projectId));

  const events = await db.select()
    .from(proactiveEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(proactiveEvents.createdAt))
    .limit(limit);

  return {
    success: true,
    data: {
      events,
      total: events.length,
    },
  };
}

// dismiss_proactive_event
export async function handleDismissProactiveEvent(params: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const eventId = params.event_id as string;
  const reason = params.reason as string | undefined;

  if (!eventId) {
    return { success: false, error: 'event_id is required' };
  }

  const [event] = await db.select().from(proactiveEvents).where(eq(proactiveEvents.id, eventId));
  if (!event) {
    return { success: false, error: 'Proactive event not found' };
  }

  await db.update(proactiveEvents)
    .set({ status: 'dismissed', actedAt: new Date() })
    .where(eq(proactiveEvents.id, eventId));

  eventBus.emit({
    type: 'proactive_event_dismissed',
    resourceId: eventId,
    data: { eventId, reason },
  });

  return { success: true, data: { eventId, status: 'dismissed' } };
}

// get_analytics_summary
export async function handleGetAnalyticsSummary(params: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const projectId = params.project_id as string | undefined;
  const period = (params.period as string) || 'week';
  const groupBy = (params.group_by as string) || 'agent';

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

  // Token 归因查询
  const tokenConditions = [gte(eventLogs.createdAt, periodStart)];
  if (projectId) tokenConditions.push(eq(eventLogs.projectId, projectId));

  const tokenResult = await db.select({
    totalTokens: sum(eventLogs.tokenCount),
    totalCost: sum(eventLogs.tokenCost),
    eventCount: count(),
  })
    .from(eventLogs)
    .where(and(...tokenConditions));

  // 按维度分组
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

  return {
    success: true,
    data: {
      totalTokens: tokenResult[0]?.totalTokens || 0,
      totalCost: tokenResult[0]?.totalCost || 0,
      eventCount: tokenResult[0]?.eventCount || 0,
      taskCount: taskResult[0]?.total || 0,
      completedTasks: taskResult[0]?.completed || 0,
      agentStats,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    },
  };
}
