# TeamClaw v1.1 待优化清单

> **生成日期**：2026-03-28  
> **基于**：5 Agent 深度代码审计（750+ 文件逐行分析）  
> **综合完成度**：91%（GPA A-）  
> **总待办**：27 项 | **总预估工时**：~79.5h

---

## 一、按优先级总览

| 优先级 | 数量 | 总工时 | 说明 |
|--------|------|--------|------|
| 🔴 P0（阻塞） | 1 | 3h | 功能性缺陷，必须立即修复 |
| 🟡 P1（重要） | 18 | 45h | 影响完整性或安全，建议 Sprint 8-9 修复 |
| 🟢 P2（增强） | 8 | 31.5h | 可靠性增强/代码整洁，可延后 |

---

## 二、🔴 P0 — 立即修复

### P0-1: Workflow 并行节点缺 join 汇合逻辑

| 属性 | 值 |
|------|-----|
| **GAP ID** | G2-03 |
| **模块** | Phase 2 - Workflow Engine |
| **文件** | `src/core/workflow/engine.ts` |
| **问题** | `parallel` 节点只标记分支为 pending，但无 join 汇合逻辑——并行分支完成后无法合流到下一节点 |
| **影响** | Workflow 并行执行功能**完全不可用** |
| **修复方案** | 实现 `evaluateParallelJoin()`：检查所有分支是否完成 → 汇合到 `parallel.nextNode` → 处理分支失败策略（fail-fast / wait-all） |
| **预估** | 3h |
| **验证** | 创建包含 parallel 节点的 Workflow，验证 2+ 分支完成后正确推进到下一节点 |

---

## 三、🟡 P1 — Sprint 8 建议修复（关键功能）

### P1-1: OKR 无前端页面

| 属性 | 值 |
|------|-----|
| **GAP ID** | G5-01 |
| **模块** | Phase 5 - OKR |
| **问题** | 后端 API（objectives/keyResults/tasks 三组 CRUD）完整，但无 `app/okr/page.tsx` 或 `src/features/okr/` 组件 |
| **影响** | OKR 功能无法在 UI 中使用，只能通过 MCP 工具操作 |
| **修复方案** | 创建 OKR 页面：目标卡片 + 关键结果进度条 + 任务关联表 + CRUD 操作 |
| **预估** | 4h |

### P1-2: 3 张规划表未创建

| 属性 | 值 |
|------|-----|
| **GAP ID** | G5-02 / G5-03 / G5-04 |
| **模块** | Phase 5 - Schema |
| **文件** | `db/schema.ts` |
| **缺失表** | `paymentTransactions`（支付流水）、`creditsTransactions`（Credits 交易记录）、`trustPolicies`（信任策略持久化） |
| **影响** | 支付流水和 Credits 交易无法持久化追踪，信任策略仅存在于代码逻辑中 |
| **修复方案** | 在 `schema.ts` 中添加 3 张表定义，遵循现有 Base58 主键 + integer 时间戳 + JSON text 字段规范 |
| **预估** | 3h（含迁移逻辑验证） |

### P1-3: Workflow 缺 review 节点类型

| 属性 | 值 |
|------|-----|
| **GAP ID** | G2-05 |
| **模块** | Phase 2 - Workflow Engine |
| **文件** | `src/core/workflow/types.ts` |
| **问题** | SOP `StageType` 有 `review` 但 `WorkflowNodeType` 未映射，导致 SOP 审批阶段转 Workflow 时丢失审批逻辑 |
| **修复方案** | (1) `WorkflowNodeType` 增加 `review` (2) `engine.ts` 添加 review 节点执行逻辑（暂停等待审批→通过/拒绝分支） (3) `sop-compat.ts` 补充映射 |
| **预估** | 1h |

### P1-4: workflow_call 无子 Workflow 状态回调

| 属性 | 值 |
|------|-----|
| **GAP ID** | G2-04 |
| **模块** | Phase 2 - Workflow Engine |
| **文件** | `src/core/workflow/engine.ts` L268-271 |
| **问题** | `workflow_call` 完成后直接推进到 nextNode，但子 Workflow 执行状态无回调机制——父 Workflow 无法感知子 Workflow 是否成功 |
| **修复方案** | 注册子 Workflow 完成回调：启动子 Workflow 时记录父 run+node → 子 Workflow 完成后通知父 Workflow 推进 |
| **预估** | 2h |

### P1-5: Workflow 经验 MCP 工具缺失

