# TeamClaw 项目三维 Review 报告

> 日期：2026-03-27  
> 基于：CODING_STANDARDS.md + agent-collaboration-design-principles.mdc  
> 范围：编码规范 / 模块架构 / 模块依赖

---

## 一、编码规范 Review

### 1.1 文件组织（大文件）— P0 阻塞级

| 文件 | 行数 | 问题 | 建议 |
|------|------|------|------|
| `src/core/db/schema.ts` | **2188** | 62 个表定义全部堆在一个文件，严重影响可读性 | 按业务域拆分：`schema-core.ts`（用户/项目/任务）、`schema-gateway.ts`（agent/session）、`schema-approval.ts`（审批/交付）、`schema-extended.ts`（其余） |
| `src/shared/lib/locales/en.ts` | **1769** | 翻译文件过大，维护困难 | 按模块拆分为 `locales/en/common.ts`、`locales/en/tasks.ts` 等，barrel export |
| `src/shared/lib/locales/zh.ts` | **1768** | 同上 | 与 en.ts 对应拆分 |
| `src/shared/lib/slot-sync.ts` | **1626** | 职责过多 | 拆分为 `slot-parser.ts`、`slot-validator.ts`、`slot-resolver.ts` |
| `src/core/mcp/definitions.ts` | **1179** | 37 个工具定义集中 | 按域拆分为 `definitions/task-tools.ts`、`definitions/document-tools.ts` 等 |
| `src/shared/lib/chat-channel/executor.ts` | **1049** | 逻辑过重 | 拆分为 `executor/action-executor.ts`、`executor/context-resolver.ts` |
| `src/domains/sop/mcp.ts` | **1021** | 单文件过重 | 按工具函数拆分：`sop-mcp/create.ts`、`sop-mcp/advance.ts` 等 |
| `app/sop/page.tsx` | **1440** | 页面组件过大 | 提取 `SOPImportSection`、`SOPEditor`、`SOPPreviewPanel` 子组件 |

**警告级 (>400行，仅列代表)**：

| 文件 | 行数 |
|------|------|
| `src/shared/lib/server-gateway-client.ts` | 990 |
| `src/features/sop-engine/SOPTemplateEditor.tsx` | 907 |
| `app/workflows/[id]/page.tsx` | 907 |
| `app/members/page.tsx` | 830 |
| `src/features/chat-panel/ChatPanel.tsx` | 822 |
| `src/shared/lib/openclaw/sync-manager.ts` | 842 |

### 1.2 API Route 规范

**✅ 合规项**：
- API 错误消息全部使用英文（无中文字符混入）
- 所有 API 路由使用 `{ error: string }` 格式
- 动态路由使用 `{ params }: { params: Promise<{ id: string }> }` + `await params`
- SSE 事件覆盖良好（97 处 `eventBus.emit`，涵盖 task/document/project/schedule/member 等写操作）

**⚠️ 需关注**：
- API 路由中 `eventBus.emit` 共 97 处，需确保每次写操作后都有对应 emit（已有 SSE checklist 规则覆盖）

### 1.3 Store 规范（Zustand）

**✅ 合规项**：
- Store 文件均位于 `src/domains/{domain}/store.ts`
- 领域 index.ts 统一导出（22 个领域全部有 index.ts barrel export）
- 领域间无直接 Store 导入（`src/domains/` 内无跨领域导入）

**⚠️ 发现问题**：

| 问题 | 严重度 | 详情 |
|------|--------|------|
| `createItem` 使用 `data as any` | P1 | 6 个 store 中存在 `createItem: (data) => useStore.getState().createXxx(data as any)`，应修复类型签名 |
| DB 插入使用 `.values(data as any)` | P1 | `schedule/api/route.ts`、`delivery/api/route.ts`、`deliveries/route.ts` 共 3 处，Insert 类型与实际数据不匹配 |
| `src/domains/ui/` 使用旧路径 `@/lib/store-events` | P2 | `ui/store.ts` 和 `chat/store.ts` 引用 `@/lib/store-events` 而非 `@/shared/lib/store-events` |

### 1.4 前端组件规范

**✅ 合规项**：
- 无 `<style jsx>` 内联样式
- 无 `react-icons` 引用（统一使用 lucide-react）
- 0 处 `@ts-ignore` / `@ts-expect-error`

