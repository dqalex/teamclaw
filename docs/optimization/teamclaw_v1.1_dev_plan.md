# TeamClaw v1.1 开发规划（LLM 执行版）

> **版本**：v1.1 Dev Plan  
> **日期**：2026-03-25  
> **目的**：本文档为 AI 编码 Agent 提供可直接执行的开发规划  
> **配套文档**：`docs/optimization/teamclaw_v1.1.md`（完整需求分析 + 竞品调研）

---

## 0. 项目现状快照

> 以下数据基于 2026-03-25 代码库实际统计，AI Agent 执行任务前必须核对。

### 0.1 代码库规模

| 指标 | 数值 |
|------|------|
| 总源文件数 | 340（256 .ts + 84 .tsx） |
| 总代码行数 | ~52,000 行 |
| 数据库表 | 35 张（Drizzle ORM + SQLite） |
| MCP 工具 | 37 个（`src/core/mcp/definitions.ts`，另有 7 个 DEPRECATED） |
| API 路由文件 | 113 个（`app/api/`，Next.js App Router） |
| Domain 模块 | 16 个（`src/domains/*/`） |
| Zustand Store | 15 个 + 1 个 taskLog.store |
| 测试文件 | 107 个 |

### 0.2 技术栈

> 以下版本号以 `package.json` 为唯一真相源（2026-03-25 实际值）

| 层级 | 技术 | 版本 |
|------|------|------|
| **框架** | Next.js (App Router) | ^14.2.35 |
| **语言** | TypeScript (strict) | ^5.4.0 |
| **前端** | React | ^18.2.0 |
| **状态管理** | Zustand | ^4.5.0 |
| **数据库 ORM** | Drizzle ORM | ^0.45.1 |
| **数据库引擎** | better-sqlite3 | ^12.6.2 |
| **数据校验** | Zod | ^4.3.6 |
| **实时通信** | WebSocket (ws) | ^8.19.0 |
| **样式** | Tailwind CSS | ^3.4.0 |
| **国际化** | i18next + react-i18next | ^23.11 / ^14.1 |
| **图标** | lucide-react | ^0.565.0 |
| **编辑器** | CodeMirror (@uiw/react-codemirror) | ^4.25.8 |
| **密码哈希** | argon2 | ^0.44.0 |
| **测试** | Vitest + Playwright | ^4.0.18 / ^1.58.2 |

### 0.3 架构模式

```
用户请求 → React 组件 → Zustand Store → fetch() → API Route Handler → Drizzle ORM → SQLite

实时更新 → API 写操作 → eventBus.emit() → SSE(/api/sse) → DataProvider → Store 刷新

AI 工具调用 → MCP endpoint → definitions.ts 匹配 → executor.ts 分发 → domains/*/mcp.ts 处理
```

### 0.4 关键目录结构

```
teamclaw/
├── app/api/                    # API 路由（113 个 route.ts 文件）
├── src/
│   ├── core/
│   │   ├── db/
│   │   │   ├── schema.ts       # 55 张表定义 + 所有类型导出
│   │   │   └── index.ts        # DB 连接（WAL/外键/缓存/忙超时）
│   │   ├── mcp/
│   │   │   ├── definitions.ts  # 37 个 MCP 工具 JSON Schema（865 行）
│   │   │   ├── handler-base.ts # McpHandlerBase 基类（551 行）
│   │   │   └── types.ts        # ActionInstruction 类型
│   │   └── gateway/
│   │       └── store.ts        # Gateway 连接状态
│   ├── domains/                # 16 个业务模块
│   │   ├── approval/           # index.ts + mcp.ts + store.ts + api/
│   │   ├── auth/               # index.ts + mcp.ts + store.ts + api/
│   │   ├── chat/               # index.ts + store.ts + api/
│   │   ├── comment/            # index.ts + store.ts + api/
│   │   ├── context/            # index.ts + mcp.ts（无 store）
│   │   ├── delivery/           # index.ts + mcp.ts + store.ts + api/
│   │   ├── document/           # index.ts + mcp.ts + store.ts + api/
│   │   ├── member/             # index.ts + mcp.ts + store.ts + api/
│   │   ├── milestone/          # index.ts + mcp.ts + store.ts + api/
│   │   ├── project/            # index.ts + mcp.ts + store.ts + api/
│   │   ├── render-template/    # index.ts + mcp.ts + store.ts + api/
│   │   ├── schedule/           # index.ts + mcp.ts + store.ts + api/
│   │   ├── skill/              # index.ts + mcp.ts + store.ts + api/
│   │   ├── sop/                # index.ts + mcp.ts(1022行) + store.ts + api/
│   │   ├── task/               # index.ts + mcp.ts + store.ts + taskLog.store.ts + api/
│   │   └── ui/                 # index.ts + store.ts
│   ├── features/               # 前端功能模块（84 .tsx 文件）
│   │   ├── agent-manager/
│   │   ├── chat-panel/
│   │   ├── document-editor/
│   │   ├── landing/
│   │   ├── milestone-tracker/
│   │   ├── settings/
│   │   ├── skill-manager/
│   │   ├── sop-engine/
│   │   ├── task-board/
│   │   └── wiki-editor/
│   └── shared/
│       ├── layout/             # AppShell, Header, Sidebar, DataProvider
│       ├── ui/                 # shadcn/ui 基础组件
│       ├── editor/             # MarkdownEditor, HtmlPreview
│       ├── hooks/              # 公共 Hooks
│       └── lib/                # 工具库
│           ├── data-service.ts     # API fetch 封装
│           ├── event-bus.ts        # SSE 事件总线
│           ├── gateway-client.ts   # Gateway WebSocket 客户端
│           ├── knowhow-parser.ts   # L1-L5 知识库分层解析器（271 行）
│           ├── slot-sync.ts        # Content Studio 渲染同步（1626 行）
│           ├── i18n.ts             # 国际化配置
│           └── locales/            # zh.ts + en.ts 翻译文件
├── data/
│   └── teamclaw.db                 # SQLite 数据库文件
└── scripts/
    └── deploy/deploy.sh            # 部署脚本（唯一合法部署方式）
```

### 0.5 现有 Domain 模块标准模式

每个 Domain 模块遵循统一结构：

```typescript
// src/domains/{name}/index.ts — 统一导出
export { use{Name}Store } from './store';
export type { ... } from '@/db/schema';

// src/domains/{name}/store.ts — Zustand Store
import { create } from 'zustand';
const use{Name}Store = create<{Name}State>((set) => ({
  items: [],
  loading: false,
  error: null,
  fetchAll: async () => { /* fetch → set */ },
  createAsync: async (data) => { /* POST → 用 API 返回值更新 state */ },
  updateAsync: async (id, data) => { /* PUT → 用 API 返回值更新 state */ },
  deleteAsync: async (id) => { /* await DELETE → 移除本地 */ },
}));

// src/domains/{name}/mcp.ts — MCP Handler（继承 McpHandlerBase）
class {Name}Handler extends McpHandlerBase<{Entity}> {
  constructor() { super('{Name}', '{event_type}'); }
  async execute(params, context): Promise<HandlerResult> { /* switch/case */ }
}

// src/domains/{name}/api/route.ts — GET (list) + POST (create)
// src/domains/{name}/api/[id]/route.ts — GET + PUT + DELETE
```

### 0.6 现有 SOP 系统（Workflow Engine 重写的基础）

**7 种 StageType**（定义在 `src/core/db/schema.ts:70-77`）：

```typescript
type StageType =
  | 'input'            // 等待人工输入（上传文件、填写信息）
  | 'ai_auto'          // AI 自动执行，完成后自动推进
  | 'ai_with_confirm'  // AI 执行后暂停，等人工确认/修改
  | 'manual'           // 纯人工操作
  | 'render'           // 进入 Content Studio 可视化编辑
  | 'export'           // 导出阶段
  | 'review';          // 提交交付审核
```

**SOPStage 结构**（`schema.ts:93-114`）：

```typescript
type SOPStage = {
  id: string;
  label: string;
  description?: string;
  type: StageType;
  promptTemplate?: string;       // Mustache 模板
  requiredInputs?: InputDef[];
  confirmMessage?: string;
  outputType?: StageOutputType;  // 'text' | 'markdown' | 'html' | 'data' | 'file'
  outputLabel?: string;
  knowledgeLayers?: string[];    // ["L1", "L2"]
  renderTemplateId?: string;
  optional?: boolean;
  estimatedMinutes?: number;
  rollbackStageId?: string;
};
```

**StageRecord**（运行时状态，`schema.ts:117-127`）：

```typescript
type StageRecord = {
  stageId: string;
  status: 'pending' | 'active' | 'waiting_input' | 'waiting_confirm' | 'completed' | 'skipped' | 'failed';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  outputType?: StageOutputType;
  confirmedBy?: string;
  retryCount?: number;
  renderDocumentId?: string;
};
```

