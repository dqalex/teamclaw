# TeamClaw v1.1 — Phase 2 Workflow Engine 交互点设计

> 版本：v1.1 Phase 2 补充  
> 日期：2026-03-26  
> 依据：Agent 协作平台设计原则 + v1.1 §7.7  
> 状态：规划中

---

## 关联文档

| 文档 | 关系 |
|------|------|
| [v1.1 主规划](teamclaw_v1.1.md) | 基础规划，§7.7 定义 WorkflowNode |
| [设计原则合规性](teamclaw_v1.1-design-principles-compliance.md) | §6.3 标记需补充 |
| [UI 重构规划](teamclaw_v1.1-ui-redesign.md) | §6.3 WorkflowCanvas UI |

---

## 一、设计原则回顾

### 原则一：原子能力优先

```
需求 ──▶ 盘点现有原子能力 ──▶ 能组合则不新建 ──▶ 无法构建才新建
```

### 原则二：闭环设计强制性

```
盘点交互点 ──▶ 分解上下文 ──▶ 插入最近前置交互点 ──▶ 不破坏 LLM 注意力
```

---

## 二、Workflow 交互点全景图

### 2.1 三层交互视角

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Workflow 交互点全景图                               │
│                                                                      │
│  ┌─ Layer 1: Workflow 编辑层（人类操作）──────────────────────┐    │
│  │                                                               │    │
│  │   节点拖拽 → 连线配置 → 参数设置 → 执行预览 → 发布          │    │
│  │       ↑           ↑          ↑           ↑         ↑         │    │
│  │       │           │          │           │         │         │    │
│  │       └───────────┴──────────┴───────────┴─────────┘         │    │
│  │                       人类交互点                              │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─ Layer 2: Workflow 执行层（AI 操作）──────────────────────┐    │
│  │                                                               │    │
│  │   触发 → 节点1执行 → [条件判断] → 节点2执行 → ... → 结束    │    │
│  │                 ↑                                              │    │
│  │                 │                                              │    │
│  │     ┌───────────┴───────────┐                                │    │
│  │     ▼                       ▼                                │    │
│  │  SOP节点                   AI节点                            │    │
│  │  (复用Skill闭环)           (调用MCP工具)                    │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─ Layer 3: 上下文管理层（知识沉淀）────────────────────────┐    │
│  │                                                               │    │
│  │   L1 核心规则（Workflow 级别守卫）                        │    │
│  │   L2-L3 节点配置知识库                                     │    │
│  │   L4 执行经验（节点产出/异常记录）                         │    │
│  │   L5 执行归档（Workflow 版本历史）                         │    │
│  └───────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 原子能力复用矩阵

| 原子能力 | Workflow 复用方式 |
|---------|------------------|
| **37 个 MCP 工具** | AI 节点直接调用 |
| **Skill Executor** | SOP 节点 → invoke_skill |
| **knowhow-parser** | L1-L5 知识分层 |
| **ExecutionContext** | 节点间上下文传递 |
| **Task 实体** | Workflow 执行归因到 Task |

---

## 三、节点类型 × 交互点矩阵

### 3.1 交互点定义

| 交互点 | 说明 | 上下文传递 | 最近前置原则 |
|--------|------|-----------|------------|
| **trigger** | 触发器激活 | 触发参数 | ✅ |
| **before_node** | 节点执行前 | 节点配置 + 输入 | ✅ |
| **executing** | 节点执行中 | 实时状态 | ⚠️ 避免干扰 |
| **after_node** | 节点执行后 | 节点产出 | ✅ |
| **on_condition** | 条件判断 | 分支选择依据 | ✅ |
| **on_loop** | 循环状态 | 循环计数 + 当前迭代 | ✅ |
| **on_error** | 异常处理 | 错误信息 + 重试策略 | ✅ |
| **completed** | Workflow 完成 | 最终产出 | ✅ |

### 3.2 节点类型 × 交互点

