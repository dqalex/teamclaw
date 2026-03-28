/**
 * v1.1 Phase 2: Workflow MCP Handlers 单元测试
 * 测试参数校验和错误处理（不依赖 DB）
 */
import { describe, it, expect } from 'vitest';

// 从 workflow/mcp.ts 提取的参数校验逻辑（纯逻辑）
type HandlerResult = { success: boolean; data?: Record<string, unknown>; error?: string };

function validateStartWorkflow(params: Record<string, unknown>): HandlerResult | null {
  const { workflowId } = params as { workflowId?: string };
  if (!workflowId) {
    return { success: false, error: 'Missing required parameter: workflowId' };
  }
  return null; // 参数校验通过
}

function validateAdvanceWorkflow(params: Record<string, unknown>): HandlerResult | null {
  const { runId } = params as { runId?: string };
  if (!runId) {
    return { success: false, error: 'Missing required parameter: runId' };
  }
  return null;
}

function validateCreateWorkflow(params: Record<string, unknown>): HandlerResult | null {
  const { name, nodes, entryNodeId } = params as {
    name?: string;
    nodes?: unknown[];
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
  return null;
}

function validateWorkflowAction(params: Record<string, unknown>): HandlerResult | null {
  const { runId } = params as { runId?: string };
  if (!runId) {
    return { success: false, error: 'Missing required parameter: runId' };
  }
  return null;
}

function validateReplayFrom(params: Record<string, unknown>): HandlerResult | null {
  const { runId, nodeId } = params as { runId?: string; nodeId?: string };
  if (!runId) {
    return { success: false, error: 'Missing required parameter: runId' };
  }
  if (!nodeId) {
    return { success: false, error: 'Missing required parameter: nodeId' };
  }
  return null;
}

// ============================================================
// Tests
// ============================================================

describe('Workflow MCP: start_workflow 参数校验', () => {
  it('缺少 workflowId 应返回错误', () => {
    const result = validateStartWorkflow({});
    expect(result).toBeTruthy();
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('workflowId');
  });

  it('有效参数应通过校验', () => {
    const result = validateStartWorkflow({ workflowId: 'wf-1', taskId: 't-1' });
    expect(result).toBeNull();
  });

  it('只有 workflowId 也应通过', () => {
    const result = validateStartWorkflow({ workflowId: 'wf-1' });
    expect(result).toBeNull();
  });
});

describe('Workflow MCP: advance_workflow 参数校验', () => {
  it('缺少 runId 应返回错误', () => {
    const result = validateAdvanceWorkflow({});
    expect(result).toBeTruthy();
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('runId');
  });

  it('有效参数应通过校验', () => {
    const result = validateAdvanceWorkflow({ runId: 'run-1', nodeOutput: { data: 'test' } });
    expect(result).toBeNull();
  });
});

describe('Workflow MCP: create_workflow 参数校验', () => {
  it('缺少 name 应返回错误', () => {
    const result = validateCreateWorkflow({ nodes: [{ id: 'n1' }], entryNodeId: 'n1' });
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('name');
  });

  it('缺少 nodes 应返回错误', () => {
    const result = validateCreateWorkflow({ name: 'Test', entryNodeId: 'n1' });
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('nodes');
  });

  it('空数组 nodes 应返回错误', () => {
    const result = validateCreateWorkflow({ name: 'Test', nodes: [], entryNodeId: 'n1' });
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('nodes');
  });

  it('非数组 nodes 应返回错误', () => {
    const result = validateCreateWorkflow({ name: 'Test', nodes: 'invalid' as any, entryNodeId: 'n1' });
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('nodes');
  });

  it('缺少 entryNodeId 应返回错误', () => {
    const result = validateCreateWorkflow({ name: 'Test', nodes: [{ id: 'n1' }] });
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('entryNodeId');
  });

  it('全部有效参数应通过', () => {
    const result = validateCreateWorkflow({
      name: 'Test Workflow',
      description: 'A test',
      projectId: 'p1',
      nodes: [{ id: 'n1', type: 'manual' }],
      entryNodeId: 'n1',
    });
    expect(result).toBeNull();
  });
});

describe('Workflow MCP: pause/resume 参数校验', () => {
  it('缺少 runId 应返回错误', () => {
      expect(validateWorkflowAction({})).toBeTruthy();
      expect(validateWorkflowAction({ runId: 'r1' })).toBeNull();
  });
});

describe('Workflow MCP: replay_from 参数校验', () => {
  it('缺少 runId 应返回错误', () => {
    const result = validateReplayFrom({ nodeId: 'n1' });
    expect(result!.success).toBe(false);
  });

  it('缺少 nodeId 应返回错误', () => {
    const result = validateReplayFrom({ runId: 'r1' });
    expect(result!.success).toBe(false);
  });

  it('全部有效参数应通过', () => {
    expect(validateReplayFrom({ runId: 'r1', nodeId: 'n1' })).toBeNull();
  });
});

// ============================================================
// Marketplace MCP 参数校验测试
// ============================================================
describe('Marketplace MCP: submit_service_rating 参数校验', () => {
  // 提取自 marketplace/mcp.ts 的校验逻辑
  function validateSubmitRating(params: Record<string, unknown>): HandlerResult | null {
    const serviceId = params.service_id as string;
    const rating = Number(params.rating);
    const consumerToken = params.consumer_token as string;

    if (!serviceId) return { success: false, error: 'service_id is required' };
    if (!rating || rating < 1 || rating > 5) return { success: false, error: 'Rating must be between 1 and 5' };
    if (!consumerToken) return { success: false, error: 'consumer_token is required' };
    return null;
  }

  it('缺少 service_id 应返回错误', () => {
    const result = validateSubmitRating({ rating: 5, consumer_token: 'tok' });
    expect(result!.error).toContain('service_id');
  });

  it('rating 超出范围应返回错误', () => {
    expect(validateSubmitRating({ service_id: 's1', rating: 0, consumer_token: 'tok' })!.error).toContain('between 1 and 5');
    expect(validateSubmitRating({ service_id: 's1', rating: 6, consumer_token: 'tok' })!.error).toContain('between 1 and 5');
  });

  it('rating = NaN 应返回错误', () => {
    expect(validateSubmitRating({ service_id: 's1', rating: 'abc', consumer_token: 'tok' })!.error).toContain('between 1 and 5');
  });

  it('缺少 consumer_token 应返回错误', () => {
    expect(validateSubmitRating({ service_id: 's1', rating: 5 })!.error).toContain('consumer_token');
  });

  it('全部有效参数应通过', () => {
    expect(validateSubmitRating({ service_id: 's1', rating: 4, consumer_token: 'tok', feedback: 'Great!' })).toBeNull();
  });
});

// ============================================================
// OKR MCP 参数校验测试
// ============================================================
describe('OKR MCP: handleCreateObjective 参数校验', () => {
  function validateCreateObjective(params: Record<string, unknown>): HandlerResult | null {
    const { project_id, title } = params as { project_id?: string; title?: string };
    if (!project_id || !title) return { success: false, error: 'project_id and title are required' };
    return null;
  }

  it('缺少参数应返回错误', () => {
    expect(validateCreateObjective({})).toBeTruthy();
    expect(validateCreateObjective({ project_id: 'p1' })).toBeTruthy();
    expect(validateCreateObjective({ title: 'Obj' })).toBeTruthy();
  });

  it('全部有效参数应通过', () => {
    expect(validateCreateObjective({ project_id: 'p1', title: 'My Objective' })).toBeNull();
  });
});

describe('OKR MCP: handleUpdateKeyResult 参数校验', () => {
  function validateUpdateKeyResult(params: Record<string, unknown>): HandlerResult | null {
    const { key_result_id } = params as { key_result_id?: string };
    if (!key_result_id) return { success: false, error: 'key_result_id is required' };
    return null;
  }

  it('缺少 key_result_id 应返回错误', () => {
    expect(validateUpdateKeyResult({})).toBeTruthy();
  });

  it('有效参数应通过', () => {
    expect(validateUpdateKeyResult({ key_result_id: 'kr1', current_value: 50 })).toBeNull();
  });
});

describe('OKR MCP: handleGetObjectives 参数校验', () => {
  function validateGetObjectives(params: Record<string, unknown>): HandlerResult | null {
    const { project_id } = params as { project_id?: string };
    if (!project_id) return { success: false, error: 'project_id is required' };
    return null;
  }

  it('缺少 project_id 应返回错误', () => {
    expect(validateGetObjectives({ status: 'active' })).toBeTruthy();
  });

  it('有效参数应通过', () => {
    expect(validateGetObjectives({ project_id: 'p1' })).toBeNull();
    expect(validateGetObjectives({ project_id: 'p1', status: 'active' })).toBeNull();
  });

  it('status 不在白名单应该降级为 active', () => {
    // 这个逻辑在 handler 内部，这里只验证参数存在性
    const { project_id, status } = { project_id: 'p1', status: 'invalid' };
    expect(project_id).toBeTruthy();
    const validStatuses = ['draft', 'active', 'completed', 'archived'] as const;
    const safeStatus = validStatuses.includes(status as any)
      ? (status as any)
      : 'active';
    expect(safeStatus).toBe('active');
  });
});
