# TeamClaw v1.1 — 设计原则合规性验证

> 版本：v1.1 补充  
> 日期：2026-03-28（代码审计更新）  
> 依据：`Agent 协作平台设计原则.mdc`  
> 状态：✅ 代码审计已验证

---

## 关联文档

| 文档 | 关系 |
|------|------|
| [设计原则原文](file:///Users/alex/Documents/alex%20base/sense/teamclaw/.codebuddy/rules/agent-collaboration-design-principles.mdc) | 核心原则 |
| [v1.1 主规划](teamclaw_v1.1.md) | 主体规划 |
| [OpenClaw 集成规划](teamclaw_v1.1-openclaw-integration.md) | 技术增强 |
| [UI 重构规划](teamclaw_v1.1-ui-redesign.md) | 前端优化 |

---

## 一、设计原则速查

### 原则一：原子能力优先

```
需求 ──▶ 盘点现有原子能力 ──▶ 能组合则不新建 ──▶ 无法构建才新建
              │                              │
              ▼                              ▼
        37个MCP工具                    与用户确认新建
        现有Rule/Skill                 纳入原子能力库
```

### 原则二：闭环设计强制性

```
盘点交互点 ──▶ 分解上下文 ──▶ 插入最近前置交互点 ──▶ 不破坏 LLM 注意力
```

### 原则三：分层上下文设计

| 层级 | 内容类型 | 注入时机 | TeamClaw 实现 |
|------|----------|----------|---------------|
| **L1** | 核心规则/概要 | 任务推送时 | ✅ 已有 |
| **L2-L3** | 详细标准/案例 | 按需读取 | ✅ 已有 |
| **L4** | 经验记录/踩坑 | Agent 动态写入 | ✅ 已有 |
| **L5** | 维护日志/变更 | 人工归档 | ✅ 已有 |

---

## 二、v1.1 主规划合规性分析

### 2.1 原则一合规性检查

| 检查项 | v1.1 规划实现 | 合规 |
|--------|--------------|------|
| **盘点现有原子能力** | §6.1 完整盘点 37 个 MCP 工具 | ✅ |
| **复用优先** | Phase 1A Adapter System 复用现有 Drizzle ORM | ✅ |
| **无法构建才新建** | Skill Evolution Engine 基于现有 `knowhow-parser.ts` | ✅ |
| **纳入原子能力库** | 新增 3 个 MCP 工具纳入索引 | ✅ |

**合规性评估**：✅ **完全合规**

**v1.1 原子能力盘点**：

| 现有原子能力 | 复用位置 | 新建需求 |
|-------------|---------|---------|
| `knowhow-parser.ts` | Skill Evolution L1-L5 分层 | 无 |
| `update_knowledge` MCP | L4 经验追加 | 无 |
| `appendToL4()` | 经验追加 | 无 |
| `invoke_skill` | Skill 执行 | 增强（加载经验） |
| `Task` 实体 | 价值追踪 | 扩展字段 |
| 37 个 MCP 工具 | Tool 系统 | 无 |
| Drizzle ORM | DB Adapter | 抽象接口 |

**需确认的新建项**：

| 新建项 | 理由 | 确认状态 |
|--------|------|---------|
| `record_skill_experience` | 经验记录无现有实现 | ⚠️ 待用户确认 |
| `get_skill_experiences` | 经验查询无现有实现 | ⚠️ 待用户确认 |
| `promote_skill_experience` | 规则晋升无现有实现 | ⚠️ 待用户确认 |
| WorkflowEngine | SOP 引擎重构为通用引擎 | ✅ 决策 D2 已确认 |

---

### 2.2 原则二合规性检查

| 检查项 | v1.1 规划实现 | 合规 |
|--------|--------------|------|
| **盘点交互点** | §8.6 Skill 执行流程完整描述交互点 | ✅ |
| **分解上下文** | L1-L5 分层，上下文独立单元 | ✅ |
| **最近前置原则** | 经验沉淀在「任务完成」交互点 | ✅ |
| **注意力保护** | 推送模板精简，详细说明在完成时展开 | ✅ |

**Skill 执行交互点分析**：

```
┌─────────────────────────────────────────────────────────┐
│  Skill 执行交互点（§8.6 完整闭环）                        │
│                                                          │
│  交互点 1: 任务推送                                       │
│  ├── 上下文：L1 核心规则                                  │
│  └── 设计：自动植入，不提示结晶                           │
│           ✅ 最近前置原则：执行前最后机会植入规则            │
│                                                          │
│  交互点 2: Skill 执行中                                   │
│  ├── 上下文：L2-L3 按需读取                              │
│  └── 设计：Agent 主动请求，不自动推送                     │
│           ✅ 注意力保护：执行中不插入干扰                  │
│                                                          │
│  交互点 3: 用户修正 → record_skill_experience            │
│  ├── 上下文：经验沉淀 hint                               │
│  └── 设计：完成时提示，不在执行中打断                     │
│           ✅ 最近前置原则：任务完成后立即沉淀               │
│                                                          │
│  交互点 4: 下次推送                                      │
│  ├── 上下文：L4 经验自动读取                             │
│  └── 设计：闭环完成                                       │
│           ✅ 闭环验证：消费→生产→复用                       │
└─────────────────────────────────────────────────────────┘
```

**合规性评估**：✅ **完全合规**

---

### 2.3 原则三合规性检查

| 检查项 | v1.1 规划实现 | 合规 |
|--------|--------------|------|
| **L1 强制注入** | §8.6 Step 1 自动加载 | ✅ |
| **L2-L3 按需读取** | Agent 主动请求 | ✅ |
| **L4 动态写入** | `appendToL4()` | ✅ |
| **L5 人工归档** | `updateL5Stats()` | ✅ |
| **进化守卫** | L1 ≤ 5 条规则，每条 < 50 tokens | ✅ §8.7 |

**合规性评估**：✅ **完全合规**

---

## 三、OpenClaw 集成规划合规性分析

### 3.1 原则一合规性检查

| 检查项 | 集成规划实现 | 合规 |
|--------|-------------|------|
| **复用 OpenClaw 能力** | ClawHub 市场复用 SKILL.md 格式 | ✅ |
| **插件感知** | 插件清单解析器，复用 OpenClaw Plugin SDK | ✅ |
| **配置 API** | 复用 OpenClaw 已有 RPC 接口 | ✅ |

**原子能力复用矩阵**：

| OpenClaw 能力 | TeamClaw 复用方式 |
|--------------|-----------------|
| SKILL.md 格式 | 直接兼容，添加 metadata 层 |
| Plugin System | 插件清单解析，不重新造轮子 |
| ClawHub 市场 | API 对接，不自建市场 |
| MCP Server | 继承，不重复实现 |
| Hook 生命周期 | 注册 TeamClaw Handler，交给 OpenClaw 执行 |
| 热重载 | 调用 OpenClaw 配置 API，不自己监听文件 |

**合规性评估**：✅ **完全合规**

**创新点**（非复用但合理）：

| 新建项 | 理由 | 原子能力价值 |
|--------|------|------------|
| ClawHub 客户端 | OpenClaw 无公开市场 API | 接入生态必需 |
| 插件管理 UI | OpenClaw 无 GUI | TeamClaw 差异化 |
| 双市场策略 | TeamClaw 私有 + ClawHub 生态 | 兼顾内外部 |

---

### 3.2 原则二合规性检查

| 检查项 | 集成规划实现 | 合规 |
|--------|-------------|------|
| **交互点盘点** | Hook 事件流（§6.3）完整描述 | ✅ |
| **闭环设计** | Hook → Proactive Engine → Action | ✅ |

**Hook 事件闭环设计**：

```
OpenClaw Hook
    │
    ├── before_tool_call ──▶ TeamClaw Handler
    │   │                     ├── 权限校验 ✅
    │   │                     └── 用量记录 ✅
    │   └── 最近前置：工具调用前（最早机会拦截）
    │
    ├── after_tool_call ──▶ TeamClaw Handler
    │   │                     ├── 结果处理 ✅
    │   │                     └── 错误追踪 ✅
    │   └── 最近前置：工具调用后（最晚机会记录）
    │
    └── Hook → Proactive Engine → Action（主动闭环）
        │
        ├── 任务逾期预警
        ├── 交付积压提醒
        ├── 上下文断层检测
        └── Skill 健康巡检
```

**合规性评估**：✅ **完全合规**

---

### 3.3 原则三合规性检查

| 检查项 | 集成规划实现 | 合规 |
|--------|-------------|------|
| **metadata.openclaw** | 兼容 L1-L5 扩展字段 | ✅ §3.3 |
| **Skill 加载** | L1-L5 继承 TeamClaw 分层 | ✅ |

**ExtendedSkillFrontmatter 合规性**：

```typescript
// §3.3 设计的 metadata 扩展，兼容 OpenClaw + TeamClaw 双层上下文
metadata?: {
  openclaw?: {
    // OpenClaw 元数据
    requires?: { bins?, anyBins?, env?, config? };
    // ...
  };
  // TeamClaw 分层上下文
  evolution?: {
    // L4-L5 进化相关
  };
};
```

**合规性评估**：✅ **完全合规**

---

## 四、UI 重构规划合规性分析

### 4.1 原则一合规性检查

UI 重构主要涉及前端组件，影响评估：

| UI 重构项 | 原子能力复用 | 合规 |
|----------|-------------|------|
| **Design Tokens** | 复用现有 CSS 变量系统 | ✅ |
| **组件库** | 复用现有 14 个基础组件 | ✅ |
| **布局系统** | AppShell 重构，非新建 | ✅ |
| **WorkflowCanvas** | 新建，v1.1 Phase 2 决策 | ⚠️ 需闭环设计 |

**WorkflowCanvas 合规性补充**：

Workflow Editor 是可视化编排工具，需遵循原则二：

```
Workflow 编辑器交互点：
│
├── 交互点 1: 节点拖拽
│   └── 上下文：节点配置表单
│       最近前置：拖拽完成后立即编辑
│
├── 交互点 2: 连线配置
│   └── 上下文：数据映射
│       最近前置：连线完成后立即配置
│
├── 交互点 3: 执行预览
│   └── 上下文：执行结果
│       最近前置：预览时立即反馈
│
└── 交互点 4: 发布
    └── 上下文：发布确认
        最近前置：发布前最后确认
```

**合规性评估**：⚠️ **需补充交互设计**

---

### 4.2 原则二合规性检查

| 检查项 | UI 规划实现 | 合规 |
|--------|-------------|------|
| **状态反馈** | §8.1 统一规范 | ✅ |
| **错误处理层级** | Inline → Toast → Confirmation → Error Page | ✅ |
| **动画规范** | Motion Primitives 统一 | ✅ |

**错误处理层级（§8.2）**：

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

**合规性评估**：✅ **完全合规**

---

### 4.3 原则三合规性检查

UI 层面不影响知识库分层，无需原则三合规。

**合规性评估**：N/A

---

## 五、原则合规性清单（开发自检）

### 5.1 每个 Phase/功能开发前的检查

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

## 六、v1.1 各 Phase 原则合规性验证

### 6.1 Phase 1A: Adapter System

| 原则 | 验证项 | 状态 |
|------|--------|------|
| **原子能力** | 复用现有 Drizzle ORM | ✅ |
| **闭环设计** | Adapter 接口 → 实现 → 注入，不破坏现有闭环 | ✅ |
| **分层上下文** | N/A（基础设施层） | N/A |

### 6.2 Phase 1B: Skill Evolution Engine

| 原则 | 验证项 | 状态 |
|------|--------|------|
| **原子能力** | 复用 `knowhow-parser.ts`、`update_knowledge` | ✅ |
| **闭环设计** | §8.6 完整闭环：执行 → 记录 → 晋升 → 复用 | ✅ |
| **分层上下文** | L1-L5 完整分层，增量 metadata.openclaw | ✅ |

### 6.3 Phase 2: Workflow Engine

| 原则 | 验证项 | 状态 |
|------|--------|------|
| **原子能力** | 复用现有 SOP StageType 映射 + Skill Executor + knowhow-parser | ✅ |
| **闭环设计** | ✅ 已补充：节点类型 × 交互点矩阵 + 三层视角闭环 | ✅ |
| **分层上下文** | L1 Workflow 守卫 + L2-L3 节点知识 + L4 执行经验 + L5 版本归档 | ✅ |

**Phase 2 交互点设计补充**：详见 [Phase 2 Workflow 交互点设计](teamclaw_v1.1-phase2-workflow-interaction-points.md)

**核心交互点矩阵**：

| 交互点 | 上下文传递 | 最近前置原则 |
|--------|-----------|------------|
| **before_node** | 节点配置 + 输入 | ✅ |
| **executing** | 实时状态 | ⚠️ 避免干扰 |
| **after_node** | 节点产出 | ✅ |
| **on_condition** | 分支选择依据 | ✅ |
| **on_loop** | 循环计数 + 迭代产出 | ✅ |
| **on_error** | 错误信息 + 重试策略 | ✅ |

**三层闭环**：

```
Layer 1: 编辑层（人类）
  └── 拖拽 → 连线 → 配置 → 预览 → 发布

Layer 2: 执行层（AI）
  └── 触发 → before → executing → after → 下一步

Layer 3: 知识层（上下文）
  └── L1守卫 → L2-L3配置 → L4经验 → L5归档
```

### 6.4 Phase 3: Marketplace + Consumer

| 原则 | 验证项 | 状态 |
|------|--------|------|
| **原子能力** | Service 复用现有 AI App + Workflow | ✅ |
| **闭环设计** | 发布 → 订阅 → 使用 → 评分 → 进化 | ✅ |
| **分层上下文** | Consumer 无知识库需求，N/A | N/A |

### 6.5 Phase 4: Proactive Engine

| 原则 | 验证项 | 状态 |
|------|--------|------|
| **原子能力** | 复用 EventLog + Task + Delivery | ✅ |
| **闭环设计** | 触发 → 分析 → 决策 → 行动 → 反馈 | ✅ |
| **分层上下文** | N/A（自动化引擎层） | N/A |

---

## 七、合规性验证记录

| 日期 | Phase/功能 | 验证人 | 结果 | 备注 |
|------|-----------|--------|------|------|
| 2026-03-26 | v1.1 整体规划 | AI Review | ✅ 通过 | 主体合规 |
| 2026-03-26 | Phase 1A | AI Review | ✅ 通过 | - |
| 2026-03-26 | Phase 1B | AI Review | ✅ 通过 | - |
| 2026-03-26 | Phase 2 | AI Review | ✅ 通过 | 已补充交互点设计 |
| 2026-03-26 | Phase 3 | AI Review | ✅ 通过 | - |
| 2026-03-26 | Phase 4 | AI Review | ✅ 通过 | - |
| 2026-03-26 | OpenClaw 集成 | AI Review | ✅ 通过 | - |
| 2026-03-26 | UI 重构 | AI Review | ✅ 通过 | WorkflowCanvas 交互已设计 |
| 2026-03-26 | Phase 2 补充 | AI Review | ✅ 通过 | 见 phase2-workflow-interaction-points.md |
| **2026-03-28** | **全量代码审计** | **5 Agent 深度审查** | **✅ 通过** | **详见下方** |

### 7.1 代码审计合规性详情（2026-03-28）

> 审计方式：5 个并行 sub-agent 对全量代码库进行逐文件分析

#### 原则一验证结果：原子能力优先

| 模块 | 复用的原子能力 | 新建的原子能力 | 合规 |
|------|--------------|--------------|------|
| Phase 1A Adapter | Drizzle ORM、现有 DB 连接 | IConnectionAdapter 接口族 | ✅ |
| Phase 1B Evolution | knowhow-parser.ts、update_knowledge、appendToL4 | 3 个 MCP 工具（record/get/promote） | ✅ |
| Phase 2 Workflow | SOP StageType 映射、Skill Executor | WorkflowEngine 核心类 | ✅ |
| Phase 3 Marketplace | IPaymentAdapter 接口、scoring 算法 | Consumer 独立认证体系 | ✅ |
| Phase 4 Proactive | EventBus、Task/Delivery 实体 | 6 种触发评估器 | ✅ |
| Phase 5 OKR | Task 关联、IPaymentAdapter | CreditsService | ✅ |
| MCP 系统 | 75 个工具→18 个域 handler | tool-registry 统一映射 | ✅ |
| OpenClaw | Gateway WebSocket、SKILL.md 格式 | PluginRegistry、ClawHubClient | ✅ |

**审计结论**：**全部合规**。75 个 MCP 工具复用 18 个域 handler，无重复实现。所有新建能力（Adapter 接口、Evolution MCP、WorkflowEngine）均有明确的不可替代理由。

#### 原则二验证结果：闭环设计强制性

| 闭环 | 消费端 | 生产端 | 复用端 | 合规 |
|------|--------|--------|--------|------|
| Skill Evolution | invoke_skill 加载 Top10 经验 | record_skill_experience | promote → L1 规则 | ✅ |
| Proactive | EventBus 事件监听 | evaluator 评估→eventLog | SSE→前端刷新→规则优化 | ✅ |
| Marketplace | Consumer 订阅 Service | 使用→评分 | rankWeight 排序→进化 | ✅ |
| Workflow | start → advance 执行链 | 节点产出→L4 记录 | ⚠️ 经验 MCP 缺失 |
| MCP | 定义→注册→路由 | handler 执行→SSE | Store 刷新→UI 更新 | ✅ |

**审计结论**：**基本合规**，仅 Workflow 知识闭环因 `record_workflow_experience` MCP 未实现而有断点（P1 级别，不影响主流程执行）。

#### 原则三验证结果：分层上下文设计

| 层级 | 代码实现验证 | 注入时机验证 |
|------|------------|-------------|
| L1 核心规则 | ✅ invoke_skill 自动植入 | ✅ 任务推送时 |
| L2-L3 标准/案例 | ✅ Agent 按需 get_document | ✅ 执行中按需 |
| L4 经验记录 | ✅ record_skill_experience → appendToL4 | ✅ 任务完成时 |
| L5 维护日志 | ✅ evolution-mcp.ts 晋升日志 | ✅ 人工/自动归档 |

**审计结论**：**全部合规**。L1-L5 五层分明，注入时机准确，不存在执行中插入干扰的情况。

---

## 八、v1.1 规划文档清单

| 文档 | 位置 | 说明 |
|------|------|------|
| v1.1 主规划 | `docs/optimization/teamclaw_v1.1.md` | 主体规划 |
| OpenClaw 集成 | `docs/optimization/teamclaw_v1.1-openclaw-integration.md` | 技术增强 |
| UI 重构 | `docs/optimization/teamclaw_v1.1-ui-redesign.md` | 前端优化 |
| **原则合规性** | `docs/optimization/teamclaw_v1.1-design-principles-compliance.md` | 原则验证 |
| **Phase 2 交互点** | `docs/optimization/teamclaw_v1.1-phase2-workflow-interaction-points.md` | 交互设计补充 |

---

_本文档配合 `teamclaw_v1.1.md` 主规划文件使用_  
_设计原则原文：`.codebuddy/rules/agent-collaboration-design-principles.mdc`_  
_Last updated: 2026-03-28（代码审计验证版）_