```
┌─────────────────────────────────────────────────────────────────────┐
│  节点类型 × 交互点矩阵                                                │
│                                                                      │
│  ┌─ sop 节点 ──────────────────────────────────────────────────┐   │
│  │  交互点：before → executing(Skill执行) → after               │   │
│  │  上下文：SKILL.md + L1-L5 + skill_experiences               │   │
│  │  最近前置：before_node（加载 Skill 上下文）                  │   │
│  │  注意力保护：executing 不插入干扰，详细在 after_node        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ ai_auto 节点 ──────────────────────────────────────────────┐   │
│  │  交互点：before → executing(LLM调用) → after                 │   │
│  │  上下文：prompt + system_prompt + conversation_history      │   │
│  │  最近前置：before_node（加载 prompt 上下文）                 │   │
│  │  注意力保护：executing 不插入干扰                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ input 节点 ────────────────────────────────────────────────┐   │
│  │  交互点：trigger → waiting → after(用户输入)               │   │
│  │  上下文：表单字段定义 + 用户输入                           │   │
│  │  最近前置：trigger（等待时展示表单）                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ condition 节点 ────────────────────────────────────────────┐   │
│  │  交互点：on_condition → true分支/false分支                  │   │
│  │  上下文：expression + 变量绑定                             │   │
│  │  最近前置：on_condition（判断前最后检查）                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ loop 节点 ─────────────────────────────────────────────────┐   │
│  │  交互点：on_loop(迭代开始) → 循环体 → on_loop(迭代结束)   │   │
│  │  上下文：count + current_iteration + 累积产出              │   │
│  │  最近前置：on_loop（每次迭代前）                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ parallel 节点 ────────────────────────────────────────────┐   │
│  │  交互点：trigger → [并行执行] → after(汇聚)                │   │
│  │  上下文：各分支产出                                         │   │
│  │  最近前置：trigger（开始时加载并行配置）                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ render 节点 ──────────────────────────────────────────────┐   │
│  │  交互点：before → executing(渲染) → after(预览)             │   │
│  │  上下文：template + 数据绑定                               │   │
│  │  最近前置：before_node（加载模板）                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ review 节点 ───────────────────────────────────────────────┐   │
│  │  交互点：trigger → waiting(审核) → approved/rejected        │   │
│  │  上下文：交付物 + 审核意见                                  │   │
│  │  最近前置：trigger（提交审核时通知审核人）                  │   │
│  │  注意力保护：waiting 不插入干扰                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、闭环设计：Workflow 执行上下文

### 4.1 执行上下文传递

```
┌─────────────────────────────────────────────────────────────────────┐
│  Workflow 执行上下文传递闭环                                           │
│                                                                      │
│  Workflow 启动                                                        │
│      │                                                               │
│      ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Context Init（最近前置：Workflow 开始）                     │    │
│  │  ├── 加载 Workflow L1 核心规则                               │    │
│  │  ├── 加载关联 Project L1-L3                                 │    │
│  │  ├── 初始化变量绑定                                         │    │
│  │  └── 记录 Workflow 执行开始（L5）                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│      │                                                               │
│      ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Node 1 执行                                                 │    │
│  │  ├── before_node：加载节点配置 + 输入                       │    │
│  │  │   └── 加载节点 L2-L3 知识（如果 SOP 节点）               │    │
│  │  ├── executing：执行（LLM/Skill/人工）                      │    │
│  │  │   └── Skill 节点：复用 Skill 闭环（record/promote）      │    │
│  │  └── after_node：记录产出                                   │    │
│  │      └── 追加到 L4 执行经验                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│      │                                                               │
│      ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Node 2 执行                                                 │    │
│  │  ├── before_node：加载 Node 1 产出作为输入                  │    │
│  │  │   └── 最近前置：产出立即可用于下一步                      │    │
│  │  └── ...                                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│      │                                                               │
│      ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Workflow 完成                                                │    │
│  │  ├── 汇总所有节点产出                                         │    │
│  │  ├── 执行统计（Token/时间/成本）                             │    │
│  │  ├── 归档到 L5 执行日志                                      │    │
│  │  └── 触发完成 Hook                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│      │                                                               │
│      ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  闭环完成 ✅                                                   │    │
│  │  产出 → Delivery → 审核 → 评分 → Skill 进化                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 注意力保护策略

