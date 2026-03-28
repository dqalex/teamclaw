# TeamClaw v1.1 LLM 执行规划

> **版本**：v1.1 LLM 执行版（合规版）  
> **日期**：2026-03-26  
> **目的**：基于项目实际完成度，提供可直接由 LLM/AI Agent 执行的开发规划  
> **依据**：GAP 分析 + 竞品研究 + 设计原则 + UI 重构方案 + Phase 2 交互点设计 + OpenClaw 集成  
> **合规性**：✅ 已通过设计原则合规性验证

---

## 执行摘要

### 项目现状

经过代码审查，v1.1 规划的核心功能**后端已基本完成**，主要缺口在 **UI 层**。

| Phase | 原规划 | 当前完成度 | GAP |
|-------|--------|-----------|-----|
| **Phase 1A** | Adapter System | **90%** | healthCheck() 补充 |
| **Phase 1B** | Skill Evolution | **85%** | UI 经验展示 |
| **Phase 2** | Workflow Engine | **60%** | 可视化编辑器 + 4 种节点 |
| **Phase 3** | Marketplace | **70%** | Marketplace UI + 订阅管理 UI |
| **Phase 4** | Proactive Engine | **50%** | 规则管理 UI |
| **UI 重构** | v1.1 UI | **20%** | Settings 路由化 + Command Bar |

### P0 优先级（4 项，全为 UI）

| 优先级 | GAP | 影响 |
|--------|-----|------|
| 🔴 **P0-1** | Workflow 可视化编辑器 | Phase 2 核心 UI 缺失 |
| 🔴 **P0-2** | Marketplace UI | Phase 3 Consumer 入口缺失 |
| 🔴 **P0-3** | 订阅管理 UI | Phase 3 Consumer 功能缺失 |
| 🔴 **P0-4** | Settings 路由化 | UI 基础设施缺失 |

### 调整后的 AI 工时估算

| 阶段 | 原估算 | 调整后 | 说明 |
|------|--------|--------|------|
| Phase 1A 收尾 | 9h | **1h** | 仅 healthCheck 补充 |
| Phase 1B 收尾 | 7.5h | **2h** | 经验展示 UI |
| **Phase 2 UI** | 2h | **12h** | 可视化编辑器（核心新增）+ 交互点设计 |
| **Phase 3 UI** | 2h | **8h** | Marketplace + 订阅 UI |
| **Phase 4 UI** | 0h | **4h** | 规则管理 UI |
| **UI 重构** | 0h | **10h** | Settings + CommandBar + AppShell 2.0 + Dashboard 2.0 |
| **Phase 2 节点** | 2.5h | **4h** | input/loop/render/review 节点 |
| **OpenClaw 集成** | 0h | **4h** | 配置适配器 + ClawHub 客户端 + 插件解析器 |
| **竞品增强** | 0h | **3h** | Task 价值追踪 + 效能面板基础 |
| **其他** | — | **3h** | 测试 + 文档 |
| **总计** | **~48.5h** | **~51h** | 重新分配到 UI + 补充设计 |

> **核心理念**：后端核心已完成，AI 工时重新分配到 UI 层，并补充 Phase 2 交互设计、OpenClaw 集成和竞品增强

---

## 一、项目快照

### 1.1 代码库规模（2026-03-26）

| 指标 | 数值 |
|------|------|
| 源文件数 | 340（256 .ts + 84 .tsx） |
| 总代码行数 | ~52,000 行 |
| 数据库表 | 35 张（Drizzle ORM + SQLite） |
| MCP 工具 | 84 个（含 7 个 DEPRECATED） |
| API 路由 | 113 个 |
| Domain 模块 | 16 个 |

### 1.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **框架** | Next.js (App Router) | ^14.2.35 |
| **语言** | TypeScript (strict) | ^5.4.0 |
| **状态管理** | Zustand | ^4.5.0 |
| **数据库** | Drizzle ORM + better-sqlite3 | 0.45.1 / 12.6.2 |
| **样式** | Tailwind CSS | ^3.4.0 |
| **图标** | lucide-react | ^0.565.0 |

### 1.3 关键目录结构

```
teamclaw/
├── app/api/                    # 113 个 API 路由
├── src/
│   ├── core/
│   │   ├── db/schema.ts       # 55 张表定义
│   │   ├── mcp/definitions.ts # 84 个 MCP 工具
│   │   ├── adapters/          # Adapter System (Phase 1A) ✅
│   │   └── workflow/          # Workflow Engine (Phase 2) ✅ 核心
│   ├── domains/
│   │   ├── skill/evolution-mcp.ts  # Skill Evolution (Phase 1B) ✅
│   │   ├── marketplace/       # Marketplace (Phase 3) ✅ 后端
│   │   ├── consumer/          # Consumer (Phase 3) ✅ 后端
│   │   └── proactive/         # Proactive Engine (Phase 4) ✅ 框架
│   ├── features/              # 前端功能模块
│   └── shared/
│       ├── layout/            # AppShell, Sidebar
│       └── ui/                # shadcn/ui 基础组件
```

---

## 二、P0 执行计划（UI 为王）

### 2.1 P0-1: Settings 路由化（G-UI-01）

> **前置**：无  
> **工时**：~2h  
> **优先级**：🔴 P0  
> **理由**：Settings 是其他 UI 工作的基础设施，拆分后才能并行开发

**当前问题**：`settings/page.tsx` 包含 7 个 Tab，臃肿且维护困难

**目标**：将 Settings 拆分为独立路由

```
app/settings/
├── page.tsx                   # 重定向到 /settings/general
├── layout.tsx                 # Settings 专属布局
├── general/page.tsx           # 通用设置（主题/语言/数据）
├── openclaw/
│   ├── page.tsx               # OpenClaw Gateway 设置
│   └── workspace/page.tsx     # Workspace 设置
├── plugins/page.tsx           # 插件管理 🆕
├── channels/page.tsx           # 渠道管理 🆕
├── security/page.tsx          # 安全设置
├── landing/page.tsx           # 首页内容管理
├── debug/page.tsx             # 调试工具
└── about/page.tsx             # 关于系统
```

**实现步骤**：

1. 创建 `app/settings/layout.tsx`
2. 创建 `app/settings/general/page.tsx`（从现有 Tab 迁移）
3. 创建 `app/settings/openclaw/page.tsx`
4. 创建 `app/settings/plugins/page.tsx`（占位页面）
5. 创建 `app/settings/channels/page.tsx`（占位页面）
6. 创建 `app/settings/security/page.tsx`
7. 更新 Sidebar 导航链接
8. 更新 `middleware.ts` 权限控制
9. 删除旧的 Tab 式 `settings/page.tsx`

**验收标准**：
- [ ] `/settings/general` 可访问
- [ ] `/settings/openclaw` 可访问
- [ ] Sidebar 导航正确高亮
- [ ] 权限控制正常工作
- [ ] `npm run build` 通过

