/**
 * MCP Handler: OKR 操作
 */

import { db } from '@/db';
import { projectObjectives, keyResults } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { eventBus } from '@/lib/event-bus';

/**
 * 创建 Objective
 */
export async function handleCreateObjective(params: Record<string, unknown>) {
  const { project_id, title, description, due_date } = params as {
    project_id: string;
    title: string;
    description?: string;
    due_date?: string;
  };

  if (!project_id || !title) {
    return { success: false, error: 'project_id and title are required' };
  }

  try {
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

    return {
      success: true,
      data: {
        id: created.id,
        projectId: created.projectId,
        title: created.title,
        description: created.description,
        progress: created.progress,
        dueDate: created.dueDate,
        status: created.status,
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to create objective: ${String(err)}` };
  }
}

/**
 * 更新 Key Result（自动重算 Objective progress）
 */
export async function handleUpdateKeyResult(params: Record<string, unknown>) {
  const { key_result_id, current_value, status } = params as {
    key_result_id: string;
    current_value?: number;
    status?: string;
  };

  if (!key_result_id) {
    return { success: false, error: 'key_result_id is required' };
  }

  try {
    const [existing] = await db.select().from(keyResults).where(eq(keyResults.id, key_result_id));
    if (!existing) {
      return { success: false, error: 'Key result not found' };
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (current_value !== undefined) updateData.currentValue = current_value;
    if (status !== undefined) updateData.status = status;

    await db.update(keyResults).set(updateData).where(eq(keyResults.id, key_result_id));

    // 重算 Objective progress
    const allKRs = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.objectiveId, existing.objectiveId));

    if (allKRs.length > 0) {
      const avgProgress = allKRs.reduce((sum, kr) => {
        const ratio = kr.targetValue > 0 ? Math.min((kr.currentValue ?? 0) / kr.targetValue, 1) : 0;
        return sum + ratio * 100;
      }, 0) / allKRs.length;
      const newProgress = Math.round(Math.min(Math.max(avgProgress, 0), 100));

      await db.update(projectObjectives)
        .set({ progress: newProgress, updatedAt: new Date() })
        .where(eq(projectObjectives.id, existing.objectiveId));
    }

    const [updated] = await db.select().from(keyResults).where(eq(keyResults.id, key_result_id));
    eventBus.emit({ type: 'key_result_updated', resourceId: key_result_id });

    return {
      success: true,
      data: {
        id: updated.id,
        objectiveId: updated.objectiveId,
        title: updated.title,
        currentValue: updated.currentValue,
        targetValue: updated.targetValue,
        unit: updated.unit,
        status: updated.status,
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to update key result: ${String(err)}` };
  }
}

/**
 * 获取项目 Objectives（含 Key Results）
 */
export async function handleGetObjectives(params: Record<string, unknown>) {
  const { project_id, status } = params as {
    project_id: string;
    status?: string;
  };

  if (!project_id) {
    return { success: false, error: 'project_id is required' };
  }

  try {
    const conditions = [eq(projectObjectives.projectId, project_id)];
    if (status && status !== 'all') {
      const validStatuses = ['active', 'completed', 'archived'] as const;
      const safeStatus = validStatuses.includes(status as typeof validStatuses[number])
        ? (status as typeof validStatuses[number])
        : 'active';
      conditions.push(eq(projectObjectives.status, safeStatus));
    }

    const objectives = await db
      .select()
      .from(projectObjectives)
      .where(and(...conditions))
      .orderBy(desc(projectObjectives.createdAt));

    const objectivesWithKRs = await Promise.all(
      objectives.map(async (obj) => {
        const krs = await db
          .select()
          .from(keyResults)
          .where(eq(keyResults.objectiveId, obj.id))
          .orderBy(desc(keyResults.createdAt));
        return {
          id: obj.id,
          projectId: obj.projectId,
          title: obj.title,
          description: obj.description,
          progress: obj.progress,
          dueDate: obj.dueDate,
          status: obj.status,
          keyResults: krs.map(kr => ({
            id: kr.id,
            title: kr.title,
            description: kr.description,
            targetValue: kr.targetValue,
            currentValue: kr.currentValue,
            unit: kr.unit,
            status: kr.status,
          })),
        };
      })
    );

    return {
      success: true,
      data: objectivesWithKRs,
    };
  } catch (err) {
    return { success: false, error: `Failed to get objectives: ${String(err)}` };
  }
}