| 属性 | 值 |
|------|-----|
| **GAP ID** | G2-06 / G2-07 |
| **模块** | Phase 2 - Workflow Engine（知识闭环） |
| **问题** | `record_workflow_experience` 和 `get_workflow_recommendations` 两个 MCP 工具未实现，导致 Workflow 的知识闭环断裂 |
| **影响** | Workflow 执行产出的经验无法自动沉淀到 L4 知识层 |
| **修复方案** | 参照 `evolution-mcp.ts` 模式实现：(1) definitions.ts 添加工具定义 (2) 域 handler 实现 (3) tool-registry 注册 |
| **预估** | 4h |

### P1-6: Consumer Token 签名安全

| 属性 | 值 |
|------|-----|
| **GAP ID** | G3-03 |
| **模块** | Phase 3 - Marketplace 安全 |
| **文件** | `src/domains/consumer/` |
| **问题** | 使用 SHA256 签名 Token，存在长度扩展攻击风险 |
| **修复方案** | 改用 `crypto.createHmac('sha256', secret)` 替代 `crypto.createHash('sha256')` |
| **预估** | 1h |

### P1-7: 插件状态仅内存 Map

| 属性 | 值 |
|------|-----|
| **GAP ID** | G-OC-02 |
| **模块** | OpenClaw 集成 |
| **文件** | `src/core/plugins/registry.ts` |
| **问题** | 已安装插件状态保存在内存 `Map<string, PluginInfo>` 中，服务重启后所有插件状态丢失 |
| **修复方案** | 写入 `plugins` 表（已存在于 schema.ts），启动时从 DB 加载 |
| **预估** | 2h |

### P1-8: Supabase/CloudBase 适配器骨架实现

| 属性 | 值 |
|------|-----|
| **GAP ID** | G1A-01 / G1A-02 |
| **模块** | Phase 1A - Adapter System |
| **文件** | `src/core/adapters/db/supabase.ts`、`cloudbase.ts` |
| **问题** | `initialize()` 直接 `throw new Error('TODO: Supabase not implemented')`，Auth/Storage 适配器同样为骨架 |
| **影响** | 多后端切换完全不可用，仅 SQLite 路径可用 |
| **修复方案** | 根据实际需求优先级选择实现 Supabase 或 CloudBase（需真实环境测试） |
| **预估** | 8h（两个适配器） |

### P1-9: AdapterRegistry 未被业务层采用

| 属性 | 值 |
|------|-----|
| **GAP ID** | G1A-03 |
| **模块** | Phase 1A - Adapter System |
| **文件** | `src/core/adapters/registry.ts` |
| **问题** | AdapterRegistry 注册表（131 行）仅有 1 处引用，API 路由仍然直接调用 Drizzle ORM，适配器模式名存实亡 |
| **修复方案** | 选择一条路径：(A) API 路由通过 AdapterRegistry 获取连接 (B) 简化为直接依赖注入（去掉 Registry） |
| **预估** | 2h |

### P1-10: Setup Wizard 表单数据未持久化

| 属性 | 值 |
|------|-----|
| **GAP ID** | G1A-04 / G1A-05 |
| **模块** | Phase 1A - Setup Wizard |
| **文件** | `src/features/setup-wizard/` (9 个文件) |
| **问题** | adminName/adminEmail/teamName/gatewayUrl/gatewayToken 仅 UI 展示不落库；网关连接测试请求 `/api/health` 而非用户输入的 URL |
| **修复方案** | (1) Wizard 完成时写入 settings 表 (2) 网关测试改为请求用户输入的 URL |
| **预估** | 3h |

### P1-11: ClawHub installSkill 模拟实现

| 属性 | 值 |
|------|-----|
| **GAP ID** | G-OC-03 |
| **模块** | OpenClaw 集成 |
| **文件** | `src/core/clawhub/client.ts` |
| **问题** | `installSkill()` 返回模拟成功数据，未实现真实的 Skill 文件下载和安装 |
| **修复方案** | 实现：(1) 从 ClawHub API 下载 Skill 包 (2) 解压到 `skills/` 目录 (3) 注册到本地 Skill 列表 |
| **预估** | 3h |

### P1-12: OpenClaw 配置适配器缺失

| 属性 | 值 |
|------|-----|
| **GAP ID** | G-OC-04 |
| **模块** | OpenClaw 集成 |
| **问题** | `src/core/gateway/adapters/` 目录不存在，无法通过 API 管理 OpenClaw Gateway 配置 |
| **修复方案** | 创建 OpenClaw Config Adapter：读取/写入 Gateway 配置，需 Gateway RPC API 支持 |
| **预估** | 3h（需 Gateway API） |