---

### 2.2 P0-2: Workflow 可视化编辑器（G2-01）

> **前置**：Settings 路由化完成  
> **工时**：~12h（含交互点设计）  
> **优先级**：🔴 P0  
> **理由**：Phase 2 核心 UI，用户无法可视化编排 Workflow

**当前状态**：
- ✅ `WorkflowEngine` 核心类已实现（`src/core/workflow/engine.ts`）
- ✅ 4 种节点已实现：`sop`, `condition`, `loop`, `parallel`
- ❌ 可视化编辑器 UI 缺失
- ❌ 4 种节点缺失：`input`, `render`, `review`, `workflow_call`

**目标**：实现 Workflow 可视化编辑器 MVP

**目录结构**：

```
src/features/workflow-editor/
├── WorkflowEditor.tsx          # 主编辑器组件
├── WorkflowCanvas.tsx          # 画布组件（使用 @xyflow/react）
├── NodePalette.tsx             # 节点面板（拖拽来源）
├── NodeConfigPanel.tsx         # 节点配置面板
├── WorkflowList.tsx           # Workflow 列表页
├── WorkflowRunPanel.tsx       # 执行状态面板
├── components/
│   ├── nodes/
│   │   ├── BaseNode.tsx       # 节点基础组件
│   │   ├── SOPNode.tsx        # SOP 节点
│   │   ├── ConditionNode.tsx  # 条件节点
│   │   ├── LoopNode.tsx       # 循环节点
│   │   ├── ParallelNode.tsx   # 并行节点
│   │   ├── InputNode.tsx      # 输入节点 🆕
│   │   ├── RenderNode.tsx     # 渲染节点 🆕
│   │   └── ReviewNode.tsx     # 审核节点 🆕
│   └── edges/
│       └── ConditionalEdge.tsx # 条件边
└── hooks/
    ├── useWorkflowEditor.ts    # 编辑器状态管理
    └── useWorkflowExecution.ts # 执行状态管理
```

**页面路由**：

```
app/workflows/
├── page.tsx                    # Workflow 列表
├── new/page.tsx                # 创建 Workflow
└── [id]/
    ├── page.tsx                # Workflow 详情
    └── edit/page.tsx           # 编辑器（主要 UI）
```

---

### 2.2.1 三层交互视角设计（Phase 2 交互点补充）

> **来源**：teamclaw_v1.1-phase2-workflow-interaction-points.md §2

**三层交互架构**：

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Workflow 交互点全景图                               │
│                                                                      │
│  ┌─ Layer 1: Workflow 编辑层（人类操作）──────────────────────┐    │
│  │   节点拖拽 → 连线配置 → 参数设置 → 执行预览 → 发布          │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─ Layer 2: Workflow 执行层（AI 操作）──────────────────────┐    │
│  │   触发 → 节点1执行 → [条件判断] → 节点2执行 → ... → 结束    │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─ Layer 3: 上下文管理层（知识沉淀）────────────────────────┐    │
│  │   L1 核心规则 → L2-L3 配置知识 → L4 执行经验 → L5 版本归档   │    │
│  └───────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 2.2.2 节点类型 × 交互点矩阵（Phase 2 交互点补充）

> **来源**：teamclaw_v1.1-phase2-workflow-interaction-points.md §3

| 节点类型 | 交互点 | 上下文传递 | 最近前置原则 |
|---------|--------|-----------|------------|
| **sop** | before → executing(Skill执行) → after | SKILL.md + L1-L5 + skill_experiences | ✅ before_node |
| **ai_auto** | before → executing(LLM调用) → after | prompt + system_prompt + conversation_history | ✅ before_node |
| **input** | trigger → waiting → after(用户输入) | 表单字段定义 + 用户输入 | ✅ trigger |
| **condition** | on_condition → true/false分支 | expression + 变量绑定 | ✅ on_condition |
| **loop** | on_loop(迭代开始) → 循环体 → on_loop(迭代结束) | count + current_iteration + 累积产出 | ✅ on_loop |
| **parallel** | trigger → [并行执行] → after(汇聚) | 各分支产出 | ✅ trigger |
| **render** | before → executing(渲染) → after(预览) | template + 数据绑定 | ✅ before_node |
| **review** | trigger → waiting(审核) → approved/rejected | 交付物 + 审核意见 | ✅ trigger |

---

### 2.2.3 交互点定义（Phase 2 交互点补充）

| 交互点 | 说明 | 上下文传递 | 最近前置原则 |
|--------|------|-----------|------------|
| **trigger** | 触发器激活 | 触发参数 | ✅ |
| **before_node** | 节点执行前 | 节点配置 + 输入 | ✅ |
| **executing** | 节点执行中（**注意力保护：避免干扰**）| 实时状态 | ⚠️ |
| **after_node** | 节点执行后 | 节点产出 | ✅ |
| **on_condition** | 条件判断 | 分支选择依据 | ✅ |
| **on_loop** | 循环状态 | 循环计数 + 当前迭代 | ✅ |
| **on_error** | 异常处理 | 错误信息 + 重试策略 | ✅ |
| **completed** | Workflow 完成 | 最终产出 | ✅ |

---

### 2.2.4 L1-L5 Workflow 上下文分层（Phase 2 交互点补充）

> **来源**：teamclaw_v1.1-phase2-workflow-interaction-points.md §5

**L1 Workflow 守卫规则**：

```typescript
// Workflow 级别的 L1 规则，影响整个执行过程
interface WorkflowL1Rules {
  maxExecutionTime?: number;        // 最大执行时间（秒）
  maxTokenUsage?: number;           // 最大 Token 消耗
  requireHumanInLoop?: boolean;     // 是否需要人工介入点
  allowedTools?: string[];          // 允许的工具列表
  blockedPatterns?: string[];       // 禁止的模式
  minOutputLength?: number;         // 最小输出长度
  qualityGateThreshold?: number;     // 质量门槛
}
```

**L4 Workflow 执行经验**：

```typescript
// Workflow 执行产生的经验
interface WorkflowExperience {
  id: string;
  workflowId: string;
  scenario: string;                // 什么场景
  nodeOutputs: Record<string, unknown>;  // 各节点产出
  executionMetrics: {
    totalTokens: number;
    totalTime: number;
    successRate: number;
  };
  occurrenceCount: number;          // 同类执行次数
  optimizedFrom?: string;           // 优化自哪个版本
  createdAt: Date;
}
```

**L5 Workflow 版本归档**：

