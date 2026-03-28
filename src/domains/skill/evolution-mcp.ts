/**
 * Skill 进化引擎 MCP Handler
 *
 * v1.1 Phase 1B: 3 个工具
 * - record_skill_experience — 记录 Skill 执行经验
 * - get_skill_experiences — 获取历史经验列表
 * - promote_skill_experience — 晋升经验为 L1 规则
 */

import { db, skillExperiences, skillEvolutionLogs, skills } from '@/db';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { eventBus } from '@/lib/event-bus';
import { appendToL1 } from '@/shared/lib/knowhow-parser';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { HandlerResult } from '@/core/mcp/handler-base';

// ============================================================
// 经验过滤（跳过无意义的记录）
// ============================================================

/** 最短 correction 长度（纯格式调整 / 拼写错误） */
const MIN_CORRECTION_LENGTH = 10;

function shouldFilterOut(correction: string): boolean {
  if (!correction || correction.trim().length === 0) return true;
  if (correction.trim().length < MIN_CORRECTION_LENGTH) return true;
  // 纯格式调整检测：如果 correction 只包含空白字符和标点
  const stripped = correction.replace(/[\s\p{P}]/gu, '');
  if (stripped.length === 0) return true;
  return false;
}

// ============================================================
// record_skill_experience
// ============================================================

