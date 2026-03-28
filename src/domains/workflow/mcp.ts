/**
 * MCP Handler: Workflow Engine 操作
 * v1.1 Phase 2: DAG 工作流引擎 MCP 工具
 */

import { db } from '@/db';
import { workflows, workflowRuns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { WorkflowEngine } from '@/core/workflow/engine';
import { eventBus } from '@/shared/lib/event-bus';
import type { WorkflowNode } from '@/core/workflow/types';

const engine = new WorkflowEngine();

// ============================================================
// Handler 类型
// ============================================================

type HandlerResult = { success: boolean; data?: Record<string, unknown>; error?: string };

// ============================================================
// Workflow MCP Handlers
// ============================================================

/**
 * 启动 Workflow 执行
 */
async function handleStartWorkflow(params: Record<string, unknown>): Promise<HandlerResult> {
  const { workflowId, taskId } = params as { workflowId?: string; taskId?: string };

  if (!workflowId) {
    return { success: false, error: 'Missing required parameter: workflowId' };
  }

  try {
    const result = await engine.start(workflowId, taskId ?? undefined);

    // 发射 SSE 事件
    eventBus.emit({
      type: 'workflow_run_started',
      resourceId: result.runId,
      data: { workflowId, taskId, runId: result.runId },
    });

    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start workflow';
    return { success: false, error: message };
  }
}

/**
 * 推进 Workflow 到下一个节点
 */
async function handleAdvanceWorkflow(params: Record<string, unknown>): Promise<HandlerResult> {
  const { runId, nodeOutput } = params as { runId?: string; nodeOutput?: unknown };

  if (!runId) {
    return { success: false, error: 'Missing required parameter: runId' };
  }

  try {
    const result = await engine.advance(runId, nodeOutput);

    // 发射节点推进事件
    eventBus.emit({
      type: 'workflow_node_advanced',
      resourceId: runId,
      data: { runId, currentNodeId: result.currentNodeId, nodeType: result.nodeType },
    });

    // 如果 Workflow 完成，额外发射完成事件
    if (result.status === 'completed') {
      eventBus.emit({
        type: 'workflow_run_completed',
        resourceId: runId,
        data: { runId, status: 'completed' },
      });
    }

    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to advance workflow';
    // 发射失败事件
    eventBus.emit({
      type: 'workflow_run_failed',
      resourceId: runId,
      data: { runId, error: message },
    });
    return { success: false, error: message };
  }
}

/**
 * 暂停 Workflow
 */
async function handlePauseWorkflow(params: Record<string, unknown>): Promise<HandlerResult> {
  const { runId } = params as { runId?: string };

  if (!runId) {
    return { success: false, error: 'Missing required parameter: runId' };
  }

  try {
    const result = await engine.pause(runId);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to pause workflow';
    return { success: false, error: message };
  }
}

/**
 * 恢复 Workflow
 */
async function handleResumeWorkflow(params: Record<string, unknown>): Promise<HandlerResult> {
  const { runId } = params as { runId?: string };

  if (!runId) {
    return { success: false, error: 'Missing required parameter: runId' };
  }

  try {
    const result = await engine.resume(runId);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resume workflow';
    return { success: false, error: message };
  }
}

/**
 * 从指定节点断点续执行
 */
async function handleReplayWorkflowFrom(params: Record<string, unknown>): Promise<HandlerResult> {
  const { runId, nodeId } = params as { runId?: string; nodeId?: string };

  if (!runId) {
    return { success: false, error: 'Missing required parameter: runId' };
  }
  if (!nodeId) {
    return { success: false, error: 'Missing required parameter: nodeId' };
  }

  try {
    const result = await engine.replayFrom(runId, nodeId);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to replay workflow';
    return { success: false, error: message };
  }
}

/**
 * 创建 Workflow 定义
 */
async function handleCreateWorkflow(params: Record<string, unknown>): Promise<HandlerResult> {
  const { name, description, projectId, nodes, entryNodeId } = params as {
    name?: string;
    description?: string;
    projectId?: string;
    nodes?: WorkflowNode[];
    entryNodeId?: string;
  };

  if (!name) {
    return { success: false, error: 'Missing required parameter: name' };
  }
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return { success: false, error: 'Missing required parameter: nodes (must be non-empty array)' };
  }
  if (!entryNodeId) {
    return { success: false, error: 'Missing required parameter: entryNodeId' };
  }

  try {
    const id = generateId();

    await db.insert(workflows).values({
      id,
      name,
      description: description ?? null,
      nodes: nodes,
      entryNodeId,
      projectId: projectId ?? null,
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, data: { id, name, status: 'draft' } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create workflow';
    return { success: false, error: message };
  }
}

// ============================================================
// 导出：兼容函数式 + 映射对象
// ============================================================

/** 单个 handler 函数导出（用于 tool-registry） */
export const start_workflow = handleStartWorkflow;
export const advance_workflow = handleAdvanceWorkflow;
export const pause_workflow = handlePauseWorkflow;
export const resume_workflow = handleResumeWorkflow;
export const replay_workflow_from = handleReplayWorkflowFrom;
export const create_workflow = handleCreateWorkflow;

/**
 * 获取 Workflow Run 状态
 * v1.1 新增：查询指定执行记录的当前状态
 */
export const get_workflow_status = async (params: Record<string, unknown>): Promise<HandlerResult> => {
  const { run_id } = params;
  if (!run_id || typeof run_id !== 'string') {
    return { success: false, error: 'Missing required parameter: run_id' };
  }

  try {
    const run = db.select().from(workflowRuns).where(eq(workflowRuns.id, run_id)).get();

    if (!run) {
      return { success: false, error: 'Workflow run not found' };
    }

    return {
      success: true,
      data: {
        id: run.id,
        workflowId: run.workflowId,
        taskId: run.taskId,
        status: run.status,
        currentNodeId: run.currentNodeId,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      },
    };
  } catch (message) {
    return { success: false, error: message instanceof Error ? message.message : String(message) };
  }
};

/** Handler 映射表 */
export const workflowMcpHandlers: Record<string, (params: Record<string, unknown>) => Promise<HandlerResult>> = {
  start_workflow,
  advance_workflow,
  pause_workflow,
  resume_workflow,
  replay_workflow_from,
  create_workflow,
  get_workflow_status,
};