```typescript
// Workflow 版本历史
interface WorkflowVersionLog {
  id: string;
  workflowId: string;
  version: number;
  definition: WorkflowDefinition;   // 完整定义快照
  executionStats: {
    totalRuns: number;
    successRate: number;
    avgTokens: number;
    avgDuration: number;
  };
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

### 2.2.5 Workflow × Skill Evolution 协同（Phase 2 交互点补充）

> **来源**：teamclaw_v1.1-phase2-workflow-interaction-points.md §6

```
SOP 节点执行闭环：
│
├── Workflow 执行 SOP 节点
│   └── invoke_skill → 执行 SKILL.md
│
├── Skill 执行中
│   └── 加载 skill_experiences（Top 10）
│
├── 用户修正发生时
│   └── record_skill_experience → appendToL4()
│
├── Workflow 完成后
│   └── 记录此 Workflow 的节点执行经验（L4）
│   └── 同步更新 Skill 的 evolutionStats
│
└── 下次同一 Skill 被调用
    └── invoke_skill → 加载最新 skill_experiences
```

---

### 2.2.6 Workflow × Proactive Engine 协同（Phase 2 交互点补充）

> **来源**：teamclaw_v1.1-phase2-workflow-interaction-points.md §7

**Workflow 事件触发 Proactive**：

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

### 2.2.7 Workflow MCP 工具扩展（Phase 2 交互点补充）

> **来源**：teamclaw_v1.1-phase2-workflow-interaction-points.md §8

| 工具名 | 功能 | 实现位置 |
|--------|------|---------|
| `execute_workflow` | 执行 Workflow，支持断点续执行 | `src/core/workflow/mcp.ts` |
| `get_workflow_context` | 获取执行上下文 | `src/core/workflow/mcp.ts` |
| `record_workflow_experience` | 记录执行经验 | `src/core/workflow/mcp.ts` |
| `get_workflow_recommendations` | 获取优化建议（基于 L4） | `src/core/workflow/mcp.ts` |

**工具定义**：

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

### 2.2.8 Workflow Canvas 交互设计（Phase 2 交互点补充）

> **来源**：teamclaw_v1.1-phase2-workflow-interaction-points.md §9

| Canvas 操作 | 交互点 | 上下文 | 最近前置 |
|------------|--------|--------|---------|
| **拖拽节点** | drop | 节点类型 + 默认配置 | ✅ drop 时 |
| **连线** | connect | 源节点产出 → 目标节点输入 | ✅ 连线时 |
| **配置节点** | configure | 节点配置面板 | ✅ 选中时 |
| **预览执行** | preview | 执行结果 + 变量值 | ✅ 预览时 |
| **发布** | publish | 发布确认 + 版本号 | ✅ 发布时 |

**实时反馈**：

```
Canvas 实时反馈：
│
├── 节点悬停 → 显示节点简介（名称 + 类型 + 输入输出）
├── 节点执行中 → 显示执行状态 + 当前步骤（注意力保护：仅视觉反馈）
├── 节点执行完成 → 显示产出预览 + Token 消耗
└── 节点异常 → 显示错误信息 + 重试按钮
```

---

### 2.2.9 实现步骤

#### Step 1: 基础结构（~2h）
1. 安装 `@xyflow/react`（如果未安装）
2. 创建 `WorkflowCanvas.tsx` 基础画布
3. 创建 `NodePalette.tsx` 节点面板
4. 创建 `NodeConfigPanel.tsx` 配置面板
5. 创建基础 `BaseNode.tsx`

#### Step 2: 节点实现（~3h）
6. 实现 `SOPNode.tsx`（映射现有 7 种 StageType）
7. 实现 `ConditionNode.tsx`（分支选择 UI）
8. 实现 `LoopNode.tsx`（循环配置 UI）
9. 实现 `ParallelNode.tsx`（并行分支 UI）
10. 实现 `InputNode.tsx` 🆕（用户输入定义）
11. 实现 `RenderNode.tsx` 🆕（渲染模板选择）
12. 实现 `ReviewNode.tsx` 🆕（审核人选择）

#### Step 3: 编辑器集成（~3h）
13. 创建 `useWorkflowEditor` hook（状态管理）
14. 实现拖拽添加节点
15. 实现节点连线
16. 实现节点属性编辑
17. 实现保存/发布功能

#### Step 4: 执行集成（~2h）
18. 创建 `WorkflowRunPanel.tsx`
19. 集成 `WorkflowEngine.advance()`
20. 实现执行状态实时更新（SSE）
21. 实现断点续执行

#### Step 5: 交互点设计集成（~2h）
22. 实现 L1 Workflow 守卫规则加载
23. 实现 L4 WorkflowExperience 记录
24. 实现 L5 WorkflowVersionLog 归档
25. 集成 Workflow × Proactive 事件流

**Design Tokens 使用**：

```typescript
// 所有节点样式必须使用 Design Tokens
import { tokens } from '@/shared/ui/tokens';

// 节点基础样式
const nodeBase = {
  backgroundColor: tokens.colors.surface,
  borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.colors.border}`,
  padding: tokens.spacing.md,
};

// 节点状态样式
const nodeStates = {
  default: nodeBase,
  selected: { ...nodeBase, borderColor: tokens.colors.brand },
  running: { ...nodeBase, borderColor: tokens.colors.ai, boxShadow: tokens.shadows.glow },
  error: { ...nodeBase, borderColor: tokens.colors.danger },
};
```

**验收标准**：
- [ ] Workflow 列表页正常展示
- [ ] 可拖拽创建节点
- [ ] 可连线节点
- [ ] 可编辑节点属性
- [ ] 可保存/发布 Workflow
- [ ] 执行状态实时更新
- [ ] L1 守卫规则生效
- [ ] L4 经验记录可用
- [ ] `npm run build` 通过

---

### 2.3 P0-3: Marketplace UI（G3-01）

> **前置**：Settings 路由化完成  
> **工时**：~5h  
> **优先级**：🔴 P0  
> **理由**：Phase 3 Consumer 入口，Marketplace 无 UI 无法运营

**当前状态**：
- ✅ `Service` 表 + `ServiceRating` 表已创建
- ✅ `ActivationKey` + `Subscription` 后端已完成
- ✅ MCP 工具：`list_marketplace_services`, `subscribe_service`, `activate_service`, `submit_service_rating`
- ❌ Marketplace UI 缺失

**目标**：实现 Marketplace 消费者界面

**目录结构**：

```
src/features/marketplace/
├── MarketplacePage.tsx         # 市场首页
├── ServiceDetailPage.tsx      # 服务详情
├── components/
│   ├── ServiceCard.tsx        # 服务卡片
│   ├── ServiceGrid.tsx       # 服务网格
│   ├── CategoryFilter.tsx     # 分类筛选
│   ├── SearchBar.tsx          # 搜索栏
│   ├── RatingStars.tsx        # 评分星星
│   ├── PricingBadge.tsx       # 价格标签
│   └── ActivationForm.tsx     # 激活表单
└── hooks/
    └── useMarketplace.ts      # 市场数据管理
```

**页面路由**：

```
app/marketplace/
├── page.tsx                   # Marketplace 首页
└── [serviceId]/
    └── page.tsx               # 服务详情
```

**实现步骤**：