**SOP MCP Handler 支持的 12 种 Action**（`src/domains/sop/mcp.ts`，1022 行）：

| Action | 说明 |
|--------|------|
| `advance_stage` | AI 推进 SOP 阶段 |
| `request_confirm` | 请求人工确认 |
| `get_context` | 获取 SOP 上下文 |
| `save_stage_output` | 保存阶段产出 |
| `update_knowledge` | 更新知识库（L1-L5） |
| `create_template` | 创建 SOP 模板 |
| `update_template` | 更新 SOP 模板 |
| `create_render_template` | 创建渲染模板 |
| `update_render_template` | 更新渲染模板 |
| `list_render_templates` | 列出渲染模板 |
| `get_render_template` | 获取渲染模板 |

### 0.7 现有知识库系统（Skill Evolution Engine 的基础）

**`src/shared/lib/knowhow-parser.ts`**（271 行）：

| 函数 | 说明 |
|------|------|
| `parseKnowHow(content)` | 解析 Markdown 为分层结构 |
| `extractLayers(parsed, layers)` | 提取指定层级 |
| `appendToL4(content, entry)` | 追加经验到 L4 |
| `updateL5Stats(content, stats)` | 更新 L5 维护日志 |

**5 层知识库结构**：

| 层级 | 用途 | 更新方式 | Token 预估 |
|------|------|----------|-----------|
| L1 | 核心规则 | 人工 | ~200 |
| L2 | 详细标准 | 人工 | ~500 |
| L3 | 案例库 | 人工 | ~300/案例 |
| L4 | 经验记录 | Agent 自动写入 | 动态增长 |
| L5 | 维护日志 | 自动+人工 | ~100 |

### 0.8 编码规范强制约束

> 以下约束来自 `/CODING_STANDARDS.md`，所有代码必须遵守：

| 规则 | 说明 |
|------|------|
| **主键** | Base58 short ID（API 层用 `generateId()` 生成） |
| **时间戳** | `integer` + `mode: 'timestamp'` |
| **JSON 字段** | `text` + `mode: 'json'` + `$type<T>()` |
| **Store create/update** | **必须**用 API 返回的 data 更新本地状态 |
| **Store delete** | **必须** await 成功后才移除本地数据 |
| **编辑防抖** | 500ms（`useRef<setTimeout>`） |
| **API 错误消息** | 英文（前端通过 i18n `t()` 翻译） |
| **PUT 更新** | `allowedFields` 白名单过滤 |
| **级联删除** | `db.transaction()` |
| **SSE 事件** | 写操作后 `eventBus.emit()` |
| **敏感字段** | 响应前经 `@/shared/lib/sanitize.ts` 脱敏 |
| **路径别名** | `@/*` 指向项目根目录 |
| **CSS** | Tailwind only，禁止 `<style jsx>` |
| **国际化** | 所有用户可见文本用 `t()` |
| **文件行数** | 400 行警告，800 行阻塞 |

---

## 1. 总体规划

### 1.1 Phase 依赖图

```
Phase 1A (Adapter System)  ──┬──▶  Phase 2 (Workflow Engine)
                             │
                             └──▶  Phase 3 (Marketplace)  ──▶  Phase 5 (支付+变现)

Phase 1B (Skill Evolution)  ──▶  Phase 4 (Proactive + 可观测性)

并行关系：
  Phase 1A ‖ Phase 1B （同时开始，无硬依赖）
  Phase 2  ‖ Phase 3  （Phase 1A 完成后可同时开始）
```

### 1.2 AI 工时总览

| 阶段 | AI 工时 | 其中测试 | 预估 Tokens | 日历时间（6h/天） |
|------|---------|----------|------------|--------------------|
| Phase 1A (Adapter) | 9h | 1.5h (17%) | ~225K | ~1.5天 |
| Phase 1B (Skill Evo) | 7.5h | 1.5h (20%) | ~180K | ~1.3天 |
| Phase 1A+1B 并行 | max(9,7.5) = 9h | — | ~405K | ~1.5天 |
| Phase 2 (Workflow) | 14.5h | 3.0h (21%) | ~360K | ~2.4天 |
| Phase 3 (Marketplace) | 12.5h | 2.5h (20%) | ~310K | ~2.1天 |
| Phase 4 (Proactive) | 8h | 1.5h (19%) | ~200K | ~1.3天 |
| Phase 5 (支付) | 4h | 0.5h (13%) | ~100K | ~0.7天 |
| **总计** | **~48.5h** | **~9h** | **~1.4M** | **~8天纯编码** |

> **实际工期 = 纯编码 × 2.5（含需求确认/调试/集成测试/代码审查/部署验证）≈ 20 工作日 ≈ 4 周**
>
> **与 v1.0 原估算差异**：总工时从 42h → 48.5h（+15%），主要增加在测试工时（从 ~3h → ~9h）和 Schema 跨数据库兼容层

### 1.3 AI 工时定义

```
1 AI工时 = 1 个 AI 编码 Agent 连续工作 1 小时
         = 产出 500-800 行高质量代码（含测试）
         = 消耗 ~25K tokens（含上下文读取 + 代码生成 + 调试）
         ≈ 3-5 人工小时
```

---

## 2. Phase 1A：Adapter System（~9 AI工时）

> **优先级**：P0  
> **前置条件**：无  
> **并行**：与 Phase 1B 同时进行  
> **完成标志**：`npm run build` 通过，三种后端适配器均可切换运行

### 2.1 目标

将当前硬编码的 SQLite（better-sqlite3 + Drizzle）数据访问层抽象为可插拔适配器，支持：
1. **SQLite**（默认，保持当前能力）
2. **Supabase (PostgreSQL)**
3. **CloudBase (MySQL)**

同时重构核心实体（User / Team / Consumer / AIApp / Service），为后续 Marketplace 和 Workflow 打基础。

### 2.2 需要新增的文件

```
src/core/adapters/
├── types.ts                    # 所有适配器接口定义
├── db/
│   ├── connection-adapter.interface.ts # IConnectionAdapter 接口
│   ├── sqlite-connection.ts    # SQLite 连接适配器（包装现有逻辑）
│   ├── supabase-connection.ts  # Supabase (PostgreSQL) 连接适配器
│   └── cloudbase-connection.ts # CloudBase (MySQL) 连接适配器
├── auth/
│   ├── auth-adapter.interface.ts
│   ├── local-auth-adapter.ts   # 当前 argon2 本地认证
│   └── supabase-auth-adapter.ts
├── storage/
│   ├── storage-adapter.interface.ts
│   ├── local-storage-adapter.ts
│   └── cloud-storage-adapter.ts
├── notification/
│   ├── notification-adapter.interface.ts
│   └── console-notification-adapter.ts
├── registry.ts                 # 全局适配器注册表（单例）
└── setup-wizard/
    └── SetupWizard.tsx         # 初始化向导前端（注：实际放 src/features/setup-wizard/）
```

### 2.3 连接层适配器接口设计（IConnectionAdapter）

> **设计决策**：采用**连接层适配器**（而非查询层适配器），保留 Drizzle ORM 的编译期类型安全。
>
> **被排除的方案**：泛型 CRUD 接口 `IDBAdapter<T>(table: string, ...)`
> - 排除理由：泛型 + string table name 会丢失 Drizzle 的编译期类型检查，需要重写所有 113 个 API Route，工程量巨大且收益不明显
> - Drizzle ORM 原生支持 SQLite/PostgreSQL/MySQL 三种数据库驱动，只需切换连接层即可

```typescript
// src/core/adapters/db/connection-adapter.interface.ts

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { MySql2Database } from 'drizzle-orm/mysql2';

// Drizzle 实例联合类型
type DrizzleInstance = BetterSQLite3Database | PostgresJsDatabase | MySql2Database;

export interface IConnectionAdapter {
  // 生命周期
  initialize(): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; latency: number }>;
  close(): Promise<void>;

  // 核心：返回 Drizzle 实例（保留所有类型安全的 query builder）
  getConnection(): DrizzleInstance;

  // 迁移
  migrate(): Promise<void>;

  // 元信息
  getDialect(): 'sqlite' | 'postgresql' | 'mysql';
}
```

> **关键优势**：
> - 现有所有 113 个 API Route 的 Drizzle query 代码**零改动**
> - Schema 定义只需为不同数据库方言做极小适配（如 `sqliteTable` → `pgTable`）
> - Drizzle 的 `eq()`, `and()`, `sql` 等操作符跨数据库通用

### 2.4 SQLite 连接适配器实现要点

> **核心原则**：SQLite 适配器必须 100% 保持现有行为。这不是重写，是换个入口。

