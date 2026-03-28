/**
 * WorkflowEngine 核心
 * v1.1 Phase 2A: DAG 工作流引擎
 *
 * 负责管理 Workflow 的生命周期：启动、推进、暂停、恢复、断点续执行
 * 支持节点类型：sop, condition, loop, parallel, workflow_call, ai_auto, input, render
 * 不直接执行 AI/渲染逻辑（由 MCP handler 在上层调用）
 */

import { db } from '@/db';
import { workflows, workflowRuns } from '@/db/schema';
import type { SOPStage } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import type {
  WorkflowNode,
  WorkflowRunStatus,
  WorkflowContext,
  WorkflowNodeRecord,
  NodeRecordStatus,
} from './types';
import { sopToWorkflow } from './sop-compat';
import { evaluateTrust } from './trust-policy';

// ============================================================
// 辅助函数
// ============================================================

/** 获取当前时间字符串（ISO 8601） */
function nowISO(): string {
  return new Date().toISOString();
}

/** 创建节点执行记录 */
function createNodeRecord(
  nodeId: string,
  nodeType: WorkflowNode['type'],
  status: NodeRecordStatus,
): WorkflowNodeRecord {
  const record: WorkflowNodeRecord = {
    nodeId,
    nodeType,
    status,
  };
  if (status === 'active' || status === 'pending') {
    record.startedAt = nowISO();
  }
  return record;
}

/**
 * 安全评估条件表达式
 *
 * 安全校验：
 * 1. 白名单字符：仅允许标识符、运算符、比较符、逻辑符、括号、点号、空格
 * 2. 禁止访问全局对象（this、global、process、require 等）
 * 3. Function 构造器只能访问显式传入的 context 变量
 */
const EXPR_ALLOWED_RE = /^[a-zA-Z_$][\w$]*(\.[\w$]+)*(\s*(===|!==|==|!=|>=|<=|>|<|\+\+|--|\+|-|\*|\/|%|\?|:|&&|\|\||!|,)\s*[a-zA-Z_$][\w$]*(\.[\w$]+)*|\s*(===|!==|==|!=|>=|<=|>|<|\+\+|--|\+|-|\*|\/|%|\?|:|&&|\|\||!|,))*\s*$/;
const EXPR_FORBIDDEN = /\b(this|global|globalThis|process|require|import|eval|Function|constructor|prototype|__proto__|window|document|console)\b/;

function evaluateCondition(expression: string, context: Record<string, unknown>): boolean {
  // 安全检查：禁止访问全局对象和危险关键字
  if (EXPR_FORBIDDEN.test(expression)) {
    console.warn(`[WorkflowEngine] 条件表达式包含禁止关键字，默认返回 false: ${expression}`);
    return false;
  }
  try {
    const sandbox = { ...context };
    const keys = Object.keys(sandbox);
    const values = Object.values(sandbox);
    const fn = new Function(...keys, `"use strict"; return !!(${expression})`);
    return fn(...values);
  } catch {
    console.warn(`[WorkflowEngine] 条件表达式求值失败: ${expression}，默认返回 false`);
    return false;
  }
}

/**
 * 计算循环迭代次数
 * 统计 nodeHistory 中指定节点的 completed 次数
 */
function countLoopIterations(history: WorkflowNodeRecord[], nodeId: string): number {
  return history.filter(r => r.nodeId === nodeId && r.status === 'completed').length;
}

// ============================================================
// WorkflowEngine 类
// ============================================================

export class WorkflowEngine {
  /**
   * 启动 Workflow 执行
   *
   * 创建 workflowRun 记录，设置 currentNodeId 为 entryNodeId
   */
  async start(
    workflowId: string,
    taskId?: string,
    initialContext?: Partial<WorkflowContext>,
  ) {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error(`[WorkflowEngine] Workflow 不存在: ${workflowId}`);
    }

    if (!workflow.entryNodeId) {
      throw new Error(`[WorkflowEngine] Workflow 缺少入口节点: ${workflowId}`);
    }

    const nodes = (workflow.nodes ?? []) as WorkflowNode[];
    const entryNode = nodes.find(n => n.id === workflow.entryNodeId);
    if (!entryNode) {
      throw new Error(`[WorkflowEngine] 入口节点不存在: ${workflow.entryNodeId}`);
    }

    // Trust Policy 评估入口节点
    const trustEval = evaluateTrust(entryNode, {
      taskId,
      projectId: workflow.projectId ?? undefined,
      variables: initialContext?.variables ?? {},
    });