#### Step 1: 基础组件（~2h）
1. 创建 `ServiceCard.tsx`（卡片组件）
2. 创建 `ServiceGrid.tsx`（网格布局）
3. 创建 `SearchBar.tsx`（搜索组件）
4. 创建 `CategoryFilter.tsx`（分类筛选）
5. 创建 `RatingStars.tsx`（评分组件）

#### Step 2: Marketplace 首页（~2h）
6. 创建 `MarketplacePage.tsx`
7. 集成 `list_marketplace_services` MCP
8. 实现搜索功能
9. 实现分类筛选
10. 实现排序（popularityScore / effectivenessScore / rankWeight）

#### Step 3: 服务详情页（~1h）
11. 创建 `ServiceDetailPage.tsx`
12. 实现服务信息展示
13. 实现评分提交表单
14. 实现激活码兑换

**验收标准**：
- [ ] Marketplace 首页正常展示 Service 列表
- [ ] 搜索功能正常
- [ ] 分类筛选正常
- [ ] Service 详情页正常
- [ ] 评分可提交
- [ ] `npm run build` 通过

---

### 2.4 P0-4: 订阅管理 UI（G3-02）

> **前置**：Marketplace UI 完成  
> **工时**：~3h  
> **优先级**：🔴 P0  
> **理由**：Consumer 订阅管理，激活后需要管理界面

**目标**：实现 Consumer 订阅管理界面

**目录结构**：

```
src/features/consumer/
├── ConsumerDashboard.tsx       # Consumer 控制台
├── MySubscriptions.tsx        # 我的订阅
├── UsageStats.tsx             # 用量统计
├── ActivationKeys.tsx         # 激活码管理
├── components/
│   ├── SubscriptionCard.tsx   # 订阅卡片
│   ├── UsageChart.tsx         # 用量图表
│   ├── QuotaBar.tsx           # 配额进度条
│   └── ActivationForm.tsx     # 激活表单
└── hooks/
    └── useConsumer.ts         # Consumer 数据管理
```

**页面路由**：

```
app/consumer/
├── page.tsx                   # Consumer Dashboard
├── subscriptions/page.tsx     # 我的订阅
├── usage/page.tsx             # 用量统计
└── activations/page.tsx        # 激活码管理
```

**实现步骤**：

1. 创建 `ConsumerDashboard.tsx`
2. 创建 `MySubscriptions.tsx`
3. 创建 `SubscriptionCard.tsx`
4. 创建 `UsageStats.tsx`（集成 recharts）
5. 创建 `QuotaBar.tsx`
6. 创建 `ActivationForm.tsx`
7. 集成 Subscription API
8. 集成 Usage API

**验收标准**：
- [ ] Consumer Dashboard 正常展示
- [ ] 订阅列表正常
- [ ] 用量统计图表正常
- [ ] 激活码管理正常
- [ ] `npm run build` 通过

---

## 三、P1 执行计划（功能完善）

### 3.1 Phase 1A 收尾（G1A-01）

> **前置**：无  
> **工时**：~1h  
> **优先级**：🟡 P1

**目标**：补充 Adapter healthCheck() 方法

```typescript
// src/core/adapters/db/sqlite-connection-adapter.ts

async healthCheck(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    await this.db.select().from(sqlite_master).limit(1);
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}
```

---

### 3.2 Phase 1B 收尾（G1B-01）

> **前置**：无  
> **工时**：~2h  
> **优先级**：🟡 P1

**目标**：Skill Store UI 增加经验展示

```typescript
// src/features/skill-manager/SkillDetailPage.tsx

// 添加经验展示区块
const SkillExperienceSection = ({ skillId }: { skillId: string }) => {
  const { data: experiences } = useQuery({
    queryKey: ['skill-experiences', skillId],
    queryFn: () => invoke('get_skill_experiences', { skill_id: skillId, limit: 10 }),
  });

  return (
    <div className="space-y-4">
      <h3>历史经验</h3>
      {experiences?.map(exp => (
        <ExperienceCard key={exp.id} experience={exp} />
      ))}
    </div>
  );
};
```

---

### 3.3 Phase 2 节点补充（G2-02 ~ G2-05）

> **前置**：Workflow 编辑器基础完成  
> **工时**：~4h  
> **优先级**：🟡 P1

**目标**：实现缺失的 4 种节点类型

| 节点 | 实现文件 | 说明 |
|------|---------|------|
| `input` | `src/features/workflow-editor/components/nodes/InputNode.tsx` | 用户输入字段定义 |
| `loop` | `src/features/workflow-editor/components/nodes/LoopNode.tsx` | 循环配置 + 退出条件 |
| `render` | `src/features/workflow-editor/components/nodes/RenderNode.tsx` | Content Studio 渲染模板选择 |
| `review` | `src/features/workflow-editor/components/nodes/ReviewNode.tsx` | 审核人选择 + 审核流程 |

**验收标准**：
- [ ] 4 种节点可在编辑器中使用
- [ ] 节点配置正确保存
- [ ] `npm run build` 通过

---

### 3.4 Phase 4 UI（G4-01）

> **前置**：Workflow 编辑器完成  
> **工时**：~4h  
> **优先级**：🟡 P1

**目标**：ProactiveRule 管理 UI

**目录结构**：

```
src/features/proactive/
├── ProactiveRulesPage.tsx     # 规则列表
├── RuleEditor.tsx             # 规则编辑器
├── ProactiveHistory.tsx       # 触发历史
└── components/
    ├── RuleCard.tsx           # 规则卡片
    ├── TriggerConfig.tsx      # 触发条件配置
    └── ActionConfig.tsx       # 动作配置
```

**页面路由**：

```
app/triggers/                   # 🆕 Proactive Engine 入口
├── page.tsx                    # 规则列表
├── new/page.tsx                # 创建规则
└── [ruleId]/
    └── page.tsx                # 编辑规则
```

---

### 3.5 OpenClaw 集成（G-OC 系列）

> **前置**：Settings 路由化完成  
> **工时**：~4h  
> **优先级**：🟡 P1  
> **来源**：teamclaw_v1.1-openclaw-integration.md

#### 3.5.1 OpenClaw 配置适配器（G-OC-03）

```typescript
// src/core/gateway/adapters/openclaw-config.adapter.ts

export interface OpenClawConfigAdapter {
  getConfig(): Promise<OpenClawConfig>;
  getConfigPath(path: string): Promise<unknown>;
  setConfig(path: string, value: unknown): Promise<void>;
  unsetConfig(path: string): Promise<void>;
  validateConfig(): Promise<ValidationResult>;
  doctor(): Promise<DiagnosticResult>;
  onConfigChange(callback: (event: ConfigChangeEvent) => void): void;
  reload(): Promise<void>;
}
```

#### 3.5.2 ClawHub 客户端（G-OC-02）