export async function handleRecordSkillExperience(
  params: Record<string, unknown>,
): Promise<HandlerResult> {
  const skillId = params.skill_id as string;
  const scenario = params.scenario as string;
  const originalJudgment = params.original_judgment as string | undefined;
  const correction = params.correction as string;
  const reasoning = params.reasoning as string | undefined;
  const source = ((params.source as string) || 'auto_detect') as 'user_correction' | 'auto_detect' | 'manual';
  const taskId = params.task_id as string | undefined;
  const memberId = params.member_id as string | undefined;

  // 参数校验
  if (!skillId) return { success: false, message: 'Missing required parameter: skill_id' };
  if (!scenario) return { success: false, message: 'Missing required parameter: scenario' };
  if (!correction) return { success: false, message: 'Missing required parameter: correction' };

  // 过滤无意义的记录
  if (shouldFilterOut(correction)) {
    // 记录被过滤的日志
    await insertEvolutionLog(skillId, 'experience_filtered', {
      reason: 'correction_too_short_or_empty',
      correctionLength: correction.length,
    }, memberId);

    return {
      success: true,
      message: 'Experience filtered: correction is too short or empty (less than 10 meaningful characters)',
      data: { filtered: true, reason: 'correction_too_short' },
    };
  }

  try {
    const now = new Date();

    // 归并检查：用 scenario 前缀/包含匹配现有记录
    const existingExperiences = await db
      .select()
      .from(skillExperiences)
      .where(
        and(
          eq(skillExperiences.skillId, skillId),
          like(skillExperiences.scenario, `%${scenario.substring(0, Math.min(scenario.length, 30))}%`),
        ),
      )
      .limit(5);

    // 精确匹配：检查是否有 scenario 完全相同或高度相似的记录
    let matched = existingExperiences.find(
      (e) => e.scenario === scenario,
    );

    // 前缀匹配：如果新 scenario 是已有 scenario 的前缀（或反过来）
    if (!matched) {
      matched = existingExperiences.find(
        (e) =>
          e.scenario.startsWith(scenario.substring(0, Math.min(scenario.length, 20))) ||
          scenario.startsWith(e.scenario.substring(0, Math.min(e.scenario.length, 20))),
      );
    }

    if (matched) {
      // 归并：增加计数，更新时间
      await db
        .update(skillExperiences)
        .set({
          occurrenceCount: sql`${skillExperiences.occurrenceCount} + 1`,
          lastOccurredAt: now,
          updatedAt: now,
          // 如果新的 correction 更详细，更新它
          ...(correction.length > (matched.correction?.length || 0)
            ? { correction, reasoning: reasoning || matched.reasoning }
            : {}),
        })
        .where(eq(skillExperiences.id, matched.id));

      const newCount = (matched.occurrenceCount || 1) + 1;

      // 记录归并日志
      await insertEvolutionLog(
        skillId,
        'experience_merged',
        {
          experienceId: matched.id,
          newCount,
          scenario,
        },
        memberId,
      );

      // 发射 SSE 事件
      emitSkillEvent('skill_experience_recorded', skillId, {
        experienceId: matched.id,
        merged: true,
        occurrenceCount: newCount,
      });

      const promotionHint =
        newCount >= 3
          ? `\n\n⚠️ This experience has occurred ${newCount} times. Consider promoting it to an L1 rule using promote_skill_experience.`
          : '';

      return {
        success: true,
        message: `Experience merged into existing record (count: ${newCount})${promotionHint}`,
        data: {
          experienceId: matched.id,
          merged: true,
          occurrenceCount: newCount,
          promotedToL1: matched.promotedToL1,
          promotionSuggested: newCount >= 3 && !matched.promotedToL1,
        },
      };
    }

    // 创建新记录
    const experienceId = generateId();
    await db.insert(skillExperiences).values({
      id: experienceId,
      skillId,
      scenario,
      originalJudgment,
      correction,
      reasoning,
      occurrenceCount: 1,
      lastOccurredAt: now,
      source,
      taskId,
      memberId,
      createdAt: now,
      updatedAt: now,
    });

    // 更新 skills 表的 experienceCount（通过直接查询计算）
    await updateSkillExperienceCount(skillId);

    // 记录日志
    await insertEvolutionLog(
      skillId,
      'experience_recorded',
      {
        experienceId,
        scenario,
        source,
      },
      memberId,
    );

    // 发射 SSE 事件
    emitSkillEvent('skill_experience_recorded', skillId, {
      experienceId,
      merged: false,
      occurrenceCount: 1,
    });

    return {
      success: true,
      message: 'Experience recorded successfully',
      data: {
        experienceId,
        merged: false,
        occurrenceCount: 1,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to record experience: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================
// get_skill_experiences
// ============================================================

export async function handleGetSkillExperiences(
  params: Record<string, unknown>,
): Promise<HandlerResult> {
  const skillId = params.skill_id as string;
  const limit = (params.limit as number) || 20;
  const includePromoted = params.include_promoted as boolean;

  if (!skillId) return { success: false, message: 'Missing required parameter: skill_id' };

  try {
    const conditions = [eq(skillExperiences.skillId, skillId)];
    if (!includePromoted) {
      // 默认只返回未晋升的
      // 注意：Drizzle 的 boolean 比较
    }

    const experiences = await db
      .select()
      .from(skillExperiences)
      .where(and(...conditions))
      .orderBy(desc(skillExperiences.occurrenceCount), desc(skillExperiences.lastOccurredAt))
      .limit(Math.min(limit, 50));

    // 格式化为「场景 → 修正」格式
    const formatted = experiences.map((exp) => ({
      id: exp.id,
      scenario: exp.scenario,
      correction: exp.correction,
      originalJudgment: exp.originalJudgment,
      reasoning: exp.reasoning,
      occurrenceCount: exp.occurrenceCount,
      lastOccurredAt: exp.lastOccurredAt?.toISOString(),
      promotedToL1: exp.promotedToL1,
      summary: `${exp.scenario} → ${exp.correction}`,
    }));

    return {
      success: true,
      message: `Retrieved ${experiences.length} experiences for skill`,
      data: {
        experiences: formatted,
        total: experiences.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get experiences: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================
// promote_skill_experience
// ============================================================

export async function handlePromoteSkillExperience(
  params: Record<string, unknown>,
): Promise<HandlerResult> {
  const experienceId = params.experience_id as string;
  const memberId = params.member_id as string | undefined;

  if (!experienceId) {
    return { success: false, message: 'Missing required parameter: experience_id' };
  }

  try {
    // 查找经验记录
    const [experience] = await db
      .select()
      .from(skillExperiences)
      .where(eq(skillExperiences.id, experienceId))
      .limit(1);

    if (!experience) {
      return { success: false, message: `Experience not found: ${experienceId}` };
    }

    if (experience.promotedToL1) {
      return {
        success: true,
        message: 'Experience already promoted to L1',
        data: {
          experienceId: experience.id,
          promotedAt: experience.promotedAt?.toISOString(),
        },
      };
    }

    const now = new Date();

    // 标记晋升
    await db
      .update(skillExperiences)
      .set({
        promotedToL1: true,
        promotedAt: now,
        updatedAt: now,
      })
      .where(eq(skillExperiences.id, experienceId));

    // 计算已晋升的总数（当前 +1）
    const promotedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(skillExperiences)
      .where(
        and(
          eq(skillExperiences.skillId, experience.skillId),
          eq(skillExperiences.promotedToL1, true),
        ),
      )
      .then((rows) => Number(rows[0]?.count || 0));

    // 更新 skills 表：晋升计数和最后晋升时间
    await db
      .update(skills)
      .set({
        promotedRuleCount: promotedCount,
        lastPromotedAt: now,
        updatedAt: now,
      })
      .where(eq(skills.id, experience.skillId));

    // 记录日志
    await insertEvolutionLog(
      experience.skillId,
      'promoted_to_l1',
      {
        experienceId,
        scenario: experience.scenario,
        correction: experience.correction,
        occurrenceCount: experience.occurrenceCount,
        promotedRuleCount: promotedCount,
      },
      memberId,
    );

    // 发射 SSE 事件
    emitSkillEvent('skill_experience_promoted', experience.skillId, {
      experienceId,
      scenario: experience.scenario,
      promotedRuleCount: promotedCount,
    });

    // 尝试写入 SKILL.md L1 区域（不可变操作，不影响 DB 晋升结果）
    let skillMdUpdated = false;
    try {
      const [skillInfo] = await db
        .select({ skillPath: skills.skillPath })
        .from(skills)
        .where(eq(skills.id, experience.skillId))
        .limit(1);

      if (skillInfo?.skillPath) {
        const skillMdPath = path.join(skillInfo.skillPath, 'SKILL.md');
        const currentContent = await readFile(skillMdPath, 'utf-8');
        const updatedContent = appendToL1(currentContent, experience.correction, experience.scenario);
        await writeFile(skillMdPath, updatedContent, 'utf-8');
        skillMdUpdated = true;
      }
    } catch (err) {
      // SKILL.md 写入失败不影响晋升结果（DB 已标记成功）
      console.warn('[SkillEvolution] Failed to write SKILL.md L1:', err instanceof Error ? err.message : err);
    }

    return {
      success: true,
      message: `Experience promoted to L1 rule successfully (total promoted rules: ${promotedCount}${skillMdUpdated ? ', SKILL.md updated' : ', SKILL.md write skipped (no path or error)'})`,
      data: {
        experienceId: experience.id,
        scenario: experience.scenario,
        correction: experience.correction,
        promotedAt: now.toISOString(),
        promotedRuleCount: promotedCount,
        skillMdUpdated,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to promote experience: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 插入进化日志 */
async function insertEvolutionLog(
  skillId: string,
  action: 'experience_recorded' | 'experience_merged' | 'promoted_to_l1' | 'health_check' | 'experience_filtered',
  detail: Record<string, unknown>,
  triggeredBy?: string,
) {
  await db.insert(skillEvolutionLogs).values({
    id: generateId(),
    skillId,
    action,
    detail,
    triggeredBy,
    createdAt: new Date(),
  });

  // 发射进化日志 SSE 事件
  emitSkillEvent('skill_evolution_log', skillId, {
    action,
    detail,
    triggeredBy,
  });
}

/** 更新 skill 的 experienceCount（聚合查询） */
async function updateSkillExperienceCount(skillId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(skillExperiences)
    .where(eq(skillExperiences.skillId, skillId))
    .then((rows) => Number(rows[0]?.count || 0));

  // 更新 skills 表的 experienceCount 字段（v1.1 Phase 1A 新增）
  await db
    .update(skills)
    .set({ experienceCount: result, updatedAt: new Date() })
    .where(eq(skills.id, skillId));
}

/** 发射 Skill 相关 SSE 事件 */
function emitSkillEvent(
  type: 'skill_experience_recorded' | 'skill_experience_promoted' | 'skill_evolution_log',
  skillId: string,
  data: Record<string, unknown>,
) {
  try {
    eventBus.emit({
      type: type as any,
      resourceId: skillId,
      data,
    });
  } catch (error) {
    console.error('[SkillEvolution] Failed to emit SSE event:', error);
  }
}