    const runId = generateId();
    const context: WorkflowContext = {
      taskId,
      projectId: workflow.projectId ?? undefined,
      variables: initialContext?.variables ?? {},
    };

    // 初始化循环计数器上下文
    context.variables.__loopCounts = {};

    const nodeHistory: WorkflowNodeRecord[] = [
      createNodeRecord(entryNode.id, entryNode.type, 'active'),
    ];

    // 如果需要审批，标记为 waiting_confirm
    const runStatus = trustEval.requireApproval ? 'paused' : 'running';

    await db.insert(workflowRuns).values({
      id: runId,
      workflowId,
      taskId: taskId ?? null,
      status: runStatus,
      currentNodeId: entryNode.id,
      nodeHistory,
      context: context as unknown as Record<string, unknown>,
      startedAt: new Date(),
      createdAt: new Date(),
    });

    return {
      runId,
      currentNodeId: entryNode.id,
      nodeType: entryNode.type,
      status: runStatus as WorkflowRunStatus,
      requireApproval: trustEval.requireApproval,
      trustReason: trustEval.reason,
    };
  }

  /**
   * 推进 Workflow 到下一个节点
   *
   * 完成 currentNode，根据节点类型决定下一步：
   * - nextNodes 为空 → completed
   * - condition → 条件表达式求值选择分支
   * - loop → 评估 breakCondition，决定继续循环或跳出
   * - parallel → 标记所有分支为 pending
   * - workflow_call → 启动子 Workflow（标记 waiting 状态）
   * - sop(review/ai_with_confirm/input/render) → Trust Policy 决定是否需要等待
   * - 其他 → 线性推进到 nextNodes[0]
   */
  async advance(runId: string, nodeOutput?: unknown) {
    // 获取当前 run
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1);

    if (!run) {
      throw new Error(`[WorkflowEngine] WorkflowRun 不存在: ${runId}`);
    }

    if (run.status !== 'running') {
      throw new Error(`[WorkflowEngine] WorkflowRun 状态不是 running: ${run.status}`);
    }

    // 获取 Workflow 定义
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, run.workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error(`[WorkflowEngine] Workflow 定义不存在: ${run.workflowId}`);
    }

    const nodes = (workflow.nodes ?? []) as WorkflowNode[];
    const history = [...(run.nodeHistory ?? [])] as WorkflowNodeRecord[];
    const context = { ...(run.context ?? {}) } as unknown as WorkflowContext & { variables: Record<string, unknown> };

    // 完成当前节点
    const currentNodeId = run.currentNodeId;
    if (!currentNodeId) {
      throw new Error('[WorkflowEngine] currentNodeId 为空');
    }

    const currentNodeIdx = history.findIndex(r => r.nodeId === currentNodeId && r.status === 'active');
    if (currentNodeIdx === -1) {
      throw new Error(`[WorkflowEngine] 找不到活跃节点: ${currentNodeId}`);
    }

    // 更新当前节点状态为 completed
    history[currentNodeIdx] = {
      ...history[currentNodeIdx],
      status: 'completed',
      completedAt: nowISO(),
      output: nodeOutput,
    };

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      throw new Error(`[WorkflowEngine] 节点定义不存在: ${currentNodeId}`);
    }

    // 将节点输出存入上下文变量
    if (nodeOutput !== undefined) {
      context.variables[`__output_${currentNodeId}`] = nodeOutput;
    }

    // 确定下一个节点
    let nextNodeId: string | null = null;
    let trustRequired = false;
    let trustReason: string | undefined;

    // ---- 无后续节点：Workflow 完成 ----
    if (currentNode.nextNodes.length === 0) {
      return await this.completeWorkflow(runId, history);
    }

    // ---- 循环节点 ----
    if (currentNode.type === 'loop' && currentNode.loop) {
      const loopResult = this.evaluateLoop(currentNode, history, context);
      nextNodeId = loopResult.nextNodeId;

      if (loopResult.iterationCount !== undefined) {
        context.variables.__loopCounts = context.variables.__loopCounts ?? {};
        (context.variables.__loopCounts as Record<string, number>)[currentNode.id] = loopResult.iterationCount;
      }
    }
    // ---- 条件分支节点 ----
    else if (currentNode.type === 'condition' && currentNode.condition) {
      const result = evaluateCondition(currentNode.condition.expression, context.variables);
      nextNodeId = result ? currentNode.condition.trueNext : currentNode.condition.falseNext;
    }
    // ---- 并行节点 ----
    else if (currentNode.type === 'parallel' && currentNode.parallel) {
      const branchNodeIds: string[] = [];
      for (const branch of currentNode.parallel.branches) {
        if (branch.length > 0) {
          branchNodeIds.push(branch[0]);
        }
      }
      for (const branchNodeId of branchNodeIds) {
        const branchNode = nodes.find(n => n.id === branchNodeId);
        if (branchNode) {
          history.push(createNodeRecord(branchNode.id, branchNode.type, 'pending'));
        }
      }
      nextNodeId = branchNodeIds[0] ?? null;
    }
    // ---- 子 Workflow 调用节点 ----
    else if (currentNode.type === 'workflow_call') {
      // workflow_call 节点本身完成，子 Workflow 由上层 MCP handler 启动
      // 推进到下一个节点
      nextNodeId = currentNode.nextNodes[0] ?? null;
    }
    // ---- 默认：线性推进 ----
    else {
      nextNodeId = currentNode.nextNodes[0];
    }

    // 没有下一个节点 → Workflow 完成
    if (!nextNodeId) {
      return await this.completeWorkflow(runId, history);
    }

    // 标记下一个节点为 active
    const nextNode = nodes.find(n => n.id === nextNodeId);
    if (!nextNode) {
      throw new Error(`[WorkflowEngine] 下一个节点定义不存在: ${nextNodeId}`);
    }

    // Trust Policy 评估下一个节点
    const nextContext: WorkflowContext = {
      taskId: context.taskId,
      projectId: context.projectId,
      memberId: context.memberId,
      variables: context.variables,
    };
    const trustEval = evaluateTrust(nextNode, nextContext);

    if (trustEval.requireApproval) {
      // 需要审批：标记为 waiting_confirm 或 waiting_input
      const waitStatus: NodeRecordStatus =
        nextNode.type === 'input' ? 'waiting_input' : 'waiting_confirm';
      history.push(createNodeRecord(nextNode.id, nextNode.type, waitStatus));

      // 将 Workflow Run 暂停（等待人工介入）
      await db
        .update(workflowRuns)
        .set({
          status: 'paused',
          currentNodeId: nextNode.id,
          nodeHistory: history,
          context: context as unknown as Record<string, unknown>,
        })
        .where(eq(workflowRuns.id, runId));

      return {
        runId,
        currentNodeId: nextNode.id,
        nodeType: nextNode.type,
        status: 'paused' as WorkflowRunStatus,
        requireApproval: true,
        trustReason: trustEval.reason,
        waitStatus,
      };
    }

    // 自动推进
    history.push(createNodeRecord(nextNode.id, nextNode.type, 'active'));

    await db
      .update(workflowRuns)
      .set({
        currentNodeId: nextNode.id,
        nodeHistory: history,
        context: context as unknown as Record<string, unknown>,
      })
      .where(eq(workflowRuns.id, runId));

    return {
      runId,
      currentNodeId: nextNode.id,
      nodeType: nextNode.type,
      status: 'running' as WorkflowRunStatus,
    };
  }

  /**
   * 评估循环节点：决定继续循环还是跳出
   */
  private evaluateLoop(
    node: WorkflowNode,
    history: WorkflowNodeRecord[],
    context: { variables: Record<string, unknown> },
  ): { nextNodeId: string | null; iterationCount?: number } {
    if (!node.loop) {
      return { nextNodeId: node.nextNodes[0] ?? null };
    }

    const { maxIterations, breakCondition, bodyNodeId } = node.loop;
    const currentCount = countLoopIterations(history, bodyNodeId) + 1; // +1 因为当前节点刚完成

    // 超过最大迭代次数 → 跳出循环
    if (currentCount >= maxIterations) {
      console.warn(
        `[WorkflowEngine] 循环节点 ${node.id} 达到最大迭代次数 ${maxIterations}，自动跳出`,
      );
      return { nextNodeId: node.nextNodes[0] ?? null, iterationCount: currentCount };
    }

    // 评估 breakCondition → 如果为 true 则跳出循环
    if (breakCondition && evaluateCondition(breakCondition, context.variables)) {
      return { nextNodeId: node.nextNodes[0] ?? null, iterationCount: currentCount };
    }

    // 继续循环：跳转到循环体起始节点
    return { nextNodeId: bodyNodeId, iterationCount: currentCount };
  }

  /**
   * 标记 Workflow 完成并持久化
   */
  private async completeWorkflow(
    runId: string,
    history: WorkflowNodeRecord[],
  ) {
    await db
      .update(workflowRuns)
      .set({
        status: 'completed',
        currentNodeId: null,
        nodeHistory: history,
        completedAt: new Date(),
      })
      .where(eq(workflowRuns.id, runId));

    return {
      runId,
      currentNodeId: null,
      nodeType: null,
      status: 'completed' as WorkflowRunStatus,
    };
  }

  /**
   * 暂停 Workflow 执行
   */
  async pause(runId: string) {
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1);

    if (!run) {
      throw new Error(`[WorkflowEngine] WorkflowRun 不存在: ${runId}`);
    }

    if (run.status !== 'running') {
      throw new Error(`[WorkflowEngine] 只有 running 状态才能暂停: ${run.status}`);
    }

    await db
      .update(workflowRuns)
      .set({ status: 'paused' })
      .where(eq(workflowRuns.id, runId));

    return { runId, status: 'paused' as WorkflowRunStatus };
  }

  /**
   * 恢复 Workflow 执行
   */
  async resume(runId: string) {
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1);

    if (!run) {
      throw new Error(`[WorkflowEngine] WorkflowRun 不存在: ${runId}`);
    }

    if (run.status !== 'paused') {
      throw new Error(`[WorkflowEngine] 只有 paused 状态才能恢复: ${run.status}`);
    }

    await db
      .update(workflowRuns)
      .set({ status: 'running' })
      .where(eq(workflowRuns.id, runId));

    return {
      runId,
      currentNodeId: run.currentNodeId,
      status: 'running' as WorkflowRunStatus,
    };
  }

  /**
   * 从指定节点断点续执行
   *
   * 重置 nodeHistory 到指定节点之前的状态，
   * 将该节点设为 active，后续节点移除。
   */
  async replayFrom(runId: string, nodeId: string) {
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, runId))
      .limit(1);

    if (!run) {
      throw new Error(`[WorkflowEngine] WorkflowRun 不存在: ${runId}`);
    }

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, run.workflowId))
      .limit(1);

    if (!workflow) {
      throw new Error(`[WorkflowEngine] Workflow 定义不存在: ${run.workflowId}`);
    }

    const nodes = (workflow.nodes ?? []) as WorkflowNode[];
    const history = [...(run.nodeHistory ?? [])] as WorkflowNodeRecord[];

    const targetIdx = history.findLastIndex(r => r.nodeId === nodeId);
    if (targetIdx === -1) {
      throw new Error(`[WorkflowEngine] 节点 ${nodeId} 不在执行历史中`);
    }

    const truncatedHistory = history.slice(0, targetIdx);

    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) {
      throw new Error(`[WorkflowEngine] 节点定义不存在: ${nodeId}`);
    }

    truncatedHistory.push(createNodeRecord(nodeId, targetNode.type, 'active'));

    await db
      .update(workflowRuns)
      .set({
        status: 'running',
        currentNodeId: nodeId,
        nodeHistory: truncatedHistory,
      })
      .where(eq(workflowRuns.id, runId));

    return {
      runId,
      currentNodeId: nodeId,
      nodeType: targetNode.type,
      status: 'running' as WorkflowRunStatus,
    };
  }

  /**
   * SOP 兼容入口：从 SOP 模板启动 Workflow
   *
   * 如果已有对应的 workflow 则复用，否则从 SOP stages 自动创建。
   */
  async startFromSOP(
    sopTemplateId: string,
    sopStages: SOPStage[],
    taskId?: string,
  ) {
    const [existingWorkflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.sopTemplateId, sopTemplateId))
      .limit(1);

    let workflowId: string;

    if (existingWorkflow) {
      workflowId = existingWorkflow.id;
    } else {
      const { nodes, entryNodeId } = sopToWorkflow(sopStages, sopTemplateId);
      workflowId = generateId();

      await db.insert(workflows).values({
        id: workflowId,
        name: `SOP: ${sopStages[0]?.label ?? '未命名'}`,
        description: `从 SOP 模板 ${sopTemplateId} 自动导入`,
        nodes,
        entryNodeId,
        sopTemplateId,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return this.start(workflowId, taskId);
  }
}