**⚠️ 发现问题**：

| 问题 | 严重度 | 详情 |
|------|--------|------|
| `eslint-disable react-hooks/exhaustive-deps` | P2 | 3 处（ChatPanel、DebugPanel、sop/page），需审查是否隐藏真实 bug |
| `console` 调用过多 | P1 | **701 处** console.log/warn/error，较上次审查大幅增加。建议 API route 统一使用 logger，client 端建立 ESLint 规则 |

### 1.5 类型安全

| 指标 | 数量 | 状态 |
|------|------|------|
| `@ts-ignore` | 0 | ✅ 已清理 |
| `@ts-expect-error` | 0 | ✅ 已清理 |
| `as any` | 20 | ⚠️ 需关注 |
| `eslint-disable` | 18 | ⚠️ 部分需消除 |

### 1.6 硬编码值

| 硬编码 | 出现次数 | 建议 |
|--------|----------|------|
| `getBaseUrl()` 函数重复定义 | 4 处 | 提取到 `src/shared/lib/mcp-utils.ts` |
| `localhost:3000` 作为 fallback | 5+ 处 | 提取 `DEFAULT_BASE_URL` 常量 |
| `30000ms` 超时值 | 4 处 | 提取 `DEFAULT_TIMEOUT` 常量 |

### 1.7 TODO/FIXME 技术债

| 位置 | 内容 | 评估 |
|------|------|------|
| `supabase-connection-adapter.ts` ×2 | TODO: 实际连接逻辑 / migrate | 架构占位，短期不实现，标记 ARCHITECTURE_PLACEHOLDER |
| `cloudbase-connection-adapter.ts` ×2 | 同上 | 同上 |
| `sop-stats/route.ts` ×2 | TODO: 计算平均时长 / 阶段统计 | 功能缺失，应排入迭代 |
| `upload/route.ts` | TODO: 保存文件到存储 | 存储功能未完成，排入迭代 |

---

## 二、模块架构 Review

### 2.1 目录结构

**✅ 合规项**：
- 分层清晰：`app/` → `src/features/` → `src/shared/` → `src/domains/` → `src/core/`
- 22 个领域模块结构规范：均含 `index.ts`、`store.ts`、`mcp.ts`
- API 路由迁移到 `src/domains/{domain}/api/` 已完成大部分

**⚠️ 发现问题**：

| 问题 | 严重度 | 详情 |
|------|--------|------|
| `src/domains/ui/` 定位模糊 | P2 | `ui` 不是业务领域，是 UI 状态。建议移到 `src/shared/stores/ui-store.ts`，但改动成本中等 |
| `app/api/` 存在旧路由 | P2 | 部分路由仍在 `app/api/` 而非 `src/domains/*/api/`（如 `app/api/scheduled-tasks/`、`app/api/deliveries/`），与 domain API 迁移不一致 |
| `src/core/adapters/` | P2 | 含 `supabase-connection-adapter.ts` 和 `cloudbase-connection-adapter.ts` 两个空壳适配器（仅 TODO），属于代码噪音 |

### 2.2 组件层次

**✅ 合规项**：
- shared 层组件被 features 和 app 正确引用
- features 之间无直接导入（仅通过 domains index 通信）

**⚠️ 发现问题**：

| 问题 | 严重度 | 详情 |
|------|--------|------|
| shared 层导入 features 层 | **P1** | 4 处违规（规范禁止 shared 依赖 features） |
| | | `src/shared/layout/Sidebar.tsx` → `@/features/task-board/CreateProjectDialog` |
| | | `src/shared/layout/ChatOverlay.tsx` → `@/features/chat-panel` |
| | | `src/shared/hooks/useChatStream.ts` → `@/features/chat-panel/chat-utils` |
| | | `src/shared/editor/HtmlPreview.tsx` → `@/features/document-editor/PropertyPanel` |

### 2.3 领域模块统一性

**✅ 合规项**：
- 22 个领域模块均有 `index.ts` barrel export
- 导出格式统一：Store + Types
- `domains/index.ts`（108 行）集中 re-export 所有领域

---

## 三、模块依赖 Review

### 3.1 路径别名违规

**❌ 旧路径 `@/lib/` 未完全迁移** — **630 处**

主要集中在 `src/domains/` 下的 API 路由文件：

