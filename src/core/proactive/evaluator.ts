/**
 * Proactive Rule Evaluator + Action Executor
 * 评估事件是否触发规则，生成 proactive_events，并执行自动响应动作
 */
import { db } from '@/db/index';
import { proactiveRules, proactiveEvents, eventLogs } from '@/db/schema';
import { generateId } from '@/lib/id';
import { and, eq, gt } from 'drizzle-orm';
import { eventBus } from '@/shared/lib/event-bus';

// 事件类型到触发类型的映射
const EVENT_TO_TRIGGER_MAP: Partial<Record<string, string[]>> = {
  task_update: ['task_overdue', 'progress_risk'],
  delivery_update: ['delivery_stuck'],
  skill_update: ['skill_health'],
  project_update: ['progress_risk'],
  milestone_update: ['progress_risk'],
  workflow_run_failed: ['task_overdue'],
  member_update: ['onboarding'],
};

export async function evaluateProactiveRules(
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  const triggerTypes = EVENT_TO_TRIGGER_MAP[eventType];
  if (!triggerTypes || triggerTypes.length === 0) return;

  // 查找启用的规则
  const projectId = data.projectId as string | undefined;
  const conditions = [eq(proactiveRules.enabled, true)];
  if (projectId) conditions.push(eq(proactiveRules.projectId, projectId));

  const rules = await db.select().from(proactiveRules).where(and(...conditions));
  const matchingRules = rules.filter(r => triggerTypes.includes(r.triggerType));

  for (const rule of matchingRules) {
    await evaluateSingleRule(rule, eventType, data);
  }
}

async function evaluateSingleRule(
  rule: typeof proactiveRules.$inferSelect,
  _eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  // 冷却检查
  if (rule.cooldownMinutes && rule.cooldownMinutes > 0) {
    const cooldownDate = new Date(Date.now() - rule.cooldownMinutes * 60 * 1000);
    const recentEvent = await db.select({ id: proactiveEvents.id }).from(proactiveEvents)
      .where(
        and(
          eq(proactiveEvents.ruleId, rule.id),
          gt(proactiveEvents.createdAt, cooldownDate),
        )
      )
      .limit(1);
    if (recentEvent.length > 0) return;
  }

  // 根据触发类型评估
  const result = await evaluateTrigger(rule.triggerType, data);
  if (!result.shouldTrigger) return;

  // 创建 proactive event
  const eventId = generateId();
  const insertData: Record<string, unknown> = {
    id: eventId,
    ruleId: rule.id,
    ruleName: rule.name,
    triggerType: rule.triggerType,
    severity: result.severity || 'warning',
    title: result.title,
    description: result.description,
    triggerData: data,
    actionTaken: result.autoAction || null,
    createdAt: new Date(),
  };
  if (data.projectId) insertData.projectId = data.projectId;
  await db.insert(proactiveEvents).values(insertData as any);

  // ActionExecutor：记录 event log（异步，不阻塞）
  recordEventLog({
    eventType: `proactive.${rule.triggerType}`,
    entityType: 'proactive_event',
    entityId: eventId,
    actorType: 'system',
    projectId: data.projectId as string | undefined,
    payload: { ruleId: rule.id, triggerType: rule.triggerType, severity: result.severity, autoAction: result.autoAction },
  }).catch((err) => {
    // 非关键路径：事件记录失败不影响主流程
    console.debug('[ProactiveEvaluator] Failed to emit SSE event:', err);
  });

  // 发送 SSE 事件
  eventBus.emit({
    type: 'proactive_event_triggered',
    resourceId: eventId,
    data: { eventId, ruleId: rule.id, triggerType: rule.triggerType, severity: result.severity, autoAction: result.autoAction },
  });
}

// ============================================================
// ActionExecutor：自动记录 event log
// ============================================================

interface EventLogInput {
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: 'user' | 'agent' | 'system';
  actorId?: string;
  projectId?: string;
  payload?: Record<string, unknown>;
}