```typescript
// src/core/clawhub/client.ts

export interface ClawHubClient {
  searchSkills(query: string, filters?: SkillFilters): Promise<ClawHubSkill[]>;
  getFeaturedSkills(): Promise<ClawHubSkill[]>;
  getSkillBySlug(slug: string): Promise<ClawHubSkillDetail>;
  installSkill(slug: string, targetDir: string): Promise<InstallResult>;
  updateSkill(slug: string): Promise<UpdateResult>;
  syncAll(): Promise<SyncResult>;
}
```

#### 3.5.3 插件清单解析器（G-OC-01）

```typescript
// src/core/plugins/registry.ts

export class PluginRegistry {
  async discover(config: OpenClawConfig): Promise<OpenClawPlugin[]>;
  async getPlugin(id: string): Promise<OpenClawPlugin | null>;
  async enablePlugin(id: string): Promise<void>;
  async disablePlugin(id: string): Promise<void>;
  async getPluginStatus(): Promise<PluginStatusMap>;
}
```

#### 3.5.4 Hook 系统集成（G-OC-05）

```typescript
// TeamClaw Hook 注册

export interface TeamClawHooks {
  before_tool_call: {
    block: true,
    handler: async (toolName: string, params: unknown) => {
      const hasPermission = await checkToolPermission(getCurrentConsumerId(), toolName);
      if (!hasPermission) throw new PermissionDeniedError(toolName);
      await recordToolUsage(getCurrentConsumerId(), toolName);
    }
  };
  after_tool_call: {
    handler: async (toolName: string, result: unknown) => {
      await recordToolResult(toolName, result);
    }
  };
}
```

---

### 3.6 Command Bar（G-UI-02）

> **前置**：Settings 路由化完成  
> **工时**：~3h  
> **优先级**：🟡 P1

**目标**：实现全局命令面板（⌘K）

```typescript
// src/shared/layout/CommandBar.tsx

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 快捷命令
const commands = [
  { id: 'goto-dashboard', label: '前往仪表盘', shortcut: 'G D' },
  { id: 'goto-tasks', label: '前往任务', shortcut: 'G T' },
  { id: 'create-task', label: '创建任务', shortcut: 'C T' },
  { id: 'toggle-theme', label: '切换主题', shortcut: '⌘ J' },
  { id: 'open-settings', label: '打开设置', shortcut: '⌘ ,' },
];

// 集成 cmdk 库
import { Command } from 'cmdk';
```

---

## 四、竞品增强（P1 延展）

> **来源**：deskclaw-vs-teamclaw-analysis.md

### 4.1 Task 价值追踪（G-竞品-01）

> **来源**：DeskClaw WorkspaceTask 数据模型

**目标**：Task 增加价值追踪字段

```typescript
// src/core/db/schema.ts 扩展 Task 表

export const tasks = pgTable('tasks', {
  // ... 现有字段 ...
  
  // 🆕 价值追踪（借鉴 DeskClaw）
  estimatedValue: real('estimated_value'),      // 预估价值（元）
  actualValue: real('actual_value'),            // 实际价值（元）
  tokenCost: integer('token_cost'),             // Token 消耗
});

// 🆕 Task 价值归因 API
interface TaskValueAPI {
  updateEstimatedValue(taskId: string, value: number): Promise<void>;
  recordTokenConsumption(taskId: string, tokens: number): Promise<void>;
  calculateActualValue(taskId: string): Promise<number>;
}
```

**目录结构**：

```
src/features/task-value/
├── TaskValueBadge.tsx      # 价值标签
├── TokenCostIndicator.tsx  # Token 消耗指示器
├── ValueChart.tsx          # 价值图表
└── hooks/
    └── useTaskValue.ts      # 价值追踪 hook
```

**验收标准**：
- [ ] Task 创建时可设置预估价值
- [ ] AI 执行时自动记录 Token 消耗
- [ ] Task 完成后可计算实际价值
- [ ] Dashboard 可查看团队价值统计

---

### 4.2 效能度量面板基础（G-竞品-02）

> **来源**：DeskClaw Performance 模块

**目标**：实现基础的效能度量面板

**目录结构**：

```
src/features/performance/
├── PerformanceDashboard.tsx  # 效能概览
├── ValueMetrics.tsx         # 价值指标
├── TokenMetrics.tsx         # Token 消耗指标
├── TeamMetrics.tsx          # 团队效能
└── hooks/
    └── usePerformance.ts    # 效能数据 hook
```

**页面路由**：

```
app/performance/              # 🆕 效能中心
├── page.tsx                  # 效能概览
├── value/page.tsx           # 价值分析
└── tokens/page.tsx          # Token 消耗分析
```

**验收标准**：
- [ ] 效能概览页正常展示
- [ ] Token 消耗可归因到具体 Task
- [ ] 团队/个人视图可用
- [ ] `npm run build` 通过

---

## 五、UI 重构整合

### 5.1 AppShell 2.0（G-UI-03）

> **前置**：Settings 路由化完成  
> **工时**：~4h  
> **优先级**：🟡 P1  
> **来源**：teamclaw_v1.1-ui-redesign.md §4

**目标**：统一布局系统

```typescript
// src/shared/layout/AppShell2.tsx

interface AppShell2Props {
  children: React.ReactNode;
  variant?: 'default' | 'minimal' | 'fullscreen';
  showSidebar?: boolean;
  showHeader?: boolean;
  sidebarCollapsed?: boolean;
}

// 布局变体
type LayoutVariant = 'default' | 'editor' | 'wizard' | 'auth';
```

**布局结构**：

```
┌────────────────────────────────────────────────────────────────────┐
│                     Header (可折叠)                                │
│  [Logo] [Breadcrumb]          [Search] [Notifications] [User]      │
├────────────┬───────────────────────────────────────────────────────┤
│            │                                                        │
│  Sidebar   │               Main Content                             │
│  (可折叠)   │                                                        │
│            │                                                        │
├────────────┴───────────────────────────────────────────────────────┤
│                     Command Bar (⌘K)                                │
└────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Sidebar 2.0（G-UI-04）

> **来源**：teamclaw_v1.1-ui-redesign.md §4.2

```typescript
// src/shared/layout/Sidebar2.tsx

interface Sidebar2Props {
  items: NavItem[];
  groups: NavGroup[];
  activeId: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: (id: string) => void;
}

interface NavGroup {
  id: string;
  label: string;
  icon?: React.ElementType;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  children?: NavItem[];
}
```

**导航分组**（来源：teamclaw_v1.1-ui-redesign.md §3）：

```
快捷入口
  └── Dashboard

工作区
  └── Project → Task / Wiki / Member

自动化
  └── Schedule → Workflows / Triggers

资产库
  └── Skills → SkillHub / SOP

协作
  └── Deliveries → Approvals / Sessions / OKR

运营
  └── Marketplace → Subscriptions / Earnings

管理
  └── Settings → General / OpenClaw / Plugins / Channels / Security / Landing / Debug / About