---

## 四、🟢 P2 — 可延后（可靠性增强 + 代码整洁）

| # | GAP ID | 描述 | 模块 | 工时 |
|---|--------|------|------|------|
| 1 | G2-08 | `workflows/page.tsx` 空 `<button>` 标签残留 | Workflow UI | 0.5h |
| 2 | G2-09 | `node-executors/` 插件架构未实现（逻辑嵌入 engine.ts） | Workflow | 4h |
| 3 | G4-01 | `deadLetters` 表有 Schema 无运行时代码（死信队列） | Proactive | 3h |
| 4 | G4-02 | `circuitStates` 表有 Schema 无运行时代码（熔断器） | Proactive | 3h |
| 5 | G-OC-05 | Hook 系统未实现（需 Gateway 运行时支持） | OpenClaw | 4h |
| 6 | G-MCP-01 | `definitions.ts` 文件头注释 "37 个" 严重过时（实际 75 个） | MCP | 0.5h |
| 7 | G-MCP-02 | 7 个 DEPRECATED 工具可清理 | MCP | 1h |
| 8 | G3-01 | Stripe 适配器桩实现（需真实 Stripe SDK 集成） | Payment | 4h |
| 9 | G5-05 | 微信支付 fallback 到 credits_only | Payment | 4h |
| 10 | G3-02 | Consumer JWT 验证在 handler 层而非 middleware 层 | Marketplace | 2h |

---

## 五、按模块分布

```
待优化分布图（27 项）

Phase 2 Workflow     ████████  7 项（26%） ← 最多
Phase 5 OKR/Payment  █████     5 项（19%）
Phase 1A Adapter     █████     5 项（19%）
OpenClaw 集成         ████      4 项（15%）
Phase 4 Proactive    ██        2 项（7%）
Phase 3 Marketplace  ███       3 项（11%）
MCP 系统             ██        2 项（7%）
```

---

## 六、建议执行路线图

### Sprint 8：关键功能修复（~15h）

> 目标：消灭 P0，修复最影响用户体验的 P1

```
Week 1:
├── 🔴 G2-03  parallel 节点 join 汇合逻辑            3h
├── 🟡 G5-01  OKR 前端页面                            4h
├── 🟡 G2-05  review 节点类型补充                      1h
├── 🟡 G5-02  paymentTransactions 表                   1h
├── 🟡 G5-03  creditsTransactions 表                   1h
├── 🟡 G5-04  trustPolicies 表                         1h
├── 🟡 G-OC-02 插件状态数据库持久化                     2h
└── 🟡 G3-03  Consumer Token HMAC-SHA256               1h
                                              合计 ≈ 14h
验证门禁：
  ✅ parallel Workflow 测试通过
  ✅ OKR 页面可 CRUD
  ✅ 3 张新表迁移成功
  ✅ 插件重启后状态保留
```

### Sprint 9：Workflow + OpenClaw 增强（~18h）

> 目标：补齐 Workflow 知识闭环，OpenClaw 从模拟走向真实

```
Week 2-3:
├── 🟡 G2-04  workflow_call 子 Workflow 状态回调       2h
├── 🟡 G2-06  record_workflow_experience MCP           2h
├── 🟡 G2-07  get_workflow_recommendations MCP         2h
├── 🟡 G-OC-03 ClawHub 真实 Skill 安装                 3h
├── 🟡 G-OC-04 OpenClaw 配置适配器                      3h
├── 🟡 G1A-03 AdapterRegistry 业务层接入               2h
├── 🟡 G1A-04 Setup Wizard 数据持久化                   2h
├── 🟡 G1A-05 Setup Wizard 网关真实测试                 1h
└── 🟢 G-MCP-01 definitions.ts 注释更新              0.5h
                                              合计 ≈ 17.5h
验证门禁：
  ✅ Workflow 经验可记录和查询
  ✅ ClawHub Skill 可真实安装到本地
  ✅ Setup Wizard 配置持久化并可恢复
```

### Sprint 10+：可靠性增强（~31.5h，按需排期）

> 目标：生产级可靠性提升

