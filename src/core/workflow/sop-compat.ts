/**
 * SOP → Workflow 兼容层
 * v1.1 Phase 2A: 将线性 SOP stages 转换为 DAG WorkflowNode 链
 */

import type { SOPStage } from '@/db/schema';
import type { WorkflowNode } from './types';

/**
 * 将 SOP stages 数组转换为线性 WorkflowNode 链
 *
 * 每个 SOP stage 变成一个 type='sop' 的 WorkflowNode，
 * nextNodes 按顺序链接形成单向链表。
 *
 * @param stages - SOP 阶段定义数组
 * @param sopTemplateId - 关联的 SOP 模板 ID（可选）
 * @returns 节点列表和入口节点 ID
 */
export function sopToWorkflow(
  stages: SOPStage[],
  sopTemplateId?: string,
): { nodes: WorkflowNode[]; entryNodeId: string } {
  if (!stages || stages.length === 0) {
    throw new Error('[WorkflowEngine] SOP stages 为空，无法转换为 Workflow');
  }

  const nodes: WorkflowNode[] = stages.map((stage, index) => ({
    id: stage.id,
    type: 'sop' as const,
    label: stage.label,
    description: stage.description,

    // DAG 连接：下一个节点
    nextNodes: index < stages.length - 1 ? [stages[index + 1].id] : [],
    // DAG 连接：上一个节点
    prevNodes: index > 0 ? [stages[index - 1].id] : [],

    // SOP 兼容字段
    sopStageType: stage.type,
    sopStageConfig: {
      outputType: stage.outputType,
      outputLabel: stage.outputLabel,
      requiredInputs: stage.requiredInputs,
      confirmMessage: stage.confirmMessage,
      knowledgeLayers: stage.knowledgeLayers,
      renderTemplateId: stage.renderTemplateId,
      optional: stage.optional,
      estimatedMinutes: stage.estimatedMinutes,
      rollbackStageId: stage.rollbackStageId,
    },

    // 通用配置
    promptTemplate: stage.promptTemplate,
    trustLevel: stage.type === 'ai_auto' ? 'auto' : stage.type === 'input' ? 'manual' : 'supervised',
  }));

  return {
    nodes,
    entryNodeId: stages[0].id,
  };
}