```

---

### 5.3 Dashboard 2.0（G-UI-05）

> **前置**：AppShell 2.0 完成  
> **工时**：~3h  
> **优先级**：🟡 P1  
> **来源**：teamclaw_v1.1-ui-redesign.md §6.1

**目标**：从信息聚合 → 指挥中心

```
┌────────────────────────────────────────────────────────────────────┐
│  Dashboard 2.0 — 指挥中心                                           │
│                                                                     │
│  ┌─ Gateway 状态卡片 ──────────────────────────────────────────┐   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ ● OK   │ │ Uptime  │ │Sessions │ │ Channels│           │   │
│  │  │ 运行中  │ │  12h    │ │   5     │ │  4/6    │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ 今日概览 ─────────────────────────────────────────────────┐   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │   │
│  │  │ 进行中  │ │ 待审核  │ │ 待交付  │ │ 工作 AI │              │   │
│  │  │   8    │ │   3    │ │   2    │ │   2    │              │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ 快捷入口 ─────────────────────────────────────────────────┐   │
│  │  [任务] [文档] [技能] [定时] [审批]                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ AI 团队状态 ─┐  ┌─ 项目进度 ─────────────────────────────┐   │
│  │               │  │                                      │   │
│  │ 🤖 AI-001 运行 │  │  项目A  ████████░░░░░░░░░  40%       │   │
│  │ 🤖 AI-002 空闲 │  │  项目B  ██████████████░░  80%       │   │
│  │ 🤖 AI-003 空闲 │  │  项目C  ████░░░░░░░░░░░░░  20%       │   │
│  │               │  │                                      │   │
│  └───────────────┘  └──────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

### 5.4 响应式断点系统（G-UI-06）

> **来源**：teamclaw_v1.1-ui-redesign.md §7

| 断点 | 范围 | 布局 |
|------|------|------|
| **xs** | < 640px | 单列，移动优先 |
| **sm** | 640-767px | 简化侧边栏 |
| **md** | 768-1023px | 可折叠侧边栏 |
| **lg** | 1024-1279px | 标准布局 |
| **xl** | 1280-1535px | 扩展布局 |
| **2xl** | ≥ 1536px | 宽屏优化 |

---

### 5.5 动画规范（G-UI-07）

> **来源**：teamclaw_v1.1-ui-redesign.md §8.2

```typescript
// src/shared/ui/motion.ts

export const motion = {
  // 快速反馈（按钮点击、切换）
  quick: { duration: 150, easing: 'ease-out' },
  
  // 正常过渡（页面切换、展开收起）
  normal: { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  
  // 缓慢动画（数据加载、进度）
  slow: { duration: 500, easing: 'ease-in-out' },
  
  // 特殊效果
  bounce: { duration: 600, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
};
```

---

### 5.6 错误处理层级（G-UI-08）

> **来源**：teamclaw_v1.1-ui-redesign.md §8.3

```
Level 1: 内联错误（Inline）
  └── 表单字段验证

Level 2: Toast 通知
  └── 操作失败、成功、警告

Level 3: 确认对话框
  └── 危险操作确认

Level 4: 错误页面
  └── 严重错误、网络问题
```

---

## 六、AI 工时汇总

### 6.1 调整后的工时分配

| 优先级 | 任务 | 工时 | 来源 |
|--------|------|------|------|
| 🔴 P0-1 | Settings 路由化 | 2h | GAP 分析 |
| 🔴 P0-2 | Workflow 可视化编辑器 | 12h | GAP + Phase 2 交互点 |
| 🔴 P0-3 | Marketplace UI | 5h | GAP 分析 |
| 🔴 P0-4 | 订阅管理 UI | 3h | GAP 分析 |
| 🟡 P1-1 | Phase 1A 收尾 | 1h | GAP 分析 |
| 🟡 P1-2 | Phase 1B 收尾 | 2h | GAP 分析 |
| 🟡 P1-3 | Phase 2 节点补充 | 4h | GAP 分析 |
| 🟡 P1-4 | Phase 4 UI | 4h | GAP 分析 |
| 🟡 P1-5 | OpenClaw 集成 | 4h | OpenClaw 集成 |
| 🟡 P1-6 | Command Bar | 3h | UI 重构 |
| 🟡 P1-7 | AppShell 2.0 | 4h | UI 重构 |
| 🟡 P1-8 | Sidebar 2.0 | 2h | UI 重构 |
| 🟡 P1-9 | Dashboard 2.0 | 3h | UI 重构 |
| 🟡 P1-10 | Task 价值追踪 | 2h | 竞品分析 |
| 🟡 P1-11 | 效能面板基础 | 1h | 竞品分析 |
| 🟢 P2-1 | 测试 + 文档 | 3h | — |
| **总计** | | **~51h** | |

### 6.2 执行顺序

```
Week 1:
├── Day 1-2: P0-1 Settings 路由化
├── Day 3-4: P0-2 Workflow 编辑器 Step 1-2
└── Day 5:   P0-2 Workflow 编辑器 Step 3

Week 2:
├── Day 1-2: P0-2 Workflow 编辑器 Step 4 + Step 5
├── Day 3-4: P0-3 Marketplace UI
└── Day 5:   P0-4 订阅管理 UI

Week 3:
├── Day 1-2: P1-3 Phase 2 节点补充
├── Day 3:   P1-4 Phase 4 UI
├── Day 4:   P1-5 OpenClaw 集成
└── Day 5:   P1-6 Command Bar

Week 4:
├── Day 1-2: P1-7 AppShell 2.0 + P1-8 Sidebar 2.0
├── Day 3:   P1-9 Dashboard 2.0
├── Day 4:   P1-10 Task 价值追踪 + P1-11 效能面板
└── Day 5:   P1-1 Phase 1A 收尾 + P1-2 Phase 1B 收尾

Week 5:
├── Day 1-2: P2-1 测试
├── Day 3:   P2-1 文档
└── Day 4-5: 缓冲 + 收尾
```

---

## 七、设计原则合规性

> **依据**：[Agent 协作平台设计原则](.codebuddy/rules/agent-collaboration-design-principles.mdc)  
> **状态**：✅ 所有 Phase 均已通过合规性验证

### 7.1 三大设计原则速查

#### 原则一：原子能力优先

```
需求 ──▶ 盘点现有原子能力 ──▶ 能组合则不新建 ──▶ 无法构建才新建
              │                              │
              ▼                              ▼
        37个MCP工具                    与用户确认新建
        现有Rule/Skill                 纳入原子能力库
```

#### 原则二：闭环设计强制性

```
盘点交互点 ──▶ 分解上下文 ──▶ 插入最近前置交互点 ──▶ 不破坏 LLM 注意力
```

#### 原则三：分层上下文设计

| 层级 | 内容类型 | 注入时机 | TeamClaw 实现 |
|------|----------|----------|---------------|
| **L1** | 核心规则/概要 | 任务推送时 | ✅ 已有 |
| **L2-L3** | 详细标准/案例 | 按需读取 | ✅ 已有 |
| **L4** | 经验记录/踩坑 | Agent 动态写入 | ✅ 已有 |
| **L5** | 维护日志/变更 | 人工归档 | ✅ 已有 |

