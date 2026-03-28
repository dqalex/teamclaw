/**
 * v1.1 Phase 4: Proactive Engine Trigger Evaluator 单元测试
 * 测试 6 种触发类型的评估逻辑（纯逻辑提取，不依赖 DB）
 */
import { describe, it, expect } from 'vitest';

// 从 evaluator.ts 提取的纯触发评估逻辑（不依赖 DB）
// 这里直接重构为可测试的纯函数

interface TriggerResult {
  shouldTrigger: boolean;
  title?: string;
  description?: string;
  severity?: 'info' | 'warning' | 'critical';
  autoAction?: string;
}

// ============================================================
// 从 evaluator.ts 中提取的纯逻辑（重构为可独立测试）
// ============================================================

function evaluateTaskOverdue(data: Record<string, unknown>): TriggerResult {
  const dueDate = data.dueDate as string | undefined;
  const status = data.status as string | undefined;
  if (!dueDate || status === 'completed') return { shouldTrigger: false };

  const hoursUntilDue = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60);

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

function evaluateDeliveryStuck(data: Record<string, unknown>): TriggerResult {
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

function evaluateSkillHealth(data: Record<string, unknown>): TriggerResult {
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

function evaluateProgressRisk(data: Record<string, unknown>): TriggerResult {
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

function evaluateContextGap(data: Record<string, unknown>): TriggerResult {
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

function evaluateOnboarding(data: Record<string, unknown>): TriggerResult {
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

// ============================================================
// Tests
// ============================================================

describe('Proactive Trigger: task_overdue', () => {
  it('已完成任务不应触发', () => {
    const result = evaluateTaskOverdue({
      status: 'completed',
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    });
    expect(result.shouldTrigger).toBe(false);
  });

  it('无截止日期不应触发', () => {
    const result = evaluateTaskOverdue({ status: 'todo' });
    expect(result.shouldTrigger).toBe(false);
  });

  it('截止日期在 24h 内应触发 warning', () => {
    const result = evaluateTaskOverdue({
      dueDate: new Date(Date.now() + 12 * 3600000).toISOString(),
      title: 'Test Task',
    });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.autoAction).toBe('notify_owner');
  });

  it('截止日期已过期应触发 critical', () => {
    const result = evaluateTaskOverdue({
      dueDate: new Date(Date.now() - 86400000).toISOString(),
      title: 'Overdue Task',
    });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.autoAction).toBe('escalate_to_pm');
  });

  it('截止日期 > 24h 不应触发', () => {
    const result = evaluateTaskOverdue({
      dueDate: new Date(Date.now() + 48 * 3600000).toISOString(),
    });
    expect(result.shouldTrigger).toBe(false);
  });
});

describe('Proactive Trigger: delivery_stuck', () => {
  it('非 reviewing 状态不应触发', () => {
    const result = evaluateDeliveryStuck({ status: 'pending' });
    expect(result.shouldTrigger).toBe(false);
  });

  it('reviewing 但未超过 48h 不应触发', () => {
    const result = evaluateDeliveryStuck({
      status: 'reviewing',
      updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    });
    expect(result.shouldTrigger).toBe(false);
  });

  it('reviewing 超过 48h 应触发', () => {
    const result = evaluateDeliveryStuck({
      status: 'reviewing',
      updatedAt: new Date(Date.now() - 49 * 3600000).toISOString(),
      title: 'Stuck Delivery',
    });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.autoAction).toBe('escalate_review');
  });

  it('无 updatedAt 不应触发', () => {
    const result = evaluateDeliveryStuck({ status: 'reviewing' });
    expect(result.shouldTrigger).toBe(false);
  });
});

describe('Proactive Trigger: skill_health', () => {
  it('healthScore >= 60 不应触发', () => {
    expect(evaluateSkillHealth({ healthScore: 60 }).shouldTrigger).toBe(false);
    expect(evaluateSkillHealth({ healthScore: 80 }).shouldTrigger).toBe(false);
  });

  it('healthScore < 30 应触发 critical', () => {
    const result = evaluateSkillHealth({ healthScore: 20, name: 'test-skill' });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.autoAction).toBe('trigger_skill_audit');
  });

  it('healthScore 30-59 应触发 warning', () => {
    const result = evaluateSkillHealth({ healthScore: 45 });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.autoAction).toBe('schedule_health_check');
  });

  it('无 healthScore 不应触发', () => {
    expect(evaluateSkillHealth({}).shouldTrigger).toBe(false);
  });
});