| 场景 | 保护策略 |
|------|---------|
| **SOP 节点执行中** | 不插入无关提示，详细的执行日志在 after_node |
| **AI 节点生成中** | 不插入追问请求，用户在下一节点或结束后交互 |
| **Review 等待中** | 不插入打扰审核人的信息，审核结果自动推送 |
| **Loop 循环中** | 中期不插入进度报告，结束后统一汇总 |

---

## 五、Workflow 级别上下文分层

### 5.1 L1 核心规则（Workflow 守卫）

```typescript
// Workflow 级别的 L1 规则，影响整个执行过程
interface WorkflowL1Rules {
  // 执行守卫
  maxExecutionTime?: number;        // 最大执行时间（秒）
  maxTokenUsage?: number;           // 最大 Token 消耗
  requireHumanInLoop?: boolean;     // 是否需要人工介入点
  
  // 安全规则
  allowedTools?: string[];          // 允许的工具列表
  blockedPatterns?: string[];       // 禁止的模式
  
  // 质量规则
  minOutputLength?: number;         // 最小输出长度
  qualityGateThreshold?: number;    // 质量门槛
}
```

### 5.2 L2-L3 节点配置知识

```typescript
// 单个节点的 L2-L3 配置知识
interface NodeKnowledge {
  nodeId: string;
  
  // L2: 详细配置标准
  configStandards?: {
    promptTemplates?: Record<string, string>;
    parameterDefaults?: Record<string, unknown>;
    validationRules?: string[];
  };
  
  // L3: 历史案例
  historyCases?: {
    successCases?: WorkflowExecution[];
    failureCases?: WorkflowExecution[];
    optimizationHints?: string[];
  };
}
```

### 5.3 L4 执行经验

```typescript
// Workflow 执行产生的经验
interface WorkflowExperience {
  id: string;
  workflowId: string;
  
  // 经验内容
  scenario: string;                // 什么场景
  nodeOutputs: Record<string, unknown>;  // 各节点产出
  executionMetrics: {
    totalTokens: number;
    totalTime: number;
    successRate: number;
  };
  
  // 进化追踪
  occurrenceCount: number;          // 同类执行次数
  optimizedFrom?: string;           // 优化自哪个版本
  
  createdAt: Date;
}
```

### 5.4 L5 执行归档

```typescript
// Workflow 版本历史
interface WorkflowVersionLog {
  id: string;
  workflowId: string;
  version: number;
  
  // 归档内容
  definition: WorkflowDefinition;   // 完整定义快照
  executionStats: {
    totalRuns: number;
    successRate: number;
    avgTokens: number;
    avgDuration: number;
  };
  
  // 变更记录
  changes: {
    addedNodes?: string[];
    removedNodes?: string[];
    modifiedNodes?: string[];
    reason: string;
  };
  
  archivedAt: Date;
}
```

---

## 六、与 Phase 1B Skill Evolution 的协同

### 6.1 SOP 节点 × Skill Evolution 闭环

```
┌─────────────────────────────────────────────────────────────────────┐
│  SOP 节点 → Skill Evolution 协同闭环                                   │
│                                                                      │
│  1. Workflow 执行 SOP 节点                                            │
│     └── invoke_skill → 执行 SKILL.md                                │
│                                                                      │
│  2. Skill 执行中                                                      │
│     └── 加载 skill_experiences（Top 10）                            │
│                                                                      │
│  3. 用户修正发生时                                                    │
│     └── record_skill_experience（Phase 1B 已有）                     │
│     └── appendToL4() → 追加到 Skill L4                              │
│                                                                      │
│  4. Workflow 完成后                                                  │
│     └── 记录此 Workflow 的节点执行经验（L4）                         │
│     └── 同步更新 Skill 的 evolutionStats                            │
│                                                                      │
│  5. 下次同一 Skill 被调用                                            │
│     └── invoke_skill → 加载最新 skill_experiences                  │
│     └── Workflow 执行质量提升                                         │
│                                                                      │
│  闭环完成 ✅                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 数据流

```
Workflow 执行
    │
    ├── SOP 节点调用
    │   ├── invoke_skill
    │   ├── 加载 skill_experiences（Top 10）
    │   └── 执行 → 产出
    │
    └── 记录到 WorkflowExperience
        ├── nodeOutputs
        ├── executionMetrics
        └── occurrenceCount++

