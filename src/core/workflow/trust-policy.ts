/**
 * Trust Policy 评估器
 * v1.1 Phase 2A: 根据节点配置判断是否需要审批
 */

import type { WorkflowNode, WorkflowContext, TrustEvaluation } from './types';

/**
 * 评估节点是否允许自动执行
 *
 * @param node - Workflow 节点定义
 * @param context - 当前 Workflow 上下文（用于扩展判断）
 * @returns 评估结果
 */
export function evaluateTrust(
  node: WorkflowNode,
  context?: WorkflowContext,
): TrustEvaluation {
  // 显式标记需要审批
  if (node.requireApproval) {
    return {
      allowed: false,
      requireApproval: true,
      reason: '节点显式标记需要审批',
    };
  }

  // 根据 trustLevel 判断
  switch (node.trustLevel) {
    case 'auto':
      return {
        allowed: true,
        requireApproval: false,
        reason: '节点配置为自动执行',
      };

    case 'supervised':
      return {
        allowed: false,
        requireApproval: true,
        reason: '节点配置为监督模式，需要确认后继续',
      };

    case 'manual':
      return {
        allowed: false,
        requireApproval: true,
        reason: '节点配置为手动模式，需要人工介入',
      };

    default:
      // 未设置 trustLevel 时，根据节点类型推断默认策略
      return inferDefaultTrust(node);
  }
}

/**
 * 根据节点类型推断默认 Trust Policy
 */
function inferDefaultTrust(node: WorkflowNode): TrustEvaluation {
  switch (node.type) {
    case 'input':
      return {
        allowed: false,
        requireApproval: true,
        reason: 'input 节点需要人工输入',
      };

    case 'render':
      return {
        allowed: false,
        requireApproval: true,
        reason: 'render 节点需要确认渲染结果',
      };

    case 'ai_auto':
      return {
        allowed: true,
        requireApproval: false,
        reason: 'ai_auto 节点默认自动执行',
      };

    case 'condition':
      return {
        allowed: true,
        requireApproval: false,
        reason: 'condition 节点为自动条件判断',
      };

    case 'loop':
      return {
        allowed: true,
        requireApproval: false,
        reason: 'loop 节点自动执行循环逻辑',
      };

    default:
      // sop, parallel, workflow_call 等默认需要确认
      return {
        allowed: false,
        requireApproval: true,
        reason: `${node.type} 节点默认需要确认`,
      };
  }
}