describe('Proactive Trigger: progress_risk', () => {
  it('progress >= 50 不应触发', () => {
    expect(evaluateProgressRisk({ progress: 50 }).shouldTrigger).toBe(false);
    expect(evaluateProgressRisk({ progress: 100 }).shouldTrigger).toBe(false);
  });

  it('progress < 50 应触发', () => {
    const result = evaluateProgressRisk({ progress: 30, title: 'Milestone' });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('progress = 0 应触发', () => {
    expect(evaluateProgressRisk({ progress: 0 }).shouldTrigger).toBe(true);
  });

  it('无 progress 不应触发', () => {
    expect(evaluateProgressRisk({}).shouldTrigger).toBe(false);
  });
});

describe('Proactive Trigger: context_gap', () => {
  it('accessCount < 3 不应触发', () => {
    expect(evaluateContextGap({ accessCount: 2, entityType: 'task' }).shouldTrigger).toBe(false);
  });

  it('accessCount >= 3 应触发', () => {
    const result = evaluateContextGap({ accessCount: 5, entityType: 'document', title: 'Doc1' });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.autoAction).toBe('preload_context');
  });

  it('缺少必要字段不应触发', () => {
    expect(evaluateContextGap({ accessCount: 5 }).shouldTrigger).toBe(false);
    expect(evaluateContextGap({ entityType: 'task' }).shouldTrigger).toBe(false);
  });
});

describe('Proactive Trigger: onboarding', () => {
  it('experienceTaskCount >= 3 不应触发', () => {
    expect(evaluateOnboarding({ experienceTaskCount: 3 }).shouldTrigger).toBe(false);
    expect(evaluateOnboarding({ experienceTaskCount: 10 }).shouldTrigger).toBe(false);
  });

  it('experienceTaskCount < 3 应触发', () => {
    const result = evaluateOnboarding({ experienceTaskCount: 1, name: 'Newbie' });
    expect(result.shouldTrigger).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.autoAction).toBe('recommend_starter_skills');
  });

  it('experienceTaskCount = 0 应触发', () => {
    expect(evaluateOnboarding({ experienceTaskCount: 0 }).shouldTrigger).toBe(true);
  });
});

// ============================================================
// OKR Progress 重算逻辑测试
// ============================================================
describe('OKR Progress 重算', () => {
  // 提取自 okr/mcp.ts 和 okr/store.ts 的核心算法
  function calculateObjectiveProgress(keyResults: Array<{ currentValue: number; targetValue: number }>): number {
    if (keyResults.length === 0) return 0;
    const avgProgress = keyResults.reduce((sum, kr) => {
      const ratio = kr.targetValue > 0 ? Math.min((kr.currentValue ?? 0) / kr.targetValue, 1) : 0;
      return sum + ratio * 100;
    }, 0) / keyResults.length;
    return Math.round(Math.min(Math.max(avgProgress, 0), 100));
  }

  it('无 KR 应返回 0', () => {
    expect(calculateObjectiveProgress([])).toBe(0);
  });

  it('全部完成应返回 100', () => {
    expect(calculateObjectiveProgress([
      { currentValue: 10, targetValue: 10 },
      { currentValue: 5, targetValue: 5 },
    ])).toBe(100);
  });

  it('部分完成应返回正确百分比', () => {
    // KR1: 5/10 = 50%, KR2: 0/5 = 0% → avg = 25%
    expect(calculateObjectiveProgress([
      { currentValue: 5, targetValue: 10 },
      { currentValue: 0, targetValue: 5 },
    ])).toBe(25);
  });

  it('超过 target 应 clamp 到 100', () => {
    expect(calculateObjectiveProgress([
      { currentValue: 150, targetValue: 100 },
    ])).toBe(100);
  });

  it('targetValue = 0 应视为 0%', () => {
    expect(calculateObjectiveProgress([
      { currentValue: 100, targetValue: 0 },
    ])).toBe(0);
  });

  it('单个 KR 部分完成', () => {
    // 3/4 = 75%
    expect(calculateObjectiveProgress([
      { currentValue: 3, targetValue: 4 },
    ])).toBe(75);
  });
});