```typescript
// src/core/adapters/db/sqlite-connection-adapter.ts

class SQLiteConnectionAdapter implements IConnectionAdapter {
  private db: BetterSQLite3Database;

  async initialize() {
    // 复用现有 src/core/db/index.ts 的初始化逻辑
    // WAL 模式 + 外键 + 64MB 缓存 + 5s 忙超时
    const sqlite = new Database(dbPath);
    this.db = drizzle(sqlite);
    this.applyPragmas(sqlite);
  }

  getConnection() { return this.db; }
  getDialect() { return 'sqlite' as const; }

  async migrate() {
    // 复用现有增量迁移逻辑（检测缺失表/列并添加）
  }
}
```

1. `initialize()` 中执行现有的 WAL 模式 + 外键 + 缓存 + 忙超时设置
2. `migrate()` 中执行现有的增量迁移逻辑（检测缺失表/列并添加）
3. 所有 35 张表的 Schema 定义保持在 `src/core/db/schema.ts` 不动
4. `getConnection()` 返回 Drizzle 实例，现有所有 API Route 的 `db.select()`, `db.insert()` 等调用**不需要改动**

### 2.4.1 Schema 跨数据库兼容策略

```typescript
// src/core/db/schema.ts — 需要为多数据库做的唯一改动
//
// 方案：使用 Drizzle 的 schema 条件导出
// - SQLite: import { sqliteTable } from 'drizzle-orm/sqlite-core'
// - PostgreSQL: import { pgTable } from 'drizzle-orm/pg-core'  
// - MySQL: import { mysqlTable } from 'drizzle-orm/mysql-core'
//
// 实现方式：schema.ts 根据环境变量 DB_DIALECT 动态选择 table builder
// 预估工时：~1.5h（需要仔细处理 SQLite 特有的 mode: 'timestamp' 等语法差异）
```

### 2.5 适配器注册表

```typescript
// src/core/adapters/registry.ts

type AdapterType = 'sqlite' | 'supabase' | 'cloudbase';

class AdapterRegistry {
  private static instance: AdapterRegistry;
  private connectionAdapter: IConnectionAdapter;
  private authAdapter: IAuthAdapter;
  private storageAdapter: IStorageAdapter;
  private notificationAdapter: INotificationAdapter;

  // 根据环境变量或配置文件选择适配器
  static async initialize(config?: { type: AdapterType }): Promise<void>;
  
  // 全局访问器 — db 返回 Drizzle 实例，保留所有类型安全
  static get db(): DrizzleInstance { return this.instance.connectionAdapter.getConnection(); }
  static get connection(): IConnectionAdapter;
  static get auth(): IAuthAdapter;
  static get storage(): IStorageAdapter;
  static get notification(): INotificationAdapter;
}
```

### 2.6 核心实体重构

在 `src/core/db/schema.ts` 中新增以下表：

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `teams` | 团队/组织 | id, name, ownerId, plan, settings |
| `consumers` | 外部消费者（区别于 members） | id, email, displayName, teamId, tier |
| `aiApps` | AI 应用/Service 定义 | id, name, description, ownerId, status, version |
| `services` | Marketplace 服务实例 | id, aiAppId, teamId, pricingModel, status |

**现有表扩展**：

| 表 | 新增字段 | 说明 |
|----|----------|------|
| `tasks` | `estimatedValue`, `actualValue`, `tokenCost`, `costBreakdown` | DeskClaw 借鉴：任务价值追踪 |
| `skills` | `evolutionLevel`, `experienceCount`, `lastPromotedAt` | Skill 进化引擎扩展 |
| `members` | `teamId` | 关联团队 |

### 2.7 数据迁移脚本

```
scripts/db/migrate-v1-to-v1.1.ts
```

- 检测当前 schema 版本
- 增量添加新表和新字段（不删除/修改已有列）
- 为现有数据填充默认值
- 向后兼容：v1 数据在 v1.1 schema 下正常工作

### 2.8 Setup Wizard 前端

位于 `src/features/setup-wizard/SetupWizard.tsx`

- Step 1：选择数据库后端（SQLite / Supabase / CloudBase）
- Step 2：输入连接配置
- Step 3：测试连接
- Step 4：运行迁移
- Step 5：完成

仅在首次启动或检测到无配置时显示。

### 2.9 AI 工时分解

| 子任务 | AI工时 | Token | 产出估计 |
|--------|--------|-------|----------|
| 连接层适配器接口 + SQLite 连接适配器 | 0.5h | ~15K | ~300行 |
| Schema 跨数据库兼容层（sqliteTable/pgTable/mysqlTable） | 1.5h | ~40K | ~600行 |
| Supabase (PostgreSQL) 连接适配器 | 1.5h | ~35K | ~500行 |
| CloudBase (MySQL) 连接适配器 | 1.0h | ~25K | ~400行 |
| 核心实体重构 + 数据表 | 1.5h | ~40K | ~600行 |
| Setup Wizard 前端 | 1.0h | ~25K | ~500行 |
| 数据迁移脚本 | 0.5h | ~10K | ~200行 |
| 测试（含回归测试） | 1.5h | ~35K | ~600行 |

> 总计 ~9h（比原方案多 1h，主要增加在 Schema 兼容层和测试工时）

### 2.10 验收标准

- [ ] `IConnectionAdapter` / `IAuthAdapter` / `IStorageAdapter` / `INotificationAdapter` 四大接口定义完整
- [ ] SQLite 连接适配器通过所有现有 107 个测试（零回归）
- [ ] **现有所有 113 个 API Route 的 Drizzle query 代码无改动**
- [ ] Supabase 连接适配器可连接远程 PostgreSQL 并执行基本 CRUD
- [ ] CloudBase 连接适配器可连接远程 MySQL 并执行基本 CRUD
- [ ] `AdapterRegistry.db` 返回 Drizzle 实例，支持运行时切换
- [ ] Setup Wizard 可引导用户完成配置
- [ ] 数据迁移脚本在现有数据上执行无报错
- [ ] `npm run build` 通过
- [ ] 新增实体表（teams / consumers / aiApps / services）正确创建
- [ ] tasks 表新字段（estimatedValue / actualValue / tokenCost）可读写

---

## 3. Phase 1B：Skill Evolution Engine（~7.5 AI工时）

> **优先级**：P0  
> **前置条件**：无（利用现有 `knowhow-parser.ts` L1-L5 基础）  
> **并行**：与 Phase 1A 同时进行  
> **完成标志**：Skill 执行时自动加载历史经验，用户修正可记录并触发晋升建议

### 3.1 目标

实现 Skill 的"越用越好"能力：
1. Agent 执行 Skill 时的经验自动记录
2. 相同场景经验自动归并（去重 + 频率统计）
3. 高频经验自动晋升为 L1 规则
4. 下次执行时自动注入相关历史经验

### 3.1.1 闭环设计分析（按设计原则 6 项检查清单）

| 检查项 | 回答 |
|--------|------|
| **1. 原子能力盘点** | ✅ 复用现有：`knowhow-parser.ts`（parseKnowHow/appendToL4/extractLayers）、`update_knowledge` MCP 工具、`KnowledgeConfig` SOP 复用配置。新建 3 个 MCP 工具（record/get/promote），符合单一职责。 |
| **2. 交互点盘点** | Skill 场景下有 4 个交互点：① Skill 推送（invoke_skill）→ ② Skill 执行中（Agent 工作）→ ③ 执行完成/用户修正 → ④ 下次 Skill 推送 |
| **3. 上下文分解** | 需传递信息拆分为：a) **L1 核心规则**（推送时注入，~200 token）；b) **Top 10 历史经验**（推送时注入，~500 token）；c) **结晶提示 hint**（完成时展示）；d) **修正模板**（用户修正时提供格式） |
| **4. 插入位置** | a) L1+经验：**invoke_skill 推送时**注入（最近前置原则 — 离 Agent 使用最近）；b) 结晶 hint：**任务完成返回时**插入（记忆最新鲜）；c) 修正录入：**用户修正当下**触发 `record_skill_experience` |
| **5. 注意力保护** | Top 10 经验注入预算：≤500 token（每条 ≤50 token × 10）。格式为精简的 `场景 → 修正` 单行模式。推送模板不含结晶提示，结晶提示只在完成时展开。 |
| **6. 闭环验证** | ✅ 完整闭环：**消费**（invoke_skill 时读取 L1 + Top 10 经验）→ **生产**（用户修正时 record_skill_experience 写入 L4）→ **复用**（下次 invoke_skill 自动读取新经验） |

```
闭环流程图：

invoke_skill ──[注入 L1 + Top10]──▶ Agent 执行 ──▶ 输出结果
                                                        │
                                                        ▼
下次 invoke_skill ◀── 经验库更新 ◀── record_experience ◀── 用户修正
       │                  ▲
       │                  │ (occurrenceCount ≥3)
       └── L1 规则更新 ◀── promote_experience
```

### 3.2 需要新增的数据库表

在 `src/core/db/schema.ts` 中添加：