Skill Evolution（Phase 1B）
    │
    ├── record_skill_experience
    │   └── 追加到 skill_experiences 表
    │
    └── 同步更新
        ├── Skill.evolutionStats.totalCorrections
        └── occurrenceCount ≥ 3 → 晋升建议
```

---

## 七、与 Phase 4 Proactive Engine 的协同

### 7.1 Workflow × Proactive 事件流

```
Workflow 执行事件
    │
    ├── on_error（节点异常）
    │   └── → Proactive Engine
    │       └── 触发：workflow_node_error
    │           └── 动作：通知负责人 + 分析原因
    │
    ├── quality_gate_failed（质量门槛未达）
    │   └── → Proactive Engine
    │       └── 触发：workflow_quality_alert
    │           └── 动作：通知 + 建议调整参数
    │
    ├── execution_timeout（执行超时）
    │   └── → Proactive Engine
    │       └── 触发：workflow_timeout
    │           └── 动作：自动终止 + 通知 + 记录 L4
    │
    └── completed（完成）
        └── → Proactive Engine
            └── 触发：workflow_completed
                └── 动作：更新统计 + 归档 L5
```

### 7.2 ProactiveRule 扩展

```typescript
// Phase 4 ProactiveRule 扩展（支持 Workflow）

const workflowRules: ProactiveRule[] = [
  {
    id: 'wf-timeout-check',
    name: 'Workflow 超时检测',
    trigger: { type: 'workflow_timeout', thresholdMinutes: 30 },
    condition: 'execution.time > threshold',
    action: { type: 'notify', target: 'workflow.owner' },
    priority: 'high',
    enabled: true,
  },
  {
    id: 'wf-quality-alert',
    name: 'Workflow 质量告警',
    trigger: { type: 'workflow_quality_gate_failed', threshold: 0.7 },
    condition: 'output.qualityScore < threshold',
    action: { type: 'suggest_optimization' },
    priority: 'medium',
    enabled: true,
  },
  {
    id: 'wf-node-error-pattern',
    name: '节点错误模式检测',
    trigger: { type: 'workflow_node_error', pattern: 'rate_limit' },
    condition: 'error.message.includes("rate_limit")',
    action: { type: 'retry_with_backoff', backoffSeconds: 60 },
    priority: 'high',
    enabled: true,
  },
];
```

---

## 八、MCP 工具扩展（Workflow 相关）

### 8.1 新增 MCP 工具

| 工具名 | 功能 | 原子能力复用 |
|--------|------|-------------|
| `execute_workflow` | 执行 Workflow | 新建（核心功能） |
| `get_workflow_context` | 获取执行上下文 | 新建（核心功能） |
| `record_workflow_experience` | 记录执行经验 | 复用 record_skill_experience 模式 |
| `get_workflow_recommendations` | 获取优化建议 | 新建（基于 L4） |

### 8.2 工具定义

```typescript
// execute_workflow
{
  name: 'execute_workflow',
  description: '执行指定的 Workflow，支持断点续执行',
  parameters: {
    workflow_id: { type: 'string', required: true },
    input: { type: 'object', required: true },
    resume_from_node?: { type: 'string' },  // 断点续执行
  }
}

// get_workflow_context
{
  name: 'get_workflow_context',
  description: '获取 Workflow 执行上下文，用于节点间状态传递',
  parameters: {
    workflow_id: { type: 'string', required: true },
    include_nodes?: { type: 'string[]' },  // 指定节点
    include_history?: { type: 'boolean' },  // 包含历史
  }
}