---

### 7.2 各 Phase 原则合规性验证

#### Phase 1A: Adapter System

| 原则 | 验证项 | 状态 | 说明 |
|------|--------|------|------|
| **原子能力** | 复用现有 Drizzle ORM | ✅ | 不重新造轮子 |
| **闭环设计** | Adapter 接口 → 实现 → 注入 | ✅ | 不破坏现有闭环 |
| **分层上下文** | N/A | N/A | 基础设施层 |

**合规性自检清单**：
- [ ] 是否复用现有 Drizzle ORM 而非新建 ORM？
- [ ] Adapter 接口变更是否向后兼容？
- [ ] 是否通过 AdapterRegistry 统一管理？

---

#### Phase 1B: Skill Evolution Engine

| 原则 | 验证项 | 状态 | 说明 |
|------|--------|------|------|
| **原子能力** | 复用 `knowhow-parser.ts`、`update_knowledge` | ✅ | 基于现有实现 |
| **闭环设计** | §8.6 完整闭环：执行 → 记录 → 晋升 → 复用 | ✅ | 4 个交互点 |
| **分层上下文** | L1-L5 完整分层 | ✅ | `metadata.evolution` 扩展 |

**合规性自检清单**：
- [ ] `record_skill_experience` 是否复用现有 knowhow-parser？
- [ ] `get_skill_experiences` 是否支持 Top 10 限制？
- [ ] `promote_skill_experience` 是否检查 occurrenceCount ≥ 3？
- [ ] L4 经验追加是否使用 `appendToL4()`？
- [ ] 晋升后的 L1 规则是否 ≤ 5 条，每条 < 50 tokens？
- [ ] SSE 事件是否在写操作后触发？

---

#### Phase 2: Workflow Engine

| 原则 | 验证项 | 状态 | 说明 |
|------|--------|------|------|
| **原子能力** | 复用 SOP StageType + Skill Executor + knowhow-parser | ✅ | 8 种节点复用 |
| **闭环设计** | 节点类型 × 交互点矩阵 + 三层视角闭环 | ✅ | 8 个交互点 |
| **分层上下文** | L1 守卫 + L2-L3 配置 + L4 经验 + L5 归档 | ✅ | WorkflowExperience |

**合规性自检清单**：
- [ ] **原子能力**：
  - [ ] 是否复用现有 `invoke_skill` MCP？
  - [ ] 是否复用现有 `knowhow-parser`？
  - [ ] 是否复用现有 `ExecutionContext`？
  - [ ] 新建工具：`execute_workflow`, `get_workflow_context`, `record_workflow_experience` 是否纳入索引？

- [ ] **闭环设计**：
  - [ ] 是否盘点所有 8 种节点的交互点？
  - [ ] `before_node` 是否加载节点配置 + 输入？
  - [ ] `executing` 是否避免干扰 LLM 注意力？
  - [ ] `after_node` 是否记录节点产出？
  - [ ] `on_error` 是否包含重试策略？

- [ ] **分层上下文**：
  - [ ] L1 Workflow 守卫规则是否 ≤ 5 条？
  - [ ] L4 WorkflowExperience 是否记录 nodeOutputs？
  - [ ] L5 WorkflowVersionLog 是否包含版本快照？

- [ ] **最近前置原则**：
  - [ ] 节点上下文是否在 `before_node` 加载？
  - [ ] 产出是否立即传递到下一步？
  - [ ] 经验是否在 `after_node` 记录？

---

#### Phase 3: Marketplace + Consumer

| 原则 | 验证项 | 状态 | 说明 |
|------|--------|------|------|
| **原子能力** | Service 复用现有 AI App + Workflow | ✅ | 扩展非新建 |
| **闭环设计** | 发布 → 订阅 → 使用 → 评分 → 进化 | ✅ | 5 步闭环 |
| **分层上下文** | N/A | N/A | Consumer 无知识库 |

**合规性自检清单**：
- [ ] Service 是否复用现有 AIApp/Workflow 实体？
- [ ] 订阅流程是否包含激活码验证？
- [ ] 评分是否触发 Skill/Workflow 进化？
- [ ] SSE 事件是否在订阅/评分时触发？

---

#### Phase 4: Proactive Engine

| 原则 | 验证项 | 状态 | 说明 |
|------|--------|------|------|
| **原子能力** | 复用 EventLog + Task + Delivery | ✅ | 基于现有事件 |
| **闭环设计** | 触发 → 分析 → 决策 → 行动 → 反馈 | ✅ | 5 步闭环 |
| **分层上下文** | N/A | N/A | 自动化引擎层 |

**合规性自检清单**：
- [ ] 是否复用 `eventBus` 而非新建事件系统？
- [ ] 规则触发是否支持条件表达式？
- [ ] 动作是否支持多种类型（notify/suggest/retry）？
- [ ] 规则变更是否触发 SSE 事件？

---

#### OpenClaw 集成

| 原则 | 验证项 | 状态 | 说明 |
|------|--------|------|------|
| **原子能力** | 复用 OpenClaw Plugin SDK + ClawHub API | ✅ | API 对接优先 |
| **闭环设计** | Hook → Proactive Engine → Action | ✅ | 事件驱动 |
| **分层上下文** | `metadata.openclaw` 扩展 | ✅ | 兼容 TeamClaw |

**合规性自检清单**：
- [ ] 是否优先使用 OpenClaw 配置 API 而非直接读写文件？
- [ ] 插件解析是否复用 OpenClaw Plugin SDK？
- [ ] Hook Handler 是否复用现有权限/用量记录？
- [ ] ClawHub 同步是否支持离线模式？

---

#### UI 重构

| 原则 | 验证项 | 状态 | 说明 |
|------|--------|------|------|
| **原子能力** | 复用 Design Tokens + 现有组件 | ✅ | 14 个基础组件 |
| **闭环设计** | 交互点完整盘点（§8.1-§8.3）| ✅ | 4 级错误处理 |
| **分层上下文** | N/A | N/A | UI 层无知识库 |

**合规性自检清单**：
- [ ] 是否使用 Design Tokens 而非硬编码颜色/间距？
- [ ] 组件是否按 Primitives → Composites → Patterns → Features 分层？
- [ ] 错误处理是否按 Inline → Toast → Confirmation → Error Page 分级？
- [ ] 动画是否使用 Motion Primitives 统一规范？

---

### 7.3 通用禁止事项

| 禁止项 | 原因 | 检查 |
|--------|------|------|
| ❌ 在执行过程中插入无关提示 | 破坏 LLM 注意力 | - |
| ❌ 在多个交互点重复同一信息 | 浪费上下文 | - |
| ❌ 新建原子能力未与用户确认 | 违反 原子能力优先 | - |
| ❌ 推送模板冗长，详细内容未在对应交互点展开 | 破坏注意力 | - |
| ❌ L1 规则超过 5 条 | 超出 LLM 处理能力 | - |
| ❌ L1 规则单条超过 50 tokens | 影响上下文注入效率 | - |