| 领域 | 涉及文件 | 数量 |
|------|----------|------|
| `schedule` | `mcp.ts`, `api/route.ts`, `api/[id]/route.ts`, `store.ts` | ~15 |
| `skill` | `api/install/route.ts`, `api/discover/route.ts`, `api/route.ts`, `api/trust/route.ts` | ~15 |
| `context` | `mcp.ts` | 1 |
| `ui` | `store.ts` | 1 |

规范要求：`@/lib/*` → `@/shared/lib/*`

### 3.2 跨层依赖违规

| 违规 | 严重度 | 详情 |
|------|--------|------|
| **shared → features（4处）** | **P1** | 破坏分层原则，shared 不应依赖 features |
| **features → domains/store 直接导入（16处）** | P2 | 应通过 `@/domains/{name}` index 导入，而非 `@/domains/{name}/store` |

### 3.3 循环依赖

**✅ 未检测到明显的循环依赖**（通过 grep 交叉验证）

### 3.4 重复代码

| 重复模式 | 位置 | 建议 |
|----------|------|------|
| `getBaseUrl()` 函数 | 4 个 MCP handler | 提取到 `src/shared/lib/mcp-utils.ts` |
| `createItem` facade | 6 个 store | 在 `store-factory.ts` 中提供工厂函数 |
| `taskStats.todo` 计算 | 5 处 | 提取到 `src/shared/lib/task-utils.ts` |

### 3.5 数据流验证

**✅ 合规项**：
- 前端通过 `data-service.ts` → `app/api/*` → Drizzle → SQLite 的数据流一致
- SSE 事件通过 `eventBus.emit()` → `/api/sse` → DataProvider 的推送链路完整
- Gateway WebSocket 通过 `gateway-client.ts` 独立通信，未与 SQLite 数据混淆

---

## 四、汇总

### 问题统计

| 维度 | P0 阻塞 | P1 高 | P2 中 | 合计 |
|------|---------|-------|-------|------|
| 文件组织 | 8 | 7 | ~25 | ~40 |
| API 规范 | 0 | 0 | 0 | 0 |
| Store 规范 | 0 | 2 | 1 | 3 |
| 前端组件 | 0 | 1 | 1 | 2 |
| 类型安全 | 0 | 1 | 1 | 2 |
| 路径别名 | 0 | 1 (630处) | 0 | 1 |
| 跨层依赖 | 0 | 1 (4处) | 1 (16处) | 2 |
| 重复代码 | 0 | 1 | 2 | 3 |
| console 残留 | 0 | 1 (701处) | 0 | 1 |
| 技术债 | 0 | 0 | 1 (8处) | 1 |
| 硬编码值 | 0 | 1 | 1 | 2 |
| **合计** | **8** | **16** | **~49** | **~57** |

### 优先修复路线图

#### 立即处理（P0 — 阻塞级大文件）

1. **`schema.ts` 拆分**（2188行）— 按业务域拆分为 4-5 个子文件
2. **`locales/en.ts` + `locales/zh.ts` 拆分**（各 ~1770行）— 按模块拆分
3. **`slot-sync.ts` 拆分**（1626行）— 按职责拆分
4. **`definitions.ts` 拆分**（1179行）— 按域拆分

#### 短期处理（P1）

1. **路径别名迁移**：630 处 `@/lib/` → `@/shared/lib/`（批量替换即可）
2. **shared → features 跨层依赖修复**：4 处，需调整组件归属或提取接口
3. **`as any` 消除**：20 处，重点修复 `createItem` 工厂模式（6处）和 DB 插入（3处）
4. **console 统一**：建立 logger 规范，701 处逐步迁移

#### 中期处理（P2）

1. `features → domains/store` 直接导入改为通过 index
2. 硬编码值提取为常量
3. `src/domains/ui/` 重新定位
4. 清理空壳 adapter 文件

### 总体评价

| 维度 | 评分 | 说明 |
|------|------|------|
| 编码规范 | **B** | API 规范、类型安全基本合规；大文件和 console 是主要扣分项 |
| 模块架构 | **B+** | 分层清晰，领域模块规范；shared→features 跨层需修复 |
| 模块依赖 | **B-** | 路径别名迁移未完成（630处旧路径），是最突出的技术债 |
| **综合** | **B** | 架构设计合理，主要问题集中在路径别名迁移和大文件拆分 |