// record_workflow_experience
{
  name: 'record_workflow_experience',
  description: '记录 Workflow 执行经验，用于后续优化',
  parameters: {
    workflow_id: { type: 'string', required: true },
    scenario: { type: 'string', required: true },
    node_outputs: { type: 'object', required: true },
    metrics: { type: 'object', required: true },
  }
}
```

---

## 九、UI WorkflowCanvas 交互设计（补充）

### 9.1 Canvas 操作交互点

| 操作 | 交互点 | 上下文 | 最近前置 |
|------|--------|--------|---------|
| **拖拽节点** | drop | 节点类型 + 默认配置 | ✅ drop 时 |
| **连线** | connect | 源节点产出 → 目标节点输入 | ✅ 连线时 |
| **配置节点** | configure | 节点配置面板 | ✅ 选中时 |
| **预览执行** | preview | 执行结果 + 变量值 | ✅ 预览时 |
| **发布** | publish | 发布确认 + 版本号 | ✅ 发布时 |

### 9.2 实时反馈交互

```
Canvas 实时反馈：
│
├── 节点悬停
│   └── 显示节点简介（名称 + 类型 + 输入输出）
│       最近前置：悬停时
│
├── 节点执行中
│   └── 显示执行状态 + 当前步骤
│       注意力保护：仅视觉反馈，不阻塞操作
│
├── 节点执行完成
│   └── 显示产出预览 + Token 消耗
│       最近前置：完成后立即显示
│
└── 节点异常
    └── 显示错误信息 + 重试按钮
        最近前置：异常时立即显示
```

---

## 十、完整闭环验证

### 10.1 Workflow 生命周期闭环

```
┌─────────────────────────────────────────────────────────────────────┐
│  Workflow 完整闭环验证                                                │
│                                                                      │
│  1. 创建阶段                                                        │
│     ├── 拖拽节点（UI 交互点）                                        │
│     ├── 配置参数（加载 L2-L3 知识建议）                              │
│     └── 保存 → 版本 L5 归档开始                                     │
│                                                                      │
│  2. 执行阶段                                                        │
│     ├── 触发 → 加载 L1 守卫规则                                      │
│     ├── 节点执行 → 加载 skill_experiences（如果 SOP）               │
│     │   └── Skill 执行闭环：record → promote → 复用                 │
│     ├── 节点产出 → 传递到下一步（最近前置）                         │
│     └── 异常处理 → Proactive Engine → 通知/重试                     │
│                                                                      │
│  3. 完成阶段                                                        │
│     ├── 产出汇总 → Delivery                                         │
│     ├── 审核 → 评分                                                 │
│     └── 归档 → L5 执行日志                                          │
│                                                                      │
│  4. 优化阶段                                                        │
│     ├── L4 经验积累 → occurrenceCount++                             │
│     ├── 优化建议 → get_workflow_recommendations                     │
│     └── 版本迭代 → 归档旧版本                                       │
│                                                                      │
│  闭环完成 ✅：创建 → 执行 → 完成 → 优化 → 复用                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 与其他 Phase 的闭环

| Phase | 闭环点 | 验证 |
|-------|--------|------|
| **Phase 1A** | Adapter System → Workflow 引擎可切换后端 | ✅ |
| **Phase 1B** | Skill Evolution → SOP 节点复用经验闭环 | ✅ |
| **Phase 3** | Marketplace → AI App 可发布为 Service | ✅ |
| **Phase 4** | Proactive Engine → Workflow 异常自动处理 | ✅ |

---

## 十一、合规性自检

### 11.1 原则一：原子能力优先

```
□ 盘点现有 37 个 MCP 工具 ✅
□ 复用 Skill Executor（SOP 节点） ✅
□ 复用 knowhow-parser（L1-L5） ✅
□ 新建工具：execute_workflow, get_workflow_context ✅
□ 纳入原子能力库索引 ✅
```

### 11.2 原则二：闭环设计强制性

```
□ 盘点 Workflow 交互点：8 个节点类型 × 3 层视角 ✅
□ 分解上下文：L1-L5 分层 + 节点产出传递 ✅
□ 最近前置原则：
  ├── before_node 加载上下文 ✅
  ├── after_node 记录产出 ✅
  └── on_error 异常处理 ✅
□ 注意力保护：executing 不插入干扰 ✅
□ 闭环验证：创建→执行→完成→优化→复用 ✅
```

### 11.3 原则三：分层上下文设计

```
□ L1 Workflow 守卫规则 ✅
□ L2-L3 节点配置知识 ✅
□ L4 执行经验（WorkflowExperience） ✅
□ L5 版本归档 ✅
□ L1 规则 ≤ 5 条，每条 < 50 tokens ✅（在 Workflow 级别限制）
```

---

_Last updated: 2026-03-26_
