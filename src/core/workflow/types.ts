/**
 * Workflow Engine 类型定义
 * v1.1 Phase 2A: DAG 工作流引擎
 */

// ============================================================
// 节点类型
// ============================================================

/** Workflow 节点类型 */
export type WorkflowNodeType =
  | 'sop'            // SOP 兼容节点
  | 'condition'      // 条件分支
  | 'loop'           // 循环
  | 'parallel'       // 并行
  | 'workflow_call'  // 调用子 Workflow
  | 'ai_auto'        // AI 自动执行
  | 'input'          // 等待输入
  | 'render';        // 渲染输出

/** 条件分支配置 */
export interface ConditionConfig {
  expression: string;
  trueNext: string;
  falseNext: string;
}

/** 循环配置 */
export interface LoopConfig {
  maxIterations: number;
  breakCondition: string;
  bodyNodeId: string;
}

/** 并行配置 */
export interface ParallelConfig {
  branches: string[][];
  joinType: 'all' | 'any';
}

/** 重试策略 */
export interface RetryPolicy {
  maxRetries: number;
  backoff: 'linear' | 'exponential';
}

/** Trust Policy 级别 */
export type TrustLevel = 'auto' | 'supervised' | 'manual';

/** Workflow 节点定义 */
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  description?: string;

  // DAG 连接关系
  nextNodes: string[];
  prevNodes: string[];

  // SOP 兼容（type='sop' 时使用）
  sopStageType?: string;
  sopStageConfig?: Record<string, unknown>;

  // 条件分支
  condition?: ConditionConfig;

  // 循环
  loop?: LoopConfig;

  // 并行
  parallel?: ParallelConfig;

  // Trust Policy
  trustLevel?: TrustLevel;
  requireApproval?: boolean;

  // 通用配置
  promptTemplate?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

// ============================================================
// 执行状态
// ============================================================

/** Workflow 执行状态 */
export type WorkflowRunStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/** 节点执行状态 */
export type NodeRecordStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting_input'
  | 'waiting_confirm';

/** 节点执行记录 */
export interface WorkflowNodeRecord {
  nodeId: string;
  nodeType: WorkflowNodeType;
  status: NodeRecordStatus;
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
  retryCount?: number;
}

// ============================================================
// 上下文
// ============================================================

/** Workflow 上下文 */
export interface WorkflowContext {
  taskId?: string;
  projectId?: string;
  memberId?: string;
  variables: Record<string, unknown>;
}

// ============================================================
// Trust Policy 评估结果
// ============================================================

/** Trust Policy 评估结果 */
export interface TrustEvaluation {
  allowed: boolean;
  requireApproval: boolean;
  reason?: string;
}