```
├── 🟡 G1A-01/02 Supabase/CloudBase 适配器真实实现    8h（需真实环境）
├── 🟢 G4-01    deadLetters 死信队列运行时             3h
├── 🟢 G4-02    circuitStates 熔断器运行时             3h
├── 🟢 G2-09    node-executors/ 插件架构               4h
├── 🟢 G-OC-05  Hook 系统                              4h
├── 🟢 G3-01    Stripe 真实 SDK 集成                   4h
├── 🟢 G5-05    微信支付真实集成                        4h
├── 🟢 G3-02    Consumer JWT 中间件化                   2h
├── 🟢 G2-08    workflows/page.tsx 空 button 清理     0.5h
├── 🟢 G-MCP-02 清理 7 个 DEPRECATED 工具              1h
                                              合计 ≈ 33.5h
```

---

## 七、速查索引

### 按文件定位

| 文件 | 涉及 GAP | 优先级 |
|------|---------|--------|
| `src/core/workflow/engine.ts` | G2-03, G2-04 | 🔴🟡 |
| `src/core/workflow/types.ts` | G2-05 | 🟡 |
| `db/schema.ts` | G5-02, G5-03, G5-04 | 🟡 |
| `src/domains/consumer/` | G3-03 | 🟡 |
| `src/core/plugins/registry.ts` | G-OC-02 | 🟡 |
| `src/core/clawhub/client.ts` | G-OC-03 | 🟡 |
| `src/core/adapters/` | G1A-01~05 | 🟡 |
| `src/features/setup-wizard/` | G1A-04, G1A-05 | 🟡 |
| `src/core/mcp/definitions.ts` | G-MCP-01, G-MCP-02 | 🟢 |
| `src/core/proactive/` | G4-01, G4-02 | 🟢 |
| `src/core/payment/` | G3-01, G5-05 | 🟢 |
| `app/workflows/page.tsx` | G2-08 | 🟢 |

### 按闭环影响

| 闭环 | 当前状态 | 补齐后 | 涉及 GAP |
|------|---------|--------|---------|
| Skill Evolution | ✅ 完整 | — | — |
| Workflow 知识 | ⚠️ 断裂 | ✅ 完整 | G2-06, G2-07 |
| Marketplace | ✅ 完整 | — | — |
| Proactive | ✅ 完整 | 增强 | G4-01, G4-02 |
| MCP | ✅ 完整 | — | — |

---

## 八、完成度追踪

> 完成一项后在此处打 ✅，更新日期

| GAP ID | 描述 | 状态 | 完成日期 |
|--------|------|------|---------|
| G2-03 | parallel join 汇合 | ⬜ 待修复 | |
| G5-01 | OKR 前端页面 | ⬜ 待修复 | |
| G5-02 | paymentTransactions 表 | ⬜ 待修复 | |
| G5-03 | creditsTransactions 表 | ⬜ 待修复 | |
| G5-04 | trustPolicies 表 | ⬜ 待修复 | |
| G2-05 | review 节点类型 | ⬜ 待修复 | |
| G2-04 | workflow_call 回调 | ⬜ 待修复 | |
| G2-06 | record_workflow_experience | ⬜ 待修复 | |
| G2-07 | get_workflow_recommendations | ⬜ 待修复 | |
| G3-03 | Consumer Token HMAC | ⬜ 待修复 | |
| G-OC-02 | 插件状态持久化 | ⬜ 待修复 | |
| G-OC-03 | ClawHub 真实安装 | ⬜ 待修复 | |
| G-OC-04 | 配置适配器 | ⬜ 待修复 | |
| G1A-01 | Supabase 适配器 | ⬜ 待修复 | |
| G1A-02 | CloudBase 适配器 | ⬜ 待修复 | |
| G1A-03 | AdapterRegistry 接入 | ⬜ 待修复 | |
| G1A-04 | Wizard 数据持久化 | ⬜ 待修复 | |
| G1A-05 | Wizard 网关真实测试 | ⬜ 待修复 | |
| G3-01 | Stripe 真实 SDK | ⬜ 待修复 | |
| G5-05 | 微信支付真实集成 | ⬜ 待修复 | |
| G2-08 | 空 button 标签 | ⬜ 待修复 | |
| G2-09 | node-executors 架构 | ⬜ 待修复 | |
| G4-01 | deadLetters 运行时 | ⬜ 待修复 | |
| G4-02 | circuitStates 运行时 | ⬜ 待修复 | |
| G-OC-05 | Hook 系统 | ⬜ 待修复 | |
| G-MCP-01 | 注释更新 | ⬜ 待修复 | |
| G-MCP-02 | DEPRECATED 清理 | ⬜ 待修复 | |
| G3-02 | JWT 中间件化 | ⬜ 待修复 | |

---

_Generated: 2026-03-28 | Based on: 5-Agent Deep Code Audit | Source: teamclaw_v1.1_gap_analysis.md_