---

### 7.4 开发前合规性自检模板

每个 Phase/功能开发前，必须完成以下自检：

```
┌─────────────────────────────────────────────────────────────┐
│  设计原则合规性自检清单                                        │
│                                                              │
│  Phase/功能名称: _______________________                    │
│  开发日期: __________________________                        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  原则一：原子能力优先                                         │
│  ─────────────────────────────────────────────────────────  │
│  □ 盘点现有 37 个 MCP 工具，是否有可复用的？                  │
│  □ 盘点现有 SKILL/SOP，是否可组合？                          │
│  □ 新建功能的原子能力价值是什么？                            │
│  □ 是否纳入原子能力库索引？                                  │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  原则二：闭环设计强制性                                       │
│  ─────────────────────────────────────────────────────────  │
│  □ 盘点此功能的所有 Agent 交互点                              │
│  □ 分解需要传递的上下文单元                                  │
│  □ 选择最近前置交互点插入                                     │
│  □ 验证：不破坏 LLM 注意力？                                 │
│  □ 画出完整闭环：消费 → 生产 → 复用                          │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  原则三：分层上下文设计                                       │
│  ─────────────────────────────────────────────────────────  │
│  □ L1 是否需要在任务推送时强制注入？                         │
│  □ L2-L3 是否按需读取（Agent 主动请求）？                    │
│  □ L4 是否 Agent 动态写入？                                  │
│  □ L5 是否人工归档？                                         │
│  □ L1 规则数是否 ≤ 5 条，每条 < 50 tokens？                 │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  禁止事项检查                                                 │
│  ─────────────────────────────────────────────────────────  │
│  □ 不会在执行过程中插入无关提示？                            │
│  □ 不会在多个交互点重复同一信息？                            │
│  □ 新建原子能力已与用户确认？                                │
│  □ 推送模板精简，详细说明在对应交互点展开？                   │
│                                                              │
│  检查结果: □ 通过  □ 需修改                                  │
│  备注: __________________________________________________   │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.5 合规性验证记录

| 日期 | Phase/功能 | 验证人 | 结果 | 备注 |
|------|-----------|--------|------|------|
| 2026-03-26 | v1.1 整体规划 | AI Review | ✅ 通过 | 主体合规 |
| 2026-03-26 | Phase 1A | AI Review | ✅ 通过 | - |
| 2026-03-26 | Phase 1B | AI Review | ✅ 通过 | - |
| 2026-03-26 | Phase 2 | AI Review | ✅ 通过 | 交互点已设计 |
| 2026-03-26 | Phase 3 | AI Review | ✅ 通过 | - |
| 2026-03-26 | Phase 4 | AI Review | ✅ 通过 | - |
| 2026-03-26 | OpenClaw 集成 | AI Review | ✅ 通过 | - |
| 2026-03-26 | UI 重构 | AI Review | ✅ 通过 | Design Tokens |
| 2026-03-26 | 竞品增强 | AI Review | ✅ 通过 | Task 价值追踪 |

---

## 八、验收标准总览

### 8.1 P0 验收

| ID | 任务 | 验收条件 |
|----|------|---------|
| P0-1 | Settings 路由化 | 7 个子路由可访问，权限正常 |
| P0-2 | Workflow 编辑器 | 可拖拽/连线/配置/执行，L1-L5 上下文生效 |
| P0-3 | Marketplace UI | 列表/搜索/详情/评分 |
| P0-4 | 订阅管理 UI | 订阅/用量/激活码 |

### 8.2 P1 验收

| ID | 任务 | 验收条件 |
|----|------|---------|
| P1-1 | Phase 1A 收尾 | healthCheck() 正常工作 |
| P1-2 | Phase 1B 收尾 | Skill 详情页显示经验 |
| P1-3 | Phase 2 节点 | 8 种节点类型完整 |
| P1-4 | Phase 4 UI | 规则 CRUD 完整 |
| P1-5 | OpenClaw 集成 | 配置适配器/ClawHub/插件解析器 |
| P1-6 | Command Bar | ⌘K 打开，命令执行正常 |
| P1-7 | AppShell 2.0 | 布局统一，响应式正常 |
| P1-8 | Sidebar 2.0 | 导航分组清晰，可折叠 |
| P1-9 | Dashboard 2.0 | 指挥中心视图，信息层次清晰 |
| P1-10 | Task 价值追踪 | 预估价值/Token消耗/实际价值 |
| P1-11 | 效能面板 | 团队/个人视图，Token归因 |

### 8.3 P2 验收

| ID | 任务 | 验收条件 |
|----|------|---------|
| P2-1 | 测试 + 文档 | 覆盖率 ≥ 80%，文档完整 |

---

## 九、编码规范提醒

### 9.1 必须遵守

| 规则 | 说明 |
|------|------|
| **Design Tokens** | 所有颜色/间距/圆角必须使用 `tokens` |
| **组件分层** | Primitives → Composites → Patterns → Features |
| **Zustand Store** | 每个 Domain 一个 Store，统一模式 |
| **API 错误** | 英文错误消息，前端通过 `t()` 翻译 |
| **SSE 事件** | 写操作后必须 `eventBus.emit()` |
| **i18n** | 所有用户可见文本用 `t()` |

### 9.2 文件行数限制

| 类型 | 警告 | 阻塞 |
|------|------|------|
| 组件文件 | 400 行 | 800 行 |
| Store 文件 | 200 行 | 400 行 |
| API Route | 150 行 | 300 行 |
| Hook 文件 | 100 行 | 200 行 |

---

## 十、关联文档

| 文档 | 位置 | 关系 |
|------|------|------|
| v1.1 主规划 | `docs/optimization/teamclaw_v1.1.md` | 完整需求分析 |
| GAP 分析 | `docs/optimization/teamclaw_v1.1-gap-analysis.md` | 当前完成度 |
| UI 重构方案 | `docs/optimization/teamclaw_v1.1-ui-redesign.md` | UI 设计参考 |
| 设计原则 | `.codebuddy/rules/agent-collaboration-design-principles.mdc` | 设计约束 |
| **设计原则合规性** | `docs/optimization/teamclaw_v1.1-design-principles-compliance.md` | 合规性验证 |
| OpenClaw 集成 | `docs/optimization/teamclaw_v1.1-openclaw-integration.md` | 技术增强 |
| Phase 2 交互点 | `docs/optimization/teamclaw_v1.1-phase2-workflow-interaction-points.md` | Workflow 交互设计 |
| 竞品分析 | `docs/optimization/deskclaw-vs-teamclaw-analysis.md` | 参考 |

---

_Last updated: 2026-03-26_