async function recordEventLog(input: EventLogInput): Promise<void> {
  try {
    await db.insert(eventLogs).values({
      id: generateId(),
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      actorType: input.actorType,
      actorId: input.actorId,
      payload: input.payload || {},
      projectId: input.projectId,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[ProactiveEngine] Failed to record event log:', err);
  }
}

// ============================================================
// Trigger Evaluator
// ============================================================

interface TriggerResult {
  shouldTrigger: boolean;
  title?: string;
  description?: string;
  severity?: 'info' | 'warning' | 'critical';
  autoAction?: string;
}

async function evaluateTrigger(triggerType: string, data: Record<string, unknown>): Promise<TriggerResult> {
  switch (triggerType) {
    case 'task_overdue': {
      const dueDate = data.dueDate as string | undefined;
      const status = data.status as string | undefined;
      if (!dueDate || status === 'completed') return { shouldTrigger: false };
      const dueTime = new Date(dueDate).getTime();
      const now = Date.now();
      const hoursUntilDue = (dueTime - now) / (1000 * 60 * 60);
      if (hoursUntilDue < 24 && hoursUntilDue > 0) {
        return {
          shouldTrigger: true,
          severity: 'warning',
          title: `Task "${data.title || data.id}" due in ${Math.round(hoursUntilDue)}h`,
          description: `Task is approaching deadline. Due: ${new Date(dueDate).toLocaleString()}`,
          autoAction: 'notify_owner',
        };
      }
      if (hoursUntilDue <= 0) {
        return {
          shouldTrigger: true,
          severity: 'critical',
          title: `Task "${data.title || data.id}" is overdue`,
          description: `Task deadline was ${new Date(dueDate).toLocaleString()}`,
          autoAction: 'escalate_to_pm',
        };
      }
      return { shouldTrigger: false };
    }
    case 'delivery_stuck': {
      const status = data.status as string | undefined;
      const updatedAt = data.updatedAt as string | undefined;
      if (status !== 'reviewing' || !updatedAt) return { shouldTrigger: false };
      const hoursSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate > 48) {
        return {
          shouldTrigger: true,
          severity: 'warning',
          title: `Delivery "${data.title || data.id}" stuck in review`,
          description: `Delivery has been in reviewing status for ${Math.round(hoursSinceUpdate)}h`,
          autoAction: 'escalate_review',
        };
      }
      return { shouldTrigger: false };
    }
    case 'skill_health': {
      const healthScore = data.healthScore as number | undefined;
      if (healthScore === undefined || healthScore >= 60) return { shouldTrigger: false };
      return {
        shouldTrigger: true,
        severity: healthScore < 30 ? 'critical' : 'warning',
        title: `Skill "${data.name || data.id}" health score: ${healthScore}`,
        description: healthScore < 30 ? 'Skill needs immediate attention' : 'Skill health is declining',
        autoAction: healthScore < 30 ? 'trigger_skill_audit' : 'schedule_health_check',
      };
    }
    case 'progress_risk': {
      const progress = data.progress as number | undefined;
      if (progress === undefined || progress >= 50) return { shouldTrigger: false };
      return {
        shouldTrigger: true,
        severity: 'info',
        title: `Milestone "${data.title || data.id}" progress risk`,
        description: `Progress is at ${progress}%, consider reviewing timeline`,
        autoAction: 'notify_stakeholders',
      };
    }
    case 'context_gap': {
      // 上下文断层：同一实体被频繁访问但无产出
      const accessCount = data.accessCount as number | undefined;
      const entityType = data.entityType as string | undefined;
      if (!accessCount || !entityType || accessCount < 3) return { shouldTrigger: false };
      return {
        shouldTrigger: true,
        severity: 'info',
        title: `Context gap detected for ${entityType}`,
        description: `${entityType} "${data.title || data.id}" accessed ${accessCount} times without output`,
        autoAction: 'preload_context',
      };
    }
    case 'onboarding': {
      // 新人上手：成员经验任务数不足
      const experienceTaskCount = data.experienceTaskCount as number | undefined;
      if (experienceTaskCount === undefined || experienceTaskCount >= 3) return { shouldTrigger: false };
      return {
        shouldTrigger: true,
        severity: 'info',
        title: `New member "${data.name || data.id}" needs guidance`,
        description: `Member has only ${experienceTaskCount} completed tasks`,
        autoAction: 'recommend_starter_skills',
      };
    }
    default:
      return { shouldTrigger: false };
  }
}