```typescript
// Skill 经验记录表
export const skillExperiences = sqliteTable('skill_experiences', {
  id: text('id').primaryKey(),
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  
  // 经验内容
  scenario: text('scenario').notNull(),           // 场景描述（用于归并）
  originalJudgment: text('original_judgment'),     // 原始判断
  correction: text('correction').notNull(),        // 修正后
  reasoning: text('reasoning'),                    // 修正理由
  
  // 归并统计
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  lastOccurredAt: integer('last_occurred_at', { mode: 'timestamp' }).notNull(),
  
  // 元数据
  source: text('source', { enum: ['user_correction', 'auto_detect', 'manual'] }).notNull(),
  taskId: text('task_id'),                         // 关联任务（可选）
  memberId: text('member_id'),                     // 记录者
  
  // 晋升状态
  promotedToL1: integer('promoted_to_l1', { mode: 'boolean' }).default(false),
  promotedAt: integer('promoted_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Skill 进化日志表
export const skillEvolutionLogs = sqliteTable('skill_evolution_logs', {
  id: text('id').primaryKey(),
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  
  action: text('action', { 
    enum: ['experience_recorded', 'experience_merged', 'promoted_to_l1', 'health_check', 'experience_filtered'] 
  }).notNull(),
  
  detail: text('detail', { mode: 'json' }).$type<Record<string, unknown>>(),
  
  // 谁触发的
  triggeredBy: text('triggered_by'),               // memberId 或 'system'
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 3.3 skills 表扩展字段

在现有 `skills` 表中添加：

```typescript
// 进化相关字段
evolutionLevel: integer('evolution_level').default(0),       // 0=基础, 1=有经验, 2=成熟, 3=专家
experienceCount: integer('experience_count').default(0),     // 总经验条目数
promotedRuleCount: integer('promoted_rule_count').default(0),// 已晋升规则数
lastPromotedAt: integer('last_promoted_at', { mode: 'timestamp' }),
healthScore: integer('health_score').default(100),           // 0-100 健康分
```

### 3.4 新增 3 个 MCP 工具

在 `src/core/mcp/definitions.ts` 中添加：

#### record_skill_experience

```typescript
record_skill_experience: {
  name: 'record_skill_experience',
  description: '记录 Skill 执行经验。当用户修正 AI 输出时调用，自动归并相同场景的经验。',
  parameters: {
    type: 'object',
    properties: {
      skill_id: { type: 'string', description: 'Skill ID' },
      scenario: { type: 'string', description: '场景描述（用于归并匹配）' },
      original_judgment: { type: 'string', description: '原始判断/输出' },
      correction: { type: 'string', description: '修正后的正确内容' },
      reasoning: { type: 'string', description: '修正理由' },
      task_id: { type: 'string', description: '关联任务 ID（可选）' },
    },
    required: ['skill_id', 'scenario', 'correction'],
  },
}
```

#### get_skill_experiences

```typescript
get_skill_experiences: {
  name: 'get_skill_experiences',
  description: '获取 Skill 的历史经验列表，按 occurrenceCount 降序排列。用于 invoke_skill 前自动注入。',
  parameters: {
    type: 'object',
    properties: {
      skill_id: { type: 'string', description: 'Skill ID' },
      limit: { type: 'number', description: '返回数量限制（默认 10）' },
      min_occurrence: { type: 'number', description: '最小出现次数过滤（默认 1）' },
    },
    required: ['skill_id'],
  },
}
```

#### promote_skill_experience

```typescript
promote_skill_experience: {
  name: 'promote_skill_experience',
  description: '将高频经验晋升为 L1 核心规则。自动追加到 Skill 的 know-how L1 层级。',
  parameters: {
    type: 'object',
    properties: {
      experience_id: { type: 'string', description: '经验记录 ID' },
      rule_text: { type: 'string', description: '提炼后的规则文本' },
    },
    required: ['experience_id', 'rule_text'],
  },
}
```

### 3.5 MCP Handler 实现

新增 `src/domains/skill/evolution-mcp.ts`：

**核心逻辑**：

1. **record_skill_experience**：
   - 过滤检查：跳过一次性拼写错误、纯格式调整
   - 归并检查：用 `scenario` 字段模糊匹配现有记录（编辑距离 < 0.3）
   - 如果匹配到：`occurrenceCount++`，更新 `lastOccurredAt`
   - 如果是新的：创建新记录
   - 更新 skills 表 `experienceCount`
   - 如果 `occurrenceCount >= 3`：返回晋升建议

2. **get_skill_experiences**：
   - 查询 `skill_experiences` 表
   - 按 `occurrenceCount` 降序
   - 格式化为 `scenario → correction` 格式供 Agent 注入

3. **promote_skill_experience**：
   - 标记 `promotedToL1 = true`
   - 通过 `appendToL4` → 手动追加到 L1（或创建新的 L1 段落）
   - 记录 `skill_evolution_logs`
   - 更新 skills 表 `promotedRuleCount`

### 3.6 invoke_skill 增强

修改现有 `src/domains/skill/mcp.ts` 中的 `invoke_skill` 处理逻辑：

```typescript
// 在执行 skill 前，自动加载 Top 10 历史经验
const experiences = await getSkillExperiences(skillId, { limit: 10 });
if (experiences.length > 0) {
  const experienceBlock = formatExperiencesForInjection(experiences);
  // 追加到 skill 的 prompt context 中
  enhancedPrompt = `${originalPrompt}\n\n## 历史经验（自动注入）\n${experienceBlock}`;
}
```

### 3.7 健康巡检

新增定时检查（可集成到现有 `scheduled-tasks` 系统）：

- L4 条目超过 50 条 → 提醒整理
- 有经验记录但 `occurrenceCount >= 3` 未晋升 → 提醒晋升
- 1 周内无新经验 → 标记为"稳定"

### 3.8 AI 工时分解

| 子任务 | AI工时 | Token | 产出估计 |
|--------|--------|-------|----------|
| DB Schema 扩展 + 迁移 | 1.0h | ~25K | ~200行 |
| 3 个 MCP 工具定义 + Handler | 2.0h | ~50K | ~800行 |
| 过滤/去重/晋升逻辑 | 1.5h | ~35K | ~600行 |
| invoke_skill 增强 + 经验注入 | 1.0h | ~25K | ~300行 |
| 测试（MCP handler + 归并 + 晋升逻辑） | 1.5h | ~35K | ~600行 |
| 文档 | 0.5h | ~10K | ~200行 |

> 总计 ~7.5h（测试占比 20%）

### 3.9 验收标准

- [ ] `skill_experiences` 和 `skill_evolution_logs` 表创建成功
- [ ] `skills` 表新增进化相关字段
- [ ] `record_skill_experience` 可记录经验、自动归并
- [ ] `get_skill_experiences` 返回 Top N 经验
- [ ] `promote_skill_experience` 可晋升规则并追加到 L1
- [ ] `invoke_skill` 执行前自动注入相关历史经验
- [ ] 过滤逻辑：一次性错误不记录
- [ ] 归并逻辑：相同场景自动合并并增加计数
- [ ] 阈值逻辑：≥3 次出现时返回晋升建议
- [ ] `npm run build` 通过

---

## 4. Phase 2：Workflow Engine 重写（~14.5 AI工时）

> **优先级**：P0  
> **前置条件**：Phase 1A（DB Adapter 就绪）  
> **完成标志**：现有所有 SOP 模板在新引擎下可正常执行，新 Workflow 类型可创建运行

### 4.1 目标

完全重写 SOP 引擎为通用 Workflow Engine，支持 DAG 执行、条件分支、循环、并行等高级流控，**同时 100% 向后兼容现有 SOP**。

### 4.2 核心设计：WorkflowNode 类型

```typescript
// src/core/workflow/types.ts

type WorkflowNodeType = 
  | 'sop'            // SOP 兼容节点（包装现有 StageType）
  | 'condition'      // 条件分支（if/else）
  | 'loop'           // 循环节点（for/while）
  | 'parallel'       // 并行执行
  | 'workflow_call'  // 调用子 Workflow
  | 'ai_auto'        // AI 自动执行
  | 'input'          // 等待输入
  | 'render';        // 渲染输出

interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  description?: string;
  
  // 连接关系（DAG）
  nextNodes: string[];           // 后继节点 ID 列表
  prevNodes: string[];           // 前驱节点 ID 列表
  
  // SOP 兼容（type='sop' 时使用）
  sopStageType?: StageType;      // 映射到现有 7 种 StageType
  sopStageConfig?: SOPStage;     // 完整 SOP 阶段配置
  
  // 条件分支（type='condition' 时使用）
  condition?: {
    expression: string;           // 条件表达式
    trueNext: string;             // 条件为真时的下一个节点
    falseNext: string;            // 条件为假时的下一个节点
  };
  
  // 循环（type='loop' 时使用）
  loop?: {
    maxIterations: number;
    breakCondition: string;
    bodyNodeId: string;           // 循环体起始节点
  };
  
  // 并行（type='parallel' 时使用）
  parallel?: {
    branches: string[][];          // 每个分支的节点 ID 列表
    joinType: 'all' | 'any';      // 等待所有完成 或 任一完成
  };
  
  // Trust Policy
  trustLevel?: 'auto' | 'supervised' | 'manual';
  requireApproval?: boolean;
  
  // 通用配置
  promptTemplate?: string;
  timeout?: number;               // 超时（秒）
  retryPolicy?: { maxRetries: number; backoff: 'linear' | 'exponential' };
}
```

### 4.3 SOP 向后兼容映射

**现有 SOP 7 种 StageType → WorkflowNode 自动映射**：

```typescript
function sopStageToWorkflowNode(stage: SOPStage): WorkflowNode {
  const baseNode = {
    id: stage.id,
    label: stage.label,
    description: stage.description,
    type: 'sop' as const,
    sopStageType: stage.type,
    sopStageConfig: stage,
  };
  
  return baseNode;
}

// 映射规则：
// input          → { type: 'sop', sopStageType: 'input' }
// ai_auto        → { type: 'sop', sopStageType: 'ai_auto' }
// ai_with_confirm → { type: 'sop', sopStageType: 'ai_with_confirm' }
// manual         → { type: 'sop', sopStageType: 'manual' }
// render         → { type: 'sop', sopStageType: 'render' }
// export         → { type: 'sop', sopStageType: 'export' }
// review         → { type: 'sop', sopStageType: 'review' }
```

**兼容策略**：
- 现有 `sopTemplates` 表保持不动
- 新增 `workflows` 表 存储新格式
- 运行时：检测 task 关联的是 `sopTemplateId` 还是 `workflowId`
- 如果是 SOP：自动将 `stages[]` 转换为线性 WorkflowNode 链
- SOP MCP Handler（`src/domains/sop/mcp.ts`）保持不动，新增 Workflow Handler

### 4.4 新增数据库表

```typescript
// Workflow 模板表
export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  
  // 节点定义（DAG）
  nodes: text('nodes', { mode: 'json' }).$type<WorkflowNode[]>(),
  
  // 入口节点
  entryNodeId: text('entry_node_id'),
  
  // 关联
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  createdBy: text('created_by'),
  
  // 元数据
  version: integer('version').default(1),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).default('draft'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Workflow 执行实例
export const workflowRuns = sqliteTable('workflow_runs', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id),
  taskId: text('task_id').references(() => tasks.id),
  
  // 执行状态
  status: text('status', { enum: ['running', 'paused', 'completed', 'failed', 'cancelled'] }).notNull(),
  currentNodeId: text('current_node_id'),
  
  // 节点执行历史
  nodeHistory: text('node_history', { mode: 'json' }).$type<WorkflowNodeRecord[]>(),
  
  // 上下文变量（节点间传递数据）
  context: text('context', { mode: 'json' }).$type<Record<string, unknown>>(),
  
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 4.5 WorkflowEngine 核心类

```
src/core/workflow/
├── types.ts                     # 类型定义
├── engine.ts                    # WorkflowEngine 主类
├── node-executors/
│   ├── executor.interface.ts    # INodeExecutor 接口
│   ├── sop-executor.ts          # SOP 兼容节点执行器
│   ├── condition-executor.ts    # 条件分支执行器
│   ├── loop-executor.ts         # 循环执行器
│   ├── parallel-executor.ts     # 并行执行器
│   ├── ai-auto-executor.ts      # AI 自动执行器
│   ├── input-executor.ts        # 输入等待执行器
│   └── render-executor.ts       # 渲染执行器
├── sop-compat.ts                # SOP → Workflow 转换层
└── trust-policy.ts              # Trust Policy 引擎
```

**WorkflowEngine 核心方法**：

```typescript
class WorkflowEngine {
  // 启动 workflow
  async start(workflowId: string, taskId: string, initialContext?: Record<string, unknown>): Promise<WorkflowRun>;
  
  // 推进到下一个节点
  async advance(runId: string, nodeOutput?: unknown): Promise<WorkflowRun>;
  
  // 暂停/恢复
  async pause(runId: string): Promise<void>;
  async resume(runId: string): Promise<void>;
  
  // 断点续执行
  async replayFrom(runId: string, nodeId: string): Promise<WorkflowRun>;
  
  // SOP 兼容：将 SOP 模板转换为 Workflow 并执行
  async startFromSOP(sopTemplateId: string, taskId: string): Promise<WorkflowRun>;
}
```

### 4.6 Trust Policy

```typescript
// src/core/workflow/trust-policy.ts

interface TrustPolicy {
  level: 'auto' | 'supervised' | 'manual';
  rules: TrustRule[];
}

interface TrustRule {
  nodeType: WorkflowNodeType;
  action: 'allow' | 'require_approval' | 'deny';
  conditions?: {
    costThreshold?: number;       // Token 消耗阈值
    dataAccessLevel?: 'none' | 'read' | 'write' | 'admin';  // 数据访问级别（枚举）
    externalApiCall?: boolean;    // 是否调用外部 API
  };
}
```

### 4.7 Workflow 可视化编辑器

新增 `src/features/workflow-editor/`：

**MVP（Phase 2 交付）**：
- 节点列表视图（表格形式展示节点 + 连接关系）
- 属性面板（选中节点后编辑配置）
- 执行面板（实时查看 workflow 运行状态）
- SOP 导入（将现有 SOP 导入为 Workflow）

**Phase 2.1（延后交付）**：
- 画布式 DAG 编辑器（使用 `@xyflow/react` 库）
- 拖拽创建/连接节点
- 节点间连线动画

### 4.8 tasks 表扩展

```typescript
// 在 tasks 表新增字段
workflowId: text('workflow_id').references(() => workflows.id),
workflowRunId: text('workflow_run_id').references(() => workflowRuns.id),
```

运行时逻辑：
- `task.sopTemplateId` 有值 → 走旧 SOP 流程
- `task.workflowId` 有值 → 走新 Workflow 引擎
- 两者互斥

### 4.8.1 SOP → Workflow 迁移期间的 MCP 行为规范

> **设计决策**：迁移期间，SOP MCP Handler 和 Workflow MCP Handler **共存但互斥路由**，由 task 关联字段决定走哪条路径。
>
> **被排除的方案**：统一为一个 Handler + 内部自动判断
> - 排除理由：现有 SOP MCP Handler 已有 1022 行 + 12 种 Action，强行合并会使代码更难维护

**`advance_stage` 路由逻辑**（核心改动点）：

```typescript
// src/domains/sop/mcp.ts — 现有 advance_stage 的增强
async execute(params, context) {
  if (action === 'advance_stage') {
    const task = await getTask(params.task_id);
    
    // 互斥校验（API 层实现，非 MCP handler 层）
    if (task.sopTemplateId && task.workflowId) {
      throw new Error('Task cannot have both sopTemplateId and workflowId');
    }
    
    // 路由分发
    if (task.workflowId) {
      // 委托给 Workflow Engine
      return workflowEngine.advance(task.workflowRunId, params.output);
    }
    
    // 走现有 SOP 流程（零改动）
    return this.handleAdvanceStage(params, context);
  }
}
```

**互斥校验位置**：
- 在 `tasks` 的 **API PUT 路由**中校验（`app/api/projects/[id]/tasks/[taskId]/route.ts`）
- 禁止同时设置 `sopTemplateId` 和 `workflowId`
- 返回 400: `{ error: 'sopTemplateId and workflowId are mutually exclusive' }`

**12 个现有 SOP Action 的兼容表**：

| SOP Action | 迁移期行为 | 改动量 |
|------------|-----------|--------|
| `advance_stage` | 增加 workflowId 路由判断 | ~20行 |
| `request_confirm` | 不变（SOP 专属） | 0 |
| `get_context` | 不变 | 0 |
| `save_stage_output` | 不变 | 0 |
| `update_knowledge` | 不变（知识库与 SOP/Workflow 无关） | 0 |
| `create_template` | 不变 | 0 |
| `update_template` | 不变 | 0 |
| `create_render_template` | 不变 | 0 |
| `update_render_template` | 不变 | 0 |
| `list_render_templates` | 不变 | 0 |
| `get_render_template` | 不变 | 0 |

> **结论**：仅 `advance_stage` 需要改动，其余 11 个 Action 零改动。

### 4.9 AI 工时分解

| 子任务 | AI工时 | Token | 产出估计 |
|--------|--------|-------|----------|
| 类型定义 + WorkflowEngine 核心 | 3.0h | ~75K | ~1200行 |
| 8 种 Node 执行器 | 2.5h | ~60K | ~1200行 |
| SOP 兼容层（映射 + 转换 + advance_stage 路由） | 1.5h | ~35K | ~500行 |
| Trust Policy 基础 | 1.5h | ~35K | ~400行 |
| Workflow 可视化前端（MVP 节点列表视图） | 2.0h | ~55K | ~800行 |
| 断点续执行 + 状态追踪 | 1.0h | ~25K | ~400行 |
| 测试（SOP 回归 + Workflow 新功能 + 互斥校验） | 3.0h | ~75K | ~1200行 |

> 总计 ~14.5h（测试占比 ~20%）

### 4.10 验收标准

- [ ] `workflows` 和 `workflowRuns` 表创建成功
- [ ] WorkflowEngine 可执行线性节点链
- [ ] WorkflowEngine 支持条件分支、循环、并行
- [ ] **所有现有 SOP 模板在新引擎下可正常执行**（核心！）
- [ ] SOP → Workflow 自动转换功能正常
- [ ] `advance_stage` MCP 工具在 SOP 兼容模式下行为不变
- [ ] Trust Policy 可限制节点执行权限
- [ ] 断点续执行功能正常
- [ ] Workflow 可视化编辑器基础功能可用
- [ ] `npm run build` 通过

---

## 5. Phase 3：Marketplace + Consumer System（~12.5 AI工时）

> **优先级**：P0  
> **前置条件**：Phase 1A（实体 + Adapter 就绪）  
> **完成标志**：Consumer 可注册、浏览 Marketplace、激活并使用 Service；支付接口已定义但无实际支付处理

### 5.1 目标

构建完整的 Service Marketplace 和 Consumer 体系（除支付），包括：
- Consumer 注册/登录/个人中心
- Service 发布/浏览/搜索/详情
- 动态评分 + 进化机制
- 激活码 + 订阅
- 用量追踪 + Quota
- Artifact Renderer

### 5.2 新增数据库表

```typescript
// ===== Consumer 相关 =====

// 消费者表（区别于内部 members）
export const consumers = sqliteTable('consumers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash').notNull(),
  
  tier: text('tier', { enum: ['free', 'pro', 'enterprise'] }).default('free'),
  credits: integer('credits').default(0),
  
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### 5.2.1 Consumer Auth 与 Member Auth 双轨认证设计

> **设计决策**：Consumer 和 Member 使用**完全独立**的认证体系，互不干扰。
>
> **被排除的方案**：共享 `members` 表 + 添加 `role: 'consumer'`
> - 排除理由：Consumer 是外部付费用户，Member 是内部协作成员，生命周期、权限粒度、数据隔离需求完全不同；混用会导致权限模型复杂度爆炸

| 维度 | Member Auth | Consumer Auth |
|------|-------------|---------------|
| **用户表** | `members` | `consumers` |
| **认证方式** | argon2 本地 + 现有 `src/domains/auth/` | argon2 本地（复用同一 adapter） |
| **Session 存储** | Cookie（现有实现） | JWT（独立签发，含 `sub: consumerId`） |
| **路由前缀** | `/api/*`（现有） | `/api/consumer/*`（独立命名空间） |
| **middleware.ts** | 现有 CSRF + Origin 检查 | 新增 JWT 验证中间件（仅匹配 `/api/consumer/*`） |
| **Store** | `useAuthStore`（现有） | `useConsumerAuthStore`（新建） |

**middleware.ts 路由区分逻辑**：

```typescript
// middleware.ts 新增逻辑
if (pathname.startsWith('/api/consumer/')) {
  // Consumer JWT 验证
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // 验证 JWT 并注入 consumerId 到 request header
} else if (pathname.startsWith('/api/')) {
  // 现有 Member 认证逻辑（保持不动）
}
```

**Consumer API 路由前缀**：

```
app/api/consumer/
├── auth/
│   ├── login/route.ts          # POST — Consumer 登录（返回 JWT）
│   ├── register/route.ts       # POST — Consumer 注册
│   └── me/route.ts             # GET — 当前 Consumer 信息
├── services/route.ts           # GET — 已订阅的 Service 列表
├── usage/route.ts              # GET — 用量统计
└── orders/route.ts             # GET — 订单列表
```

```typescript
// ===== Marketplace 相关 =====

// Service 动态评分
export const serviceRatings = sqliteTable('service_ratings', {
  id: text('id').primaryKey(),
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  consumerId: text('consumer_id').notNull().references(() => consumers.id),
  
  rating: integer('rating').notNull(),               // 1-5
  feedback: text('feedback'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 激活码
export const activationKeys = sqliteTable('activation_keys', {
  id: text('id').primaryKey(),
  serviceId: text('service_id').notNull().references(() => services.id),
  
  key: text('key').notNull().unique(),
  status: text('status', { enum: ['unused', 'activated', 'expired', 'revoked'] }).default('unused'),
  
  activatedBy: text('activated_by').references(() => consumers.id),
  activatedAt: integer('activated_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 订阅
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  consumerId: text('consumer_id').notNull().references(() => consumers.id),
  serviceId: text('service_id').notNull().references(() => services.id),
  
  plan: text('plan', { enum: ['trial', 'monthly', 'yearly', 'lifetime'] }).notNull(),
  status: text('status', { enum: ['active', 'paused', 'cancelled', 'expired'] }).default('active'),
  
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 用量追踪
export const serviceUsage = sqliteTable('service_usage', {
  id: text('id').primaryKey(),
  consumerId: text('consumer_id').notNull().references(() => consumers.id),
  serviceId: text('service_id').notNull().references(() => services.id),
  subscriptionId: text('subscription_id').references(() => subscriptions.id),
  
  tokenCount: integer('token_count').default(0),
  requestCount: integer('request_count').default(0),
  
  // Quota 限制
  quotaTokens: integer('quota_tokens'),              // null = 无限
  quotaRequests: integer('quota_requests'),
  
  periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
  periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ===== 支付预留（决策 D3）=====

// ServiceOrder（预留表结构，Phase 3 只建表不实现支付）
export const serviceOrders = sqliteTable('service_orders', {
  id: text('id').primaryKey(),
  consumerId: text('consumer_id').notNull().references(() => consumers.id),
  serviceId: text('service_id').notNull().references(() => services.id),
  
  amount: integer('amount').notNull(),                // 金额（分）
  currency: text('currency').default('CNY'),
  
  status: text('status', { 
    enum: ['pending', 'paid', 'refunded', 'cancelled', 'failed'] 
  }).default('pending'),
  
  paymentMethod: text('payment_method'),              // 预留：'wechat' | 'stripe' | 'credits'
  paymentId: text('payment_id'),                      // 外部支付 ID
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### 5.3 services 表补全（Phase 1A 创建的基础上）

```typescript
// 在 services/aiApps 表中确保以下字段
popularityScore: real('popularity_score').default(0),
effectivenessScore: real('effectiveness_score').default(0),
averageRating: real('average_rating').default(0),
ratingCount: integer('rating_count').default(0),
rankWeight: real('rank_weight').default(0),
totalUsageTokens: integer('total_usage_tokens').default(0),
totalUsageRequests: integer('total_usage_requests').default(0),
```

### 5.4 支付预留接口

```typescript
// src/core/adapters/payment/payment-adapter.interface.ts

export interface IPaymentAdapter {
  // 创建支付订单
  createOrder(params: {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
    returnUrl?: string;
  }): Promise<{ paymentUrl: string; paymentId: string }>;

  // 查询支付状态
  queryOrder(paymentId: string): Promise<{
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    paidAt?: Date;
  }>;

  // 退款
  refund(paymentId: string, amount: number): Promise<{ refundId: string }>;

  // 验证回调签名
  verifyCallback(payload: unknown, signature: string): boolean;
}

// Phase 3 只定义接口，不实现。Phase 5 实现具体支付方式。
```

### 5.5 新增 Domain 模块

```
src/domains/consumer/          # Consumer 消费者
├── index.ts
├── store.ts
├── mcp.ts
└── api/
    ├── route.ts               # GET (list) + POST (register)
    └── [id]/route.ts          # GET + PUT + DELETE

src/domains/marketplace/       # Marketplace 市场
├── index.ts
├── store.ts
├── mcp.ts
└── api/
    ├── route.ts               # GET (service list with search/filter/sort)
    ├── [id]/route.ts          # GET (service detail)
    ├── [id]/rate/route.ts     # POST (submit rating)
    ├── [id]/activate/route.ts # POST (activate with key)
    └── [id]/subscribe/route.ts# POST (subscribe)

src/domains/usage/             # Usage 用量追踪
├── index.ts
├── store.ts
└── api/
    ├── route.ts               # GET (usage summary)
    └── [consumerId]/route.ts  # GET (specific consumer usage)
```

### 5.6 动态评分 + 进化机制

```typescript
// src/domains/marketplace/scoring.ts
// 注：评分逻辑是 marketplace domain 专属的业务逻辑，不放 shared/lib

// 每日定时重算 rankWeight
function recalculateRankWeight(service: Service): number {
  const w1 = 0.3; // 用户评分权重
  const w2 = 0.3; // 使用量权重
  const w3 = 0.2; // 最近活跃度权重
  const w4 = 0.2; // 效果评分权重
  
  return w1 * normalizedRating 
       + w2 * normalizedUsage 
       + w3 * recencyScore 
       + w4 * effectivenessScore;
}

// 进化机制：
// - rankWeight < 0.2 连续 7 天 → 降权（从推荐列表隐藏）
// - rankWeight > 0.8 → 推荐位展示
// - 新 Service 有 14 天扶持期（rankWeight 最低 0.5）
```

### 5.7 Artifact Renderer

新增 `src/features/artifact-renderer/`：

- 动态 UI 渲染能力（参考 DeerFlow）
- 支持 Markdown / HTML / React 组件 / 图表
- 用于 Service 的产出物展示

### 5.8 前端页面

```
src/features/marketplace/
├── MarketplacePage.tsx          # 市场首页（搜索 + 分类 + 排行）
├── ServiceDetailPage.tsx        # 服务详情（评分 + 描述 + 激活）
├── ConsumerDashboard.tsx        # 消费者控制台（订阅 + 用量）
└── components/
    ├── ServiceCard.tsx
    ├── RatingStars.tsx
    ├── UsageChart.tsx
    └── ActivationForm.tsx

src/features/consumer-auth/
├── ConsumerLogin.tsx
├── ConsumerRegister.tsx
└── ConsumerProfile.tsx
```

### 5.9 AI 工时分解

| 子任务 | AI工时 | Token | 产出估计 |
|--------|--------|-------|----------|
| Consumer 实体 + Auth 流程（含 JWT 中间件） | 2.0h | ~50K | ~800行 |
| Marketplace 前端 | 2.0h | ~50K | ~1000行 |
| 动态评分 + 进化机制 | 1.5h | ~35K | ~500行 |
| ActivationKey + Subscription | 1.5h | ~35K | ~600行 |
| ServiceUsage + Quota + Credits | 1.0h | ~25K | ~400行 |
| Artifact Renderer | 1.5h | ~40K | ~600行 |
| 支付预留接口 + ServiceOrder | 0.5h | ~15K | ~200行 |
| 测试（Consumer Auth + Marketplace CRUD + 评分 + 用量） | 2.5h | ~60K | ~800行 |

> 总计 ~12.5h（测试占比 20%）

### 5.10 验收标准

- [ ] Consumer 可注册/登录/查看个人信息
- [ ] Marketplace 列表页正常展示 Service
- [ ] 搜索/过滤/排序功能正常
- [ ] 评分可提交，averageRating 自动计算
- [ ] ActivationKey 生成/激活流程完整
- [ ] Subscription 创建/查看/取消功能正常
- [ ] ServiceUsage 用量记录和 Quota 限制生效
- [ ] rankWeight 可重算，降权/推荐逻辑正确
- [ ] `IPaymentAdapter` 接口已定义
- [ ] `serviceOrders` 表已创建
- [ ] Artifact Renderer 可渲染 Markdown/HTML
- [ ] `npm run build` 通过

---

## 6. Phase 4：Proactive Engine + 可观测性 + 效能面板（~8 AI工时）

> **优先级**：P1  
> **前置条件**：Phase 1B（Skill Evolution）+ Phase 1A（Task 扩展字段）  
> **完成标志**：任务逾期能自动预警，EventLog 可追溯，效能面板可查看 Token 归因

### 6.1 Proactive Engine

**与现有 EventBus 的关系**：

> **设计决策**：Proactive Engine 的 Context Monitor **复用现有 `eventBus`** 作为事件输入源，不新建独立事件系统。
>
> **被排除的方案**：独立的 Proactive 事件管线
> - 排除理由：现有 `event-bus.ts` 已覆盖所有写操作的 SSE 事件，新建管线会导致事件重复和维护成本倍增

```
现有 EventBus                    Proactive Engine
─────────────                    ────────────────
API 写操作 ──▶ eventBus.emit()  ──┬──▶ SSE(/api/sse) ──▶ DataProvider（现有）
                                   │
                                   └──▶ ProactiveListener ──▶ Pattern Analyzer ──▶ Decision Engine ──▶ Action Executor
                                        (新增：监听 eventBus)
```

**ProactiveListener 实现**：

```typescript
// src/core/proactive/listener.ts
// 在 API 启动时注册，监听 eventBus 的关键事件
eventBus.on('task_updated', (payload) => proactiveEngine.evaluate('task_overdue', payload));
eventBus.on('delivery_updated', (payload) => proactiveEngine.evaluate('delivery_stuck', payload));
eventBus.on('skill_updated', (payload) => proactiveEngine.evaluate('skill_health', payload));
// 定时触发（复用现有 scheduled-tasks 系统）
scheduledTasks.register('proactive_check', '*/30 * * * *', () => proactiveEngine.runScheduledChecks());
```

**6 种内置触发条件**：

| 触发条件 | 检测逻辑 | 自动动作 |
|----------|----------|----------|
| 任务逾期预警 | `task.dueDate - now < 24h && status != completed` | 推送提醒给负责人 |
| 交付积压提醒 | `delivery.status == 'reviewing'` 超过 48h | 升级到 PM |
| 上下文断层 | Agent 连续 3 次请求同一文档 | 自动预加载相关文档 |
| Skill 健康 | `skill.healthScore < 60` | 触发 Skill 巡检 |
| 进度风险 | `milestone.progress < expected` | 推送风险预警 |
| 新人上手 | `member.experienceTaskCount < 3` | 推荐入门 Skill |

**新增表**：

```typescript
export const proactiveRules = sqliteTable('proactive_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  triggerType: text('trigger_type', { 
    enum: ['task_overdue', 'delivery_stuck', 'context_gap', 'skill_health', 'progress_risk', 'onboarding'] 
  }).notNull(),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  projectId: text('project_id').references(() => projects.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const proactiveEvents = sqliteTable('proactive_events', {
  id: text('id').primaryKey(),
  ruleId: text('rule_id').notNull().references(() => proactiveRules.id),
  triggerData: text('trigger_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  actionTaken: text('action_taken'),
  status: text('status', { enum: ['triggered', 'acted', 'dismissed', 'failed'] }).default('triggered'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 6.2 可观测性

**EventLog（事件溯源）**：

```typescript
export const eventLogs = sqliteTable('event_logs', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),          // 'task.created', 'skill.invoked', 'workflow.advanced' 等
  entityType: text('entity_type').notNull(),         // 'task', 'skill', 'workflow', 'member'
  entityId: text('entity_id').notNull(),
  
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  
  actorType: text('actor_type', { enum: ['user', 'agent', 'system'] }).notNull(),
  actorId: text('actor_id'),
  
  // Token 归因
  tokenCount: integer('token_count'),
  tokenCost: real('token_cost'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 死信队列
export const deadLetters = sqliteTable('dead_letters', {
  id: text('id').primaryKey(),
  originalEventId: text('original_event_id'),
  error: text('error').notNull(),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  status: text('status', { enum: ['pending', 'retrying', 'dead'] }).default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 熔断器状态
export const circuitStates = sqliteTable('circuit_states', {
  id: text('id').primaryKey(),
  serviceName: text('service_name').notNull().unique(),
  state: text('state', { enum: ['closed', 'open', 'half_open'] }).default('closed'),
  failureCount: integer('failure_count').default(0),
  lastFailureAt: integer('last_failure_at', { mode: 'timestamp' }),
  openedAt: integer('opened_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### 6.3 效能面板

新增 `src/features/analytics/`：

- **Token 消耗归因**：Token → Task → Project 三级穿透
- **Agent 效能排名**：完成任务数 / Token 消耗比 / 质量评分
- **价值产出比**：Task estimatedValue vs actualValue 对比图
- **时间线视图**：按时间展示所有 EventLog

### 6.4 AI 工时分解

| 子任务 | AI工时 | Token |
|--------|--------|-------|
| Proactive Engine 核心 + 6 种触发 | 2.5h | ~60K |
| EventLog + DeadLetter + CircuitState | 2.0h | ~50K |
| 效能面板前端 | 2.0h | ~50K |
| 测试 + 文档 | 1.5h | ~40K |

### 6.5 验收标准

- [ ] Proactive Engine 可检测任务逾期并发送预警
- [ ] 6 种触发条件至少 4 种正常工作
- [ ] EventLog 可记录所有关键操作
- [ ] DeadLetter 死信队列正常运行
- [ ] CircuitState 熔断器在连续失败时触发
- [ ] 效能面板可展示 Token 归因图
- [ ] Agent 效能排名正确计算
- [ ] `npm run build` 通过

---

## 7. Phase 5：支付对接 + 变现 + OKR（~4 AI工时）

> **优先级**：P2  
> **前置条件**：Phase 3（Marketplace + 支付预留就绪）  
> **启动条件**：商业验证后决定  
> **完成标志**：Consumer 可付费购买 Service，Token 消耗可归因到收入

### 7.1 IPaymentAdapter 实现

- **WeChatPayAdapter**：微信支付 Native/JSAPI
- **StripeAdapter**：Stripe Checkout / Payment Intents

### 7.2 Credits 充值链路

```
Consumer 充值 → 创建 ServiceOrder → 跳转支付 → 回调确认 → Credits 到账
Consumer 使用 Service → 检查 Quota → 扣减 Credits → 记录 Usage
```

### 7.3 OKR 集成（可选）

```typescript
export const projectObjectives = sqliteTable('project_objectives', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  progress: integer('progress').default(0),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const keyResults = sqliteTable('key_results', {
  id: text('id').primaryKey(),
  objectiveId: text('objective_id').notNull().references(() => projectObjectives.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  targetValue: real('target_value').notNull(),
  currentValue: real('current_value').default(0),
  unit: text('unit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// KeyResult ↔ Task 关联表（替代 JSON 存储，更规范）
export const keyResultTasks = sqliteTable('key_result_tasks', {
  keyResultId: text('key_result_id').notNull().references(() => keyResults.id, { onDelete: 'cascade' }),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.keyResultId, table.taskId] }),
}));
```

### 7.4 AI 工时分解

| 子任务 | AI工时 | Token |
|--------|--------|-------|
| 支付适配器实现 | 1.5h | ~35K |
| Credits 完整链路 | 1.0h | ~25K |
| OKR 集成（可选） | 1.0h | ~25K |
| 全面测试 + 文档 | 0.5h | ~15K |

### 7.5 验收标准

- [ ] 微信支付或 Stripe 至少一种可完成支付
- [ ] Credits 充值/扣减链路完整
- [ ] ServiceOrder 状态流转正确
- [ ] OKR 可创建 Objective → KeyResult → 关联 Task
- [ ] `npm run build` 通过

---

## 8. 跨 Phase 注意事项

### 8.1 数据迁移策略

- **永远增量添加**：只添加新表/新字段，不修改/删除已有结构
- **默认值**：新字段必须有 `.default()` 或允许 `null`
- **向后兼容**：v1 数据在 v1.1 schema 下必须可正常读取
- **迁移脚本路径**：`scripts/db/migrate-v1-to-v1.1.ts`

### 8.2 SSE 事件扩展

每个新 Domain 模块的写操作都需要：
1. 在 `src/shared/lib/event-bus.ts` 的 `SSEEventType` 中添加事件类型
2. API Route 写操作后调用 `eventBus.emit()`
3. 前端 `DataProvider` 处理新事件类型并刷新对应 Store

### 8.3 国际化

所有新增的用户可见文本必须：
1. 在 `src/shared/lib/locales/en.ts` 和 `zh.ts` 中添加翻译
2. 使用 `t('module.key')` 引用
3. API 错误消息使用英文

### 8.4 测试要求

- 每个新 Domain 模块需要：
  - Unit tests（MCP Handler 逻辑）
  - Integration tests（API Route CRUD）
  - 关键流程 E2E tests
- 目标覆盖率 ≥ 80%

### 8.5 Git 提交规范

```
feat(adapter): implement IConnectionAdapter interface and SQLite connection adapter
feat(skill-evo): add record_skill_experience MCP tool
feat(workflow): implement WorkflowEngine with DAG execution
feat(marketplace): add Consumer registration and Service listing
feat(proactive): implement task overdue detection
feat(payment): add Stripe payment adapter
```

---

## 9. 快速参考：MCP 工具扩展清单

### Phase 1B 新增（3 个）

| 工具名 | 说明 |
|--------|------|
| `record_skill_experience` | 记录 Skill 执行经验 |
| `get_skill_experiences` | 获取历史经验列表 |
| `promote_skill_experience` | 晋升经验为 L1 规则 |

### Phase 2 新增（预计 4-6 个）

| 工具名 | 说明 |
|--------|------|
| `create_workflow` | 创建 Workflow 模板 |
| `start_workflow` | 启动 Workflow 执行 |
| `advance_workflow_node` | 推进 Workflow 节点 |
| `get_workflow_status` | 查询 Workflow 运行状态 |
| `pause_workflow` | 暂停 Workflow |
| `resume_workflow` | 恢复 Workflow |

### Phase 3 新增（预计 3-5 个）

| 工具名 | 说明 |
|--------|------|
| `list_marketplace_services` | 浏览 Marketplace |
| `activate_service` | 激活 Service |
| `check_usage_quota` | 检查用量配额 |
| `submit_service_rating` | 提交评分 |

### Phase 4 新增（预计 2-3 个）

| 工具名 | 说明 |
|--------|------|
| `get_proactive_events` | 获取主动引擎事件 |
| `dismiss_proactive_event` | 忽略事件 |
| `get_analytics_summary` | 获取效能摘要 |

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Adapter 层性能开销 | 查询变慢 | 连接层适配器，零查询开销（现有 Drizzle query 不变） |
| SOP 兼容不完整 | 现有功能回归 | Phase 2 必须覆盖所有 SOP 场景测试 |
| 新表太多导致 SQLite 性能下降 | 大数据量变慢 | 见下方索引策略 + 归档方案 |
| Workflow 可视化编辑器复杂度 | 前端工时超标 | MVP 版本仅实现节点列表视图，画布视图（@xyflow/react）延后到 Phase 2.1 |
| Consumer Auth 与 Member Auth 冲突 | 路由混乱 | Consumer 使用独立路由前缀 `/api/consumer/` + JWT 认证（见 §5.2.1） |

### 10.1 新表索引策略（~18 张新表）

> 从 35 张 → ~53 张（+51%），必须为高频查询建立索引。

| Phase | 表名 | 必建索引 | 说明 |
|-------|------|----------|------|
| 1A | `teams` | `(ownerId)` | 按创建者查团队 |
| 1A | `consumers` | `(email)` UNIQUE | 登录查询 |
| 1A | `aiApps` | `(ownerId, status)` | 按状态筛选 |
| 1A | `services` | `(aiAppId)`, `(teamId)`, `(rankWeight DESC)` | 市场排序 |
| 1B | `skill_experiences` | `(skillId, scenario)`, `(skillId, occurrenceCount DESC)` | 归并匹配 + Top N 查询 |
| 1B | `skill_evolution_logs` | `(skillId, createdAt)` | 时间线查询 |
| 2 | `workflows` | `(projectId, status)` | 项目内筛选 |
| 2 | `workflowRuns` | `(workflowId, status)`, `(taskId)` | 状态查询 + 任务关联 |
| 3 | `serviceRatings` | `(serviceId)`, `(consumerId)` | 评分聚合 |
| 3 | `activationKeys` | `(key)` UNIQUE, `(serviceId, status)` | 激活码查找 |
| 3 | `subscriptions` | `(consumerId, status)`, `(serviceId)` | 订阅查询 |
| 3 | `serviceUsage` | `(consumerId, periodStart)`, `(serviceId)` | 用量查询 |
| 3 | `serviceOrders` | `(consumerId, status)`, `(serviceId)` | 订单查询 |
| 4 | `proactiveRules` | `(projectId, enabled)` | 按项目查规则 |
| 4 | `proactiveEvents` | `(ruleId, status)`, `(createdAt)` | 事件筛选 |
| 4 | `eventLogs` | `(entityType, entityId)`, `(createdAt)`, `(actorType)` | 溯源查询 |
| 4 | `deadLetters` | `(status)` | 待重试队列 |
| 5 | `projectObjectives` | `(projectId)` | 项目 OKR |
| 5 | `keyResults` | `(objectiveId)` | 关联查询 |

### 10.2 数据归档策略

| 表 | 归档条件 | 归档方式 | 保留期 |
|----|----------|----------|--------|
| `eventLogs` | `createdAt < 90天前` | 导出为 JSON 归档文件 → 删除源行 | 热数据 90 天 |
| `proactiveEvents` | `status = 'acted' or 'dismissed'` 且 `createdAt < 30天前` | 同上 | 热数据 30 天 |
| `skill_evolution_logs` | `createdAt < 180天前` | 仅保留晋升记录，删除其余 | 热数据 180 天 |
| `deadLetters` | `status = 'dead'` 且 `createdAt < 7天前` | 直接删除 | 7 天 |

**`circuitStates` 不做归档**：该表最多几十行（每个 serviceName 一行），内存级数据量，无需持久化优化。

**归档脚本路径**：`scripts/db/archive-old-data.ts`（定时执行，建议每日凌晨）

---

_Last updated: 2026-03-25T18:00:00Z (Review 修订版：修复 C1-C3 CRITICAL + H1-H5 HIGH + M1-M5 MEDIUM + L1-L4 LOW)_
