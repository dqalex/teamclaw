# TeamClaw v1.1 重构规划

> 版本：v1.1 Draft  
> 日期：2026-03-25  
> 负责人：Alex  
> 状态：规划中（决定重构方案）

---

## 核心定位

> **OpenClaw = AI 操作系统（CLI）**  
> **TeamClaw = 系统 UI（GUI）**  
> TeamClaw 不做 AI，只做 AI 的可视化

---

## 文档结构

| 章节 | 内容 |
|------|------|
| **一、竞品总览** | 市场格局 + 竞品列表 |
| **二、核心竞品分析** | Dify / Coze Studio / n8n / ToolJet / Google AI Studio / Zapier |
| **三、竞品矩阵** | 能力对比表 |
| **四、差异化机会** | 市场空白 + TeamClaw 优势 |
| **五、参考学习** | 各竞品学习点 |
| **六、v1 现有能力盘点** | SOP / Skill / Delivery / Auth / MCP |
| **七、重构方案（v1.1）** | 适配器 / 耦合 / 核心实体 / DDD / Consumer / Workflow / 迁移 / OpenClaw / 风险 |
| **八、Skill 自进化引擎** | SkillMemory 平台化 + 经验积累 + 规则晋升 |
| **九、DeskClaw 借鉴模块** | 动态评分 / Task 价值 / 事件溯源 / OKR / Trust Policy / 效能面板 |
| **十、Proactive Engine** | 主动智能引擎、触发条件、数据模型 |
| **十一、AI 执行层调研** | DeerFlow / Coze / Dify / n8n 深度分析 |
| **十二、里程碑** | Phase 1-6 + 预计周期 |

---

## 方案决策

> **选择重构（v1.1）而非扩展**
> - 理由：长期架构清晰，Member 和 Consumer 完全分离，多租户支持好
> - 风险：周期长，但分阶段交付可控

> 调研日期：2026-03-24  
> 信息来源：GitHub + 官网 + DeskClaw 源码分析

### 关键决策（2026-03-25 确认）

| # | 决策点 | 决策结果 | 理由 |
|---|--------|---------|------|
| D1 | Phase 1 优先级 | **Adapter System + Skill Evolution Engine 并行推进** | 两者无硬依赖，并行可缩短总工期 |
| D2 | Workflow 引擎策略 | **完全重写，但必须向后兼容现有 SOP（SKILL 表达）** | 现有 SOP 7 种 StageType 是核心资产，新引擎需保持兼容层 |
| D3 | Marketplace 范围 | **除支付外全部开发，支付预留接口 + 数据表** | 支付需要商业验证后再接入，但表结构和接口必须预埋 |
| D4 | 时间线估算方式 | **使用 AI Coding 指标（token 量 + AI 工时）** | 项目以 AI 编码为主，传统人工工时不适用 |

---

## 一、竞品总览

| 产品 | 公司 | GitHub ⭐ | 定位 |
|------|------|-----------|------|
| **Dify** | LangGenius | 134,187 | 开源 LLM 应用开发平台 |
| **n8n** | n8n.io | ~80k+ | 工作流自动化 + AI |
| **Coze Studio** | 字节跳动 | 20,297 | AI Agent 可视化开发平台 |
| **ToolJet** | ToolJet | 37,643 | 开源低代码平台 |
| **DeskClaw** | NoDeskAI | - | 人与 AI 共同经营组织的平台 |
| **Coze (扣子)** | 字节跳动 | - | 商业化 AI Agent 平台 |
| **Google AI Studio** | Google | - | Gemini 模型开发平台 |
| **Zapier** | Zapier | - | 商业工作流自动化 |

---

## 二、核心竞品分析

### 2.1 Dify（134,187 ⭐）⭐⭐⭐⭐⭐

**定位**：Production-ready agentic workflow development platform

**核心功能**：
- **Workflow**：可视化画布构建 AI 工作流
- **Agent**：基于 Function Calling / ReAct 的 Agent
- **RAG Pipeline**：文档摄取 → 检索 → 生成
- **Prompt IDE**：提示词编写 + 模型对比
- **LLMOps**：日志分析 + 持续优化
- **Backend-as-a-Service**：API 接口

**优点**：
- 功能最全面（Workflow + RAG + Agent + LLMOps）
- 开源且功能完整
- 文档完善

**缺点**：
- 对话式 UI 弱
- 消费者分发能力弱
- 无内置多租户/变现机制

**官网**：https://dify.ai  
**GitHub**：https://github.com/langgenius/dify

---

### 2.2 Coze Studio（20,297 ⭐）⭐⭐⭐⭐

**定位**：All-in-one AI agent development platform（字节跳动）

**核心功能**：
- **Model Service**：模型列表管理（OpenAI + 火山引擎）
- **Build Agent**：Agent 构建 + 发布
- **Build Apps**：通过 Workflow 构建业务逻辑
- **Build Workflow**：可视化工作流编排
- **Plugins / Knowledge Base / Database / Prompts**：资源管理
- **API + SDK**：OpenAPI + Chat SDK

**优点**：
- 字节内部打磨多年
- 完整的产品化能力
- 支持 IM 渠道发布（飞书、Slack）

**缺点**：
- 主要面向企业内部
- 消费者分发能力弱
- 无变现机制

**官网**：https://www.coze.cn  
**GitHub**：https://github.com/coze-dev/coze-studio

---

### 2.3 n8n（~80k ⭐）⭐⭐⭐⭐

**定位**：Fair-code workflow automation with native AI capabilities

**核心功能**：
- **400+ Integrations**：SaaS、数据库、API 集成
- **AI with LangChain**：构建 AI Agent 工作流
- **Code When You Need**：支持 JS/Python 定制
- **Self-host or Cloud**：灵活部署

**优点**：
- 工作流自动化成熟
- AI 原生支持
- 社区活跃（400+ 集成）

**缺点**：
- AI 功能是附加能力，不是核心
- 无消费者分发
- 无变现机制

**官网**：https://n8n.io  
**GitHub**：https://github.com/n8n-io/n8n

---

### 2.4 ToolJet（37,643 ⭐）⭐⭐⭐

**定位**：Open-source low-code platform for AI apps

**核心功能**：
- 低代码应用构建
- 50+ 数据源连接
- AI Assistant 内置
- 自部署

**优点**：
- 低代码 UI 构建强
- 数据源集成丰富

**缺点**：
- 不是 AI-first
- 工作流能力弱
- 无消费者分发

**官网**：https://tooljet.com  
**GitHub**：https://github.com/ToolJet/ToolJet

---

### 2.5 DeskClaw ⭐⭐⭐⭐

**定位**：人与 AI 共同经营组织的平台

**核心功能**：
- **赛博办公室**：六边形拓扑的可视化工作空间
- **基因系统**：三维评分（热度/效能/人工评价）+ 自动淘汰进化
- **中央黑板**：任务 + 讨论 + 文件的统一协作面板
- **可观测性**：事件溯源 + 死信队列 + 熔断器
- **Trust Policy**：AI 行为分级授权
- **效能度量**：Task 价值归因 + Token 消耗追踪
- **OKR 集成**：目标 → 关键结果 → 任务串联

**核心优势**：
- 基因系统的"进化"思路独特（低效自动降权、高效自动推荐）
- Task 价值追踪（estimated_value / actual_value / token_cost）
- 完整的可观测性基础设施

**缺点**：
- 无消费者分发/变现机制
- K8s 部署门槛高
- 无 Workflow 引擎

**GitHub**：https://github.com/NoDeskAI/nodeskclaw  
**详细对比**：见 `deskclaw-vs-teamclaw-analysis.md`

---

### 2.6 Google AI Studio

**定位**：Google Gemini 模型开发平台

**核心功能**：
- Gemini API 接入
- Prompt 工程工具
- 模型对比
- API Keys 管理

**优点**：
- Google 全模型支持
- 深度 Gemini 集成

**缺点**：
- 不是应用平台
- 无 Workflow
- 无消费者分发

---

### 2.7 Zapier（商业）

**定位**：No-code workflow automation

**核心功能**：
- 6000+ App 集成
- No-code 工作流
- AI Actions

**优点**：
- 集成最广
- 用户基数大

**缺点**：
- 无 AI 应用构建能力
- 无消费者分发
- 订阅制，价格高

---

## 三、竞品矩阵

| 能力 | Dify | Coze Studio | n8n | ToolJet | DeskClaw | TeamClaw |
|------|------|-------------|-----|---------|----------|----------|
| **Workflow 可视化** | ✅ | ✅ | ✅ | ✅ | ❌ | 现有 SOP |
| **Agent 执行** | ✅ | ✅ | ✅ | ❌ | ✅ | 依赖 OpenClaw |
| **RAG** | ✅ | ✅ | ❌ | ❌ | ❌ | 依赖 OpenClaw |
| **多模型支持** | ✅ | ✅ | ✅ | ✅ | ✅ | 依赖 OpenClaw |
| **动态 UI（Artifact）** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ DeerFlow 参考 |
| **消费者分发** | ❌ | 部分 | ❌ | ❌ | ❌ | ✅ Marketplace |
| **变现机制** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Activation + Credits |
| **多租户** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Consumer System |
| **Plugin SDK** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ OpenClaw 集成 |
| **无代码构建** | 部分 | ✅ | 部分 | ✅ | ❌ | ✅ AI 生成 SOP |
| **动态评分/进化** | ❌ | ❌ | ❌ | ❌ | ✅ Gene | ✅ v1.1 借鉴 |
| **Task 价值追踪** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ v1.1 借鉴 |
| **事件溯源** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ v1.1 借鉴 |
| **Skill 自进化** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ v1.1 新增 |
| **Trust Policy** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ v1.1 借鉴 |

---

## 四、差异化机会

### 4.1 市场空白

| 空白 | 说明 |
|------|------|
| **AI 应用分发** | 所有竞品面向企业内/开发者，无消费者分发 |
| **动态 UI 渲染** | 无竞品做 AI 生成 + 沙箱执行的动态 UI |
| **无代码 AI 应用** | 用户描述需求 → AI 自动生成 SOP/Workflow |
| **变现机制** | 无竞品内置激活码 + 用量限制 + Marketplace |
| **OpenClaw 集成** | 无竞品深度绑定 OpenClaw Skill 生态 |
| **Skill 自进化** | 无竞品实现 Skill 级别的经验积累 → 规则晋升闭环 |

### 4.2 TeamClaw 优势

基于 OpenClaw AI Runtime 的差异化：

| 能力 | TeamClaw | 竞品 |
|------|----------|------|
| **OpenClaw Skill 生态** | ✅ 全部 | ❌ |
| **AI Operating System** | OpenClaw | 自有 AI |
| **Skill 分发（ClawHub）** | ✅ | ❌ |
| **Artifact 动态 UI** | ✅ DeerFlow 参考 | ❌ |
| **消费者变现** | ✅ Activation + Credits | ❌ |
| **Skill 自进化** | ✅ 越用越好 | ❌ |
| **动态评分进化** | ✅ 借鉴 DeskClaw Gene | ❌ |

---

## 五、参考学习

### Dify
- Workflow 画布设计
- RAG Pipeline 实现
- LLMOps 日志分析

**链接**：https://github.com/langgenius/dify

### Coze Studio
- 字节产品化思路
- IM 渠道集成
- 多租户架构

**链接**：https://github.com/coze-dev/coze-studio

### DeerFlow（已研究）
- Artifact 动态 UI
- Web Preview 组件
- AIO Sandbox

**链接**：https://github.com/bytedance/deer-flow

### DeskClaw
- 基因评分 + 进化机制
- Task 价值/Token 归因
- 事件溯源 + 熔断 + 死信
- OKR 集成
- Trust Policy（AI 行为分级授权）

**链接**：https://github.com/NoDeskAI/nodeskclaw

### n8n
- 工作流自动化最佳实践
- LangChain 集成

**链接**：https://github.com/n8n-io/n8n

### SkillMemory
- Skill 自进化机制（经验积累 → 规则晋升）
- 知识库分层守卫规则
- 跨会话任务续接

**链接**：本地参考 `SkillMemory/`

---

## 六、v1 现有能力盘点

### 6.1 核心能力清单

| 能力 | 文件位置 | 定位 |
|------|----------|------|
| **SOP 引擎** | `src/domains/sop/` | 7 种阶段类型（input/ai_auto/render/review...）|
| **Skill 管理** | `src/domains/skill/` | 注册/审批/信任/快照监控 |
| **Delivery** | `src/domains/delivery/` | 文档交付审核 |
| **Project / Task** | `src/domains/project/` / `src/domains/task/` | 组织结构 |
| **MCP 工具** | `src/core/mcp/`（37 个）| OpenClaw 工具接口 |
| **Member / Auth** | `src/domains/member/` / `src/domains/auth/` | 用户认证 |
| **Wiki / 知识库** | `src/domains/document/` | 双向链接文档 + L1-L5 分层 |
| **Chat 会话** | `src/domains/chat/` | 多模式对话 |

### 6.2 SOP 引擎现状

**阶段类型（StageType）**：
```typescript
type StageType =
  | 'input'           // 等待人工输入
  | 'ai_auto'         // AI 自动执行
  | 'ai_with_confirm' // AI 执行后暂停，等人工确认
  | 'manual'          // 纯人工操作
  | 'render'          // Content Studio 可视化编辑
  | 'export'          // 导出
  | 'review';         // 提交交付审核
```

**SOP 数据模型**：
```typescript
SOPStage {
  id, label, type, promptTemplate,
  requiredInputs?,   // input 类型时
  confirmMessage?,   // ai_with_confirm 时
  outputType?,       // 产出类型
  knowledgeLayers?, // 知识库层级
  renderTemplateId?, // 渲染模板
  rollbackStageId?  // 驳回回退
}
```

**MCP 接口**（SOPHandler）：
- `advance_stage` — 推进阶段
- `request_confirm` — 请求确认
- `get_context` — 获取上下文
- `save_stage_output` — 保存产出
- `create_template` — 创建模板

### 6.3 Skill 管理现状

**已有能力**：
- SKILL.md 注册与解析
- 审批流程（管理员审批发布）
- 信任管理（trust/reject）
- 快照监控（定期检测变更）

### 6.4 知识库分层现状

TeamClaw 已实现知识库五层分层体系：

| 层级 | 内容类型 | 注入时机 | 实现状态 |
|------|----------|----------|----------|
| **L1** | 核心规则/概要 | 任务推送时自动植入 | ✅ 已实现 |
| **L2** | 详细标准/规范 | 按需读取 | ✅ 已实现 |
| **L3** | 案例库/模板 | 按需读取 | ✅ 已实现 |
| **L4** | 经验记录/踩坑 | Agent 动态写入 | ✅ 已实现（`appendToL4`） |
| **L5** | 维护日志/变更 | 人工归档 | ✅ 已实现（`updateL5Stats`） |

**关键代码**：
- `knowhow-parser.ts` — 知识库解析
- `appendToL4()` — L4 经验追加
- `update_knowledge` MCP 工具 — Agent 写入

---

## 七、重构方案（v1.1）

### 7.1 重构原则

> **一步到位，重新设计数据模型**
> - Member（内部团队）和 Consumer（外部用户）完全分离
> - 多租户架构：Team → Project → AI App
> - 不带历史包袱，从 v1.0.1 直接升级到 v1.1

### 7.2 适配器体系（Adapter System）

#### 7.2.1 核心理念

> **开源项目必须支持多后端，开发者可自由扩展**

TeamClaw v1.1 采用适配器模式，核心业务逻辑与具体后端服务解耦。开发者可对接任意数据库、认证服务、存储服务。

#### 7.2.2 架构图

```
┌─────────────────────────────────────────────────────┐
│              TeamClaw Core（核心业务逻辑）                │
│     Project / Task / Delivery / AI App / SOP         │
└──────────────────────────┬────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────┐
│            Adapter Interface（适配器接口层）                │
│                                                      │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐ │
│   │   DB    │  │  Auth   │  │ Storage │  │Notify  │ │
│   │ Adapter │  │ Adapter │  │ Adapter │  │Adapter│ │
│   └─────────┘  └─────────┘  └─────────┘  └───────┘ │
└──────────────────────────┬────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Supabase │      │ CloudBase │      │  SQLite  │
   │PostgreSQL│      │   MySQL   │      │ (Local)  │
   └──────────┘      └──────────┘      └──────────┘
```

#### 7.2.3 适配器接口定义

```typescript
// 数据库适配器接口
interface IDatabaseAdapter {
  query<T>(sql: string, params?: any[]): Promise<T[]>
  execute(sql: string, params?: any[]): Promise<void>
  transaction<T>(fn: () => Promise<T>): Promise<T>
  getSchema(): string  // 返回建表 SQL
}

// 认证适配器接口
interface IAuthAdapter {
  signUp(email: string, password: string): Promise<User>
  signIn(email: string, password: string): Promise<User>
  signInWithOAuth(provider: string): Promise<User>
  signOut(): Promise<void>
  getCurrentUser(): Promise<User | null>
  sendPasswordReset(email: string): Promise<void>
}

// 存储适配器接口
interface IStorageAdapter {
  upload(path: string, file: Buffer): Promise<string>  // 返回 URL
  download(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
  getSignedUrl(path: string, expiresIn: number): Promise<string>
}

// 通知适配器接口
interface INotificationAdapter {
  sendEmail(to: string, subject: string, body: string): Promise<void>
  sendSMS(phone: string, message: string): Promise<void>
  sendPush(userId: string, title: string, body: string): Promise<void>
}
```

#### 7.2.4 初始化向导

```
┌─────────────────────────────────────────┐
│           TeamClaw 安装 / 首次启动            │
└─────────────────────┬───────────────────┘
                      ▼
┌─────────────────────────────────────────┐
│        初始化向导（Setup Wizard）           │
│                                           │
│  Step 1: 选择数据库                       │
│  ○ Supabase (PostgreSQL)                 │
│  ○ CloudBase (MySQL)                     │
│  ○ SQLite (本地开发)                     │
│  ○ 自定义连接                            │
│                                           │
│  Step 2: 选择认证方式                    │
│  ○ Supabase Auth (Google/GitHub/邮箱)    │
│  ○ 微信登录 (CloudBase)                   │
│  ○ 邮箱 + 验证码                         │
│  ○ 自定义 Auth                           │
│                                           │
│  Step 3: 选择存储                        │
│  ○ Supabase Storage                      │
│  ○ CloudBase Storage                     │
│  ○ S3 / 阿里云 OSS                       │
│  ○ 本地文件存储                           │
│                                           │
│  Step 4: 创建管理员账户                    │
└─────────────────────────────────────────┘
```

#### 7.2.5 当前支持的后端

| 类型 | 支持的服务 |
|------|-----------|
| **数据库** | Supabase PostgreSQL ✅ / CloudBase MySQL ✅ / SQLite ✅ / 其他（扩展）|
| **认证** | Supabase Auth ✅ / CloudBase 微信登录 ✅ / 邮箱验证码（自建）✅ / 其他（扩展）|
| **存储** | Supabase Storage ✅ / CloudBase Storage ✅ / S3 ✅ / 本地 ✅ |
| **通知** | 邮件（SMTP）✅ / SMS（扩展）✅ / Push（扩展）✅ |

---

### 7.3 现有模块耦合分析

| 模块 | 当前实现 | 耦合程度 | 需要重构 |
|------|---------|---------|---------|
| **数据库** | SQLite + Drizzle ORM | 🔴 高耦合 | ✅ 抽象 DB Adapter |
| **认证** | 自建 argon2id + Session | 🔴 高耦合 | ✅ 抽象 Auth Adapter |
| **存储** | 本地文件系统 | 🟡 中耦合 | ✅ 抽象 Storage Adapter |
| **OpenClaw 集成** | MCP Handler | 🟡 中耦合 | ⚠️ 保持现状（plugin-sdk 兼容）|

**重构优先级**：

| 优先级 | 模块 | 工作量 | 理由 |
|--------|------|--------|------|
| P0 | 数据库适配器 | 高 | 核心，其他模块依赖 |
| P0 | 认证适配器 | 高 | 安全关键，用户数据 |
| P1 | 存储适配器 | 中 | 上传功能，使用频率低 |
| P2 | 通知适配器 | 低 | 可后续扩展 |

---

### 7.4 核心实体设计

```typescript
// ============================================
// 认证层（Auth）
// ============================================

User {
  id: string
  email: string (unique)
  passwordHash: string
  emailVerified: boolean
  createdAt: timestamp
  updatedAt: timestamp
}

// ============================================
// 内部团队（Team / Member）
// ============================================

Team {
  id: string
  name: string
  ownerId: string (FK → User)
  createdAt: timestamp
}

Member {
  id: string
  userId: string (FK → User, unique per team)
  teamId: string (FK → Team)
  role: 'owner' | 'admin' | 'member'
  name: string
  avatar?: string
  isAI: boolean
  createdAt: timestamp
}

// ============================================
// 项目（Project）
// ============================================

Project {
  id: string
  teamId: string (FK → Team)
  name: string
  description?: string
  createdAt: timestamp
  updatedAt: timestamp
}

Task {
  id: string
  projectId: string (FK → Project)
  assigneeId?: string (FK → Member)
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // DeskClaw 借鉴：价值与成本追踪
  estimatedValue?: number     // 预估价值（元/积分）
  actualValue?: number        // 实际价值
  tokenCost?: number          // 累计 Token 消耗
  costBreakdown?: {           // Token 消耗明细
    model: string
    inputTokens: number
    outputTokens: number
    cost: number
  }[]
  
  blockerReason?: string      // 阻塞原因
  completedAt?: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

Wiki {
  id: string
  projectId: string (FK → Project)
  title: string
  content: text
  ...
}

Delivery {
  id: string
  projectId: string (FK → Project)
  memberId: string (FK → Member)
  type: 'document' | 'artifact' | 'app'
  status: 'pending' | 'approved' | 'rejected'
  ...
}

// ============================================
// AI 应用（AI App）- 核心新实体
// ============================================

AIApp {
  id: string
  publisherType: 'team' | 'member'
  publisherId: string
  projectId?: string (FK → Project)
  name: string
  description: string
  status: 'draft' | 'published' | 'archived'
  createdAt: timestamp
  updatedAt: timestamp
}

AppWorkflow {
  id: string
  appId: string (FK → AIApp)
  workflow: {
    nodes: WorkflowNode[]
  }
  version: number
  createdAt: timestamp
}

AppArtifact {
  id: string
  appId: string (FK → AIApp)
  type: 'web-preview' | 'form' | 'table' | 'code' | 'chat'
  content: string
  previewUrl?: string
  createdAt: timestamp
}

// ============================================
// 市场（Marketplace）- Consumer 视角
// ============================================

Consumer {
  id: string
  userId: string (FK → User)
  plan: 'free' | 'pro' | 'enterprise'
  credits: number
  expiresAt?: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

Service {
  id: string
  appId: string (FK → AIApp)
  name: string
  description: string
  type: 'skill' | 'workflow' | 'app'
  price: number
  quota: {
    daily?: number
    monthly?: number
    total?: number
  }
  status: 'draft' | 'published' | 'archived'
  
  // DeskClaw 借鉴：动态评分
  popularityScore: number       // 热度分（订阅/使用次数推导）
  effectivenessScore: number    // 效能分（AI 执行成功率 + 用户反馈）
  ratingCount: number           // 评分次数
  averageRating: number         // 平均评分（1-5）
  rankWeight: number            // 推荐权重（由评分动态计算）
  lastEvalAt?: timestamp        // 上次评估时间
  
  createdAt: timestamp
}

// DeskClaw 借鉴：Service 反馈表
ServiceRating {
  id: string
  serviceId: string (FK → Service)
  userId?: string               // 人类评分
  agentId?: string              // Agent 互评
  rating: 1 | 2 | 3 | 4 | 5
  feedback?: string
  usageContext: Record<string, any>
  createdAt: timestamp
}

ActivationKey {
  id: string
  keyHash: string
  serviceId: string (FK → Service)
  consumerId?: string (FK → Consumer)
  usedAt?: timestamp
  expiresAt?: timestamp
  createdAt: timestamp
}

Subscription {
  id: string
  consumerId: string (FK → Consumer)
  serviceId: string (FK → Service)
  activationKeyId: string (FK → ActivationKey)
  status: 'active' | 'expired' | 'cancelled'
  startedAt: timestamp
  expiresAt?: timestamp
}

ServiceUsage {
  id: string
  subscriptionId: string (FK → Subscription)
  consumerId: string (FK → Consumer)
  serviceId: string (FK → Service)
  usageType: 'credit' | 'count' | 'token'
  amount: number
  createdAt: timestamp
}

ServiceOrder {
  id: string
  consumerId: string (FK → Consumer)
  serviceId: string (FK → Service)
  status: 'pending' | 'paid' | 'refunded'
  amount: number
  createdAt: timestamp
}
```

### 7.5 领域边界（DDD）

```
┌─────────────────────────────────────────────────────────────┐
│                     Auth Domain                              │
│                     User (认证)                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Team / Member Domain                        │
│  Team ──┬── Member ── Project ── Task                       │
│          │                     ── Wiki                       │
│          │                     ── Delivery                   │
│          └── AIApp (publisher = team)                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Consumer Domain                            │
│  Consumer ── Subscription ── Service                         │
│      │                    ── ActivationKey                  │
│      │                    ── ServiceUsage / ServiceRating   │
│      └── ServiceOrder ── (支付)                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    AI App Domain                             │
│  AIApp ── AppWorkflow ── WorkflowNode                      │
│     └── AppArtifact ── ArtifactRenderer                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Skill Evolution Domain（新增）                 │
│  Skill ── SkillExperience ── SkillEvolutionLog             │
│     └── KnowledgeDoc（L1-L5 分层知识库）                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Observability Domain（新增）                     │
│  EventLog ── DeadLetter ── CircuitState                    │
│  ProactiveRule ── ProactiveEvent ── ProactiveHistory        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Marketplace Domain                         │
│  Service (已发布的 AI App) + ServiceRating                  │
│  Consumer 发现 → 订阅 → 激活 → 使用 → 评分                  │
└─────────────────────────────────────────────────────────────┘
```

### 7.6 Consumer App 部署与数据隔离

#### 7.6.1 场景定位

运营者（Publisher）在 TeamClaw 设计 AI App后，可以一键发布到 GitHub + Vercel，部署为独立的消费者应用。

**核心价值**：
- 运营者掌控 AI Runtime 和计费
- 消费者通过 TeamClaw 账号（SSO）使用 App
- 消费者数据存储模式可选（隔离 vs 共享）

#### 7.6.2 部署架构

```
┌─────────────────────────────────────────────────────┐
│              运营者 TeamClaw                              │
│                                                        │
│  ├── AI App 设计工具（Workflow + Artifact）           │
│  ├── 消费者管理（账号/订阅/用量/计费）                │
│  ├── AI Runtime / Skill / MCP                         │
│  └── Consumer Data Store（可选）                       │
└─────────────────────────────────────────────────────┘
                    │
                    │ AI 调用（带 Consumer ID + 用量记录）
                    ▼
┌─────────────────────────────────────────────────────┐
│              运营者的 AI App（Vercel 部署）              │
│                                                        │
│  ├── 前端界面（消费者交互）                           │
│  ├── 业务数据（可选独立 Supabase/CloudBase）          │
│  └── 调用运营者 TeamClaw AI Runtime                   │
└─────────────────────────────────────────────────────┘
```

#### 7.6.3 数据隔离模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **独立数据库** | App 有自己的 Supabase/CloudBase | 注重隐私（医疗、法律）|
| **共享 TeamClaw** | App 使用 TeamClaw 数据库 | 工具类 App |
| **混合模式（推荐）** | 业务数据在 App，身份/订阅在 TeamClaw | 兼顾隔离与统一计费 |

### 7.7 SOP / Workflow 重构

**SOP 引擎重构为通用 Workflow 引擎**：

```typescript
// 统一节点类型
type WorkflowNode =
  | { type: 'sop'; sopId: string; inputMapping?: Record<string, string> }
  | { type: 'condition'; expression: string; branches: { true: WorkflowNode[]; false: WorkflowNode[] } }
  | { type: 'loop'; count: number; nodes: WorkflowNode[] }
  | { type: 'parallel'; nodes: WorkflowNode[] }
  | { type: 'workflow_call'; workflowId: string; inputs: Record<string, string> }
  | { type: 'ai_auto'; prompt: string }
  | { type: 'input'; fields: InputDef[] }
  | { type: 'render'; templateId: string }
  | { type: 'review'; reviewers: string[] }

// 统一执行引擎
class WorkflowEngine {
  async execute(workflow: Workflow, context: ExecutionContext): Promise<NodeResult>
  async executeNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeResult>
}
```

### 7.8 v1 → v1.1 数据迁移

| v1 实体 | v1.1 映射 |
|---------|---------|
| users | User（不变）|
| members | Member + Team + MemberTeam |
| projects | Project（不变）|
| tasks | Task（扩展 value/cost 字段）|
| deliveries | Delivery（扩展 type 字段）|
| sopTemplates | SOPTemplate（复用）|
| skills | Skill（扩展 evolution 字段）|
| mcpTokens | AgentToken（重新设计）|

### 7.9 与 OpenClaw 的关系

```
TeamClaw v1.1（重构后）
     │
     ├── Team / Member（内部协作）
     │     └── 调用 OpenClaw AI Runtime（Agent / Skill / MCP）
     │
     ├── AI App（Workflow + Artifact）
     │     └── Workflow 引擎调用 OpenClaw Skill Executor
     │
     ├── Skill Evolution（自进化）
     │     └── 经验积累 → 规则晋升 → Skill 越用越好
     │
     └── Marketplace（Consumer 视角）
           └── Consumer 的 AI App 调用 OpenClaw
```

### 7.10 重构风险控制

| 风险 | 缓解措施 |
|------|----------|
| 周期太长 | 分阶段交付：Phase 1 核心实体 → Phase 2 Workflow → Phase 3 Marketplace |
| 数据迁移失败 | 先做数据迁移脚本，本地验证 |
| 现有功能 regression | 完整测试套件，覆盖所有 v1 功能 |
| OpenClaw 集成断裂 | plugin-sdk 兼容层先行 |
| Skill 自进化过度复杂 | 先实现最小闭环（记录→统计→建议），晋升需人工确认 |

---

## 八、Skill 自进化引擎（Skill Evolution Engine）

### 8.1 核心理念

> **Skill 不是静态工具，而是越用越好的智能体**
> 
> 将 SkillMemory 的本地文件级记忆机制，提升为 TeamClaw 的平台级自进化能力

### 8.2 SkillMemory 机制回顾

SkillMemory 是一个本地文件级的 Skill 记忆方案，核心闭环：

```
用户修正 → 过滤（跳过一次性错误）
         → 标准化记录（日期/场景/原判断/修正后）
         → 追加到 L4 经验层
         → 下次对话自动读取
         → 同类修正 ≥3 次 → 建议晋升为 L1 核心规则
```

**三层组件**：
- `memory-guard.mdc` — 守卫规则（自动注入每个对话）
- `*-know-how.md` — 知识库（L1 核心规则 + L4 经验记录 + 任务索引 + 维护状态）
- `docs/tasks/*.md` — 任务文档（跨会话续接）

### 8.3 TeamClaw 已有能力 vs 需求 Gap

| SkillMemory 需求 | TeamClaw 现状 | Gap |
|-----------------|-------------|-----|
| 知识库分层（L1-L5） | ✅ `knowhow-parser.ts` 已完整实现 | 无 |
| L4 经验追加 | ✅ `appendToL4()` + `update_knowledge` MCP 工具 | 无 |
| L1 自动植入 | ✅ 任务推送时自动读取 L1 层 | 无 |
| L5 统计更新 | ✅ `updateL5Stats()` | 无 |
| 任务完成后经验沉淀提示 | ✅ `task.mcp.ts` 完成时生成 hint | 半自动 |
| **经验自动过滤** | 🔴 不存在 | **需新增** |
| **同类经验 ≥3 次晋升建议** | 🔴 不存在 | **需新增** |
| **维护状态自动计数** | 🔴 不存在 | **需新增** |
| **定期健康巡检** | 🔴 不存在 | **需新增** |
| **经验→核心规则晋升** | 🔴 L4→L1 仅手动 | **核心需求** |

### 8.4 数据模型

```typescript
// ===== skills 表扩展 =====
skills {
  // ...现有字段...
  
  // Skill 自进化相关
  knowledgeDocId?: string      // 关联的知识库文档 ID
  evolutionEnabled: boolean    // 是否启用自进化
  evolutionConfig?: {
    autoFilterEnabled: boolean    // 自动过滤一次性修正
    promotionThreshold: number   // 晋升阈值（默认 3）
    healthCheckInterval: string  // 健康检查间隔
    maxL4Entries: number         // L4 最大条目数（超出触发归档）
    maxL1Rules: number           // L1 最大规则数（默认 5）
  }
  evolutionStats?: {
    totalCorrections: number    // 累计修正次数
    promotedRules: number       // 已晋升为规则的次数
    lastHealthCheck?: timestamp // 上次健康检查
    l4EntryCount: number        // 当前 L4 条目数
  }
}

// ===== 新增：Skill 经验记录表 =====
skill_experiences {
  id: string
  skillId: string (FK → skills)
  projectId?: string
  
  // 经验内容
  scenario: string              // 场景描述
  originalBehavior: string      // 原始判断
  correctedBehavior: string     // 修正后的行为
  category: string              // 分类标签（格式/风格/逻辑/...）
  
  // 进化追踪
  occurrenceCount: number       // 同类出现次数
  promotedToRule: boolean       // 是否已晋升为核心规则
  promotedAt?: timestamp        // 晋升时间
  
  // 来源
  sourceType: 'user_correction' | 'ai_feedback' | 'system_detection'
  sourceUserId?: string
  sourceTaskId?: string
  
  createdAt: timestamp
  updatedAt: timestamp
}

// ===== 新增：Skill 进化历史表 =====
skill_evolution_logs {
  id: string
  skillId: string (FK → skills)
  
  eventType: 'experience_recorded'     // 经验记录
           | 'experience_deduplicated' // 重复归并
           | 'rule_promotion_suggested' // 晋升建议
           | 'rule_promoted'           // 已晋升
           | 'l4_archived'            // L4 归档
           | 'health_check'           // 健康检查
  
  details: Record<string, any>
  createdAt: timestamp
}
```

### 8.5 新增 MCP 工具

```typescript
// 工具 1: 记录经验
record_skill_experience {
  name: 'record_skill_experience'
  description: '记录 Skill 执行过程中的用户修正经验。自动过滤一次性错误，去重同类修正，达到阈值时建议晋升为核心规则。'
  parameters: {
    skill_key: string       // 必填，Skill 标识
    scenario: string        // 场景
    original: string        // 原始判断
    corrected: string       // 修正后
    category?: string       // 分类
    task_id?: string        // 关联任务
  }
}

// 工具 2: 获取经验
get_skill_experiences {
  name: 'get_skill_experiences'
  description: '获取 Skill 的经验记录，用于执行前加载历史修正。返回按出现频率排序的经验列表。'
  parameters: {
    skill_key: string       // 必填
    category?: string       // 按分类过滤
    limit?: number          // 返回数量（默认 10）
  }
}

// 工具 3: 晋升经验为规则
promote_skill_experience {
  name: 'promote_skill_experience'
  description: '将高频经验晋升为 Skill 知识库的 L1 核心规则。需要管理员确认。'
  parameters: {
    experience_id: string   // 必填
    rule_text: string       // 提炼后的规则文本
  }
}
```

### 8.6 自进化执行流程

```
┌─────────────────────────────────────────────────────────┐
│                  Skill 执行流程（增强后）                    │
│                                                          │
│  1. invoke_skill（触发执行）                              │
│     ├── 加载 SKILL.md 内容                               │
│     ├── 加载知识库 L1 层（已有 ✅）                       │
│     ├── 🆕 加载 skill_experiences（按频率排序 Top 10）    │
│     │   → 注入到执行上下文中                               │
│     └── 执行 Skill 工作流                                 │
│                                                          │
│  2. 用户修正发生时                                        │
│     ├── 🆕 AI 调用 record_skill_experience                │
│     │   ├── 自动过滤                                     │
│     │   │   ├── 跳过纯格式调整                            │
│     │   │   ├── 跳过一次性上下文错误                       │
│     │   │   └── 去重：相同 scenario → occurrenceCount++    │
│     │   ├── 记录到 skill_experiences 表                    │
│     │   ├── 同步追加到知识库 L4（appendToL4）             │
│     │   └── 检查阈值                                     │
│     │       └── occurrenceCount ≥ 3 → 返回晋升建议        │
│     └── 🆕 若有晋升建议，提示人类确认                      │
│         → promote_skill_experience                        │
│         → 将规则写入知识库 L1                              │
│                                                          │
│  3. 任务完成时（增强）                                     │
│     ├── 现有的经验沉淀 hint（update_knowledge）           │
│     ├── 🆕 自动统计：evolutionStats 更新                  │
│     └── 🆕 健康检查触发                                   │
│         └── l4EntryCount ≥ maxL4Entries → 提示归档         │
└─────────────────────────────────────────────────────────┘
```

### 8.7 SkillMemory 约束映射

| SkillMemory 约束 | TeamClaw 实现方式 |
|-----------------|-----------------|
| 核心规则不超过 5 条，每条 < 50 tokens | `evolutionConfig.maxL1Rules = 5`，promote 时校验 |
| 经验记录 ≥10 条时触发维护提醒 | `evolutionConfig.maxL4Entries`，超出时推送提醒 |
| 用户修正 → 过滤 → 标准化 → 写入 | `record_skill_experience` 内置过滤逻辑 |
| 同类经验 ≥3 次 → 建议晋升 | `occurrenceCount` 达到 `promotionThreshold` 时触发 |
| 任务启动时核对一致性 | 用 `activity_logs` 替代 git log 核对 |
| 决策铁律（带理由+排除方案） | 增强 Task context 字段，记录决策表 |
| 每周健康巡检 | Proactive Engine 定时规则 |

### 8.8 与 Service Marketplace 的协同

Skill 自进化（内部）+ Service 动态评分（外部）= 双层进化：

```
内层（Skill 自进化）：
  用户修正 → 经验积累 → 规则晋升 → Skill 执行质量持续提升

外层（Service 动态评分）：
  消费者反馈 → effectivenessScore 更新 → 排名升降
  低效 Service → 自动降权
  高效 Service → 优先推荐

两层联动：
  Skill 自进化 → 执行质量提升 → 效能分上升 → Service 排名上升
```

---

## 九、DeskClaw 借鉴模块

> 来源：DeskClaw 源码深度分析（详见 `deskclaw-vs-teamclaw-analysis.md`）

### 9.1 借鉴总览

| # | 借鉴点 | 融入位置 | 实现复杂度 | 优先级 |
|---|--------|---------|-----------|--------|
| ① | **Service 动态评分 + 进化** | Service 实体扩展 | 中 | P0 |
| ② | **Task 价值/Token 归因** | Task 实体扩展 | 低 | P0 |
| ③ | **事件溯源 + 熔断 + 死信** | Observability Domain | 高 | P1 |
| ④ | **效能度量面板** | 新增模块 | 中 | P1 |
| ⑤ | **OKR 集成** | Project 扩展 | 中 | P2 |
| ⑥ | **Trust Policy** | 独立模块 | 中 | P2 |

### 9.2 Service 动态评分 + 进化机制

借鉴 DeskClaw Gene System 的三维评分 + 自动淘汰：

```
评分模型：
  popularityScore      — 热度分（安装/使用次数）
  effectivenessScore   — 效能分（AI 执行成功率 + 用户反馈）
  averageRating        — 人类点赞/踩 + Agent 互评

进化规则：
  低效 Service → 自动降权（推荐排序下降）
  高效 Service → 优先推荐
```

**数据模型**：已融入 §7.4 核心实体中的 `Service` 和 `ServiceRating`。

### 9.3 Task 价值/Token 归因

借鉴 DeskClaw 的 `estimated_value / actual_value / token_cost`：

- 每次 AI 调用记录 Token 消耗，归因到具体 Task
- Task 完成时可填写实际价值，对比预估价值
- 支持归因链路：Token → Task → Project → OKR（如有）

**数据模型**：已融入 §7.4 核心实体中的 `Task` 扩展字段。

### 9.4 事件溯源 + 熔断 + 死信

借鉴 DeskClaw 的 Observability 层：

```typescript
// 事件溯源表
EventLog {
  id: string
  traceId: string              // 请求级别追踪 ID
  eventType: string            // task.created / ai.invoked / ...
  projectId?: string
  sourceId?: string            // 来源（Member / Agent）
  targetId?: string            // 目标
  data?: Record<string, any>   // 事件数据
  createdAt: timestamp
}

// 死信队列表
DeadLetter {
  id: string
  projectId: string
  originalPayload: Record<string, any>
  errorMessage: string
  retryCount: number
  recoveredAt?: timestamp
  createdAt: timestamp
}

// 熔断器状态表
CircuitState {
  id: string
  projectId: string
  nodeId: string               // Agent / Service ID
  state: 'open' | 'half_open' | 'closed'
  failureCount: number
  lastFailAt?: timestamp
  resetAt?: timestamp
}
```

### 9.5 效能度量面板

依赖 Task 价值字段 + EventLog 数据，提供：

```
Token 消耗 → 归因到 Task → 归因到 Project（→ OKR）
Agent A 消耗 1000 Token → 其中 600 用于"竞品监控" → 成本 $6

面板指标：
- 任务完成率（done / total）
- Token 消耗趋势（按 Agent / Project）
- 价值产出比（actual_value / token_cost）
- Agent 效能排名
```

### 9.6 OKR 集成

```typescript
ProjectObjective {
  id: string
  projectId: string (FK → Project)
  title: string
  description?: string
  objType: 'objective' | 'key_result'
  parentId?: string           // KR → O 关联
  progress: number            // 0.0 ~ 1.0
  status: 'active' | 'completed' | 'cancelled'
  createdAt: timestamp
}
```

### 9.7 Trust Policy（AI 行为分级授权）

DeskClaw 的 TrustPolicy 和 TeamClaw 的 Consumer System 解决**不同问题**：

- **TrustPolicy** = "AI 能不能做这个操作"（AI 行为治理）
- **Consumer** = "消费者能不能用这个服务"（商业化）

两者共存。TeamClaw v1 已有 `approval_requests` 表支持审批，扩展为：

```typescript
TrustPolicy {
  id: string
  projectId: string
  agentMemberId: string        // 哪个 AI 成员
  actionType: string           // 操作类型
  grantType: 'allow_once' | 'allow_always' | 'deny' | 'require_approval'
  grantedBy: string            // 授权人
  createdAt: timestamp
}
```

---

## 十、Proactive Engine（主动智能引擎）

### 10.1 核心理念

> **TeamClaw 不只是被动的任务执行者，而是主动的 AI 协作者**

**现有模式（被动）**：
```
成员 → 接任务 → 执行 → 交付 → 审核
  ↑
  TeamClaw 等待成员操作
```

**v1.1 模式（主动）**：
```
持续监控上下文 → 主动分析 → 主动行动/推送
  ↑
  TeamClaw 主动协作者
```

### 10.2 主动能力清单

| 主动能力 | 触发条件 | 动作 |
|---------|---------|------|
| **任务逾期预警** | 任务到期前 X 小时无人处理 | 推送给负责人 + 备选人 |
| **交付积压提醒** | 审核队列 > N 个 | 推送给审核者 |
| **上下文断层检测** | 成员开始新任务但缺少相关 Wiki | 主动补充相关文档链接 |
| **SOP 建议** | 检测到类似任务模式 | 建议复用 SOP 模板 |
| **进度风险预警** | 项目进度落后 > 20% | 推送给项目经理 + 分析报告 |
| **知识缺失提醒** | SOP 执行时发现缺少 L2/L3 知识 | 主动提示补充 |
| **Skill 健康巡检** | L4 经验条目超阈值 / 定期巡检 | 提示归档或晋升 |
| **新人上手指引** | 新成员加入项目 | 主动推送项目 Wiki + 快速上手 SOP |

### 10.3 架构设计

```
┌─────────────────────────────────────────────────────┐
│              Proactive Engine                         │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │              Context Monitor                   │  │
│  │  持续监控：Project / Task / Delivery / SOP   │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐  │
│  │              Pattern Analyzer                  │  │
│  │  分析：时序模式 + 异常检测 + 趋势预测        │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐  │
│  │              Decision Engine                   │  │
│  │  决策：现在该做什么？优先级？时机？          │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐  │
│  │              Action Executor                   │  │
│  │  执行：推送通知 / 建议行动 / 自动执行        │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 10.4 数据模型

```typescript
ProactiveRule {
  id: string
  name: string
  trigger: TriggerCondition
  condition: string
  action: ActionType
  priority: 'low' | 'medium' | 'high'
  enabled: boolean
  createdBy: string
  createdAt: timestamp
}

ProactiveEvent {
  id: string
  ruleId: string
  triggeredAt: timestamp
  context: Record<string, any>
  action: string
  result: 'sent' | 'dismissed' | 'failed'
}

ProactiveHistory {
  id: string
  memberId: string
  ruleId: string
  eventId: string
  respondedAt?: timestamp
  feedback?: 'helpful' | 'irrelevant' | 'annoying'
}
```

### 10.5 触发条件类型

```typescript
type TriggerCondition =
  | { type: 'task_overdue'; hoursBefore: number }
  | { type: 'delivery_queue_size'; minSize: number }
  | { type: 'project_progress'; threshold: number }
  | { type: 'sop_knowledge_missing'; layers: string[] }
  | { type: 'member_joined'; projectId: string }
  | { type: 'skill_health_check'; skillId: string }           // 新增
  | { type: 'skill_promotion_ready'; threshold: number }       // 新增
  | { type: 'custom'; expression: string }
```

### 10.6 实现优先级

| 优先级 | 能力 | 理由 |
|--------|------|------|
| P0 | 任务逾期预警 | 痛点强，实现简单 |
| P0 | 交付积压提醒 | 直接提升协作效率 |
| P1 | 上下文断层检测 | 利用现有 Wiki 数据 |
| P1 | Skill 健康巡检 | 自进化引擎配套 |
| P2 | 进度风险预警 | 需要趋势分析 |
| P2 | 自定义 IF-THEN | 高灵活性 |

---

## 十一、AI 执行层深度调研

### 11.1 竞品执行层架构对比

#### Dify Workflow 执行层

**技术栈**：Python + LangChain

**执行模型**：
- **节点类型**：LLM / Tool / Retrieval / Condition / Loop / Code / Template
- **执行引擎**：DAG 图遍历，节点输出 → 后续节点输入
- **Agent 实现**：基于 LangChain Agent（Function Calling / ReAct）

**参考价值**：节点化设计成熟，RAG Pipeline 完善

---

#### Coze Studio 执行层

**技术栈**：Golang + DDD 架构

**执行模型**：
- **DDD 分层**：Domain（核心逻辑）→ Application（编排）→ Infrastructure（实现）
- **Agent 实现**：自有 Agent 框架（非 LangChain）
- **Plugin 系统**：内置 Plugin + 第三方扩展

**参考价值**：DDD 架构 + Plugin 系统设计成熟

---

#### n8n AI 执行层

**技术栈**：TypeScript + LangChain.js

**执行模型**：
- **图执行**：Node → Node → ... → End
- **LangChain 集成**：使用 LCEL 表达式语言编排
- **Tool 调用**：通过 Function Calling 实现

**参考价值**：LangChain.js 集成 + 多数据源集成

---

#### DeerFlow 执行层（最有参考价值）

**技术栈**：Python + LangGraph

**核心架构**：
```
LeadAgent (LangGraph StateGraph)
├── ClarificationMiddleware      # 追问澄清
├── LoopDetectionMiddleware      # 循环检测
├── MemoryMiddleware             # 记忆管理
├── SubagentLimitMiddleware      # 子 Agent 限流
├── TodoMiddleware               # 任务清单
└── SummarizationMiddleware      # 上下文压缩

Tool 执行：
├── Built-in Tools: present_file, ask_clarification, task
├── MCP Tools: 动态加载
└── Subagent Tools: task（子任务分发）
```

**参考价值（最高）**：
- ✅ 中间件体系（循环检测、追问澄清、记忆管理）
- ✅ MCP 工具集成方案
- ✅ Skill 系统（SKILL.md 格式）
- ✅ 沙箱执行架构
- ✅ Artifact 动态 UI 生成

### 11.2 各竞品 AI 执行层能力矩阵

| 能力 | Dify | Coze Studio | n8n | DeerFlow |
|------|------|-------------|-----|----------|
| **Workflow 引擎** | ✅ Python DAG | ✅ Golang | ✅ Node Graph | ❌ 无 |
| **Agent 框架** | LangChain | 自有 | LangChain.js | LangGraph |
| **Tool 系统** | ✅ 内置 + 自定义 | ✅ Plugin | ✅ 自定义 Node | ✅ MCP + 内置 |
| **RAG Pipeline** | ✅ 完整 | ✅ 知识库 | ❌ 需自建 | ❌ 无 |
| **沙箱执行** | ❌ | ❌ | ❌ | ✅ AIO Sandbox |
| **动态 UI** | ❌ | ❌ | ❌ | ✅ Artifact |
| **中间件体系** | ❌ | ❌ | ❌ | ✅ 完善 |
| **Skill 系统** | ❌ | ✅ Plugin | ❌ | ✅ SKILL.md |

### 11.3 TeamClaw 借鉴方案

建议的 AI 执行层架构（OpenClaw 上层）：

```
TeamClaw AI Runtime
│
├── Skill Executor          # SKILL.md 执行（DeerFlow 参考）
│   ├── loader              # Skill 加载
│   ├── parser              # Skill 解析
│   ├── runner              # Skill 执行
│   └── evolution           # 🆕 自进化（经验注入 + 晋升）
│
├── Agent Executor          # Agent 执行
│   ├── middlewares/        # 中间件（DeerFlow 参考）
│   │   ├── loop_detection
│   │   ├── clarification
│   │   ├── memory
│   │   └── subagent_limit
│   └── tools/              # 工具注册
│       ├── builtins/       # 内置工具
│       └── mcp/            # MCP 工具
│
├── Workflow Engine         # 工作流编排
│   ├── node_factory        # 节点工厂（Dify 参考）
│   ├── nodes/              # 节点类型
│   │   ├── sop_node
│   │   ├── condition_node
│   │   ├── loop_node
│   │   └── parallel_node
│   └── executor            # DAG 执行引擎
│
├── Sandbox Executor        # 沙箱执行
│   ├── sandbox (抽象)
│   ├── local/              # 本地沙箱
│   └── docker/             # Docker 隔离
│
└── Artifact Generator     # 动态 UI 生成
    ├── generator           # AI 生成
    └── renderer            # 渲染器
```

---

## 十二、里程碑（v1.1 重构）

> **决策 D1**：Adapter System + Skill Evolution Engine **并行推进**  
> **决策 D2**：Workflow Engine **完全重写**，向后兼容 SOP  
> **决策 D3**：Marketplace **全量开发（除支付）**，支付预留接口+数据表  
> **决策 D4**：使用 **AI Coding 工时**（token 量 + AI 工时），非传统人工估算

### 12.1 分阶段计划（决策后修订版）

| 阶段 | 内容 | 优先级 | AI 工时估算 | 说明 |
|------|------|--------|------------|------|
| **Phase 1A** | Adapter System（多后端适配器） | P0 | ~8 AI工时 / ~200K tokens | 与 1B 并行 |
| **Phase 1B** | Skill Evolution Engine（自进化引擎） | P0 | ~6 AI工时 / ~150K tokens | 与 1A 并行 |
| **Phase 2** | Workflow Engine 重写（兼容 SOP） | P0 | ~12 AI工时 / ~300K tokens | 依赖 Phase 1A |
| **Phase 3** | Marketplace + Consumer System（除支付） | P0 | ~10 AI工时 / ~250K tokens | 依赖 Phase 1A |
| **Phase 4** | Proactive Engine + 可观测性 + 效能面板 | P1 | ~8 AI工时 / ~200K tokens | 依赖 Phase 1B |
| **Phase 5** | 支付对接 + 完整变现 + OKR（可选） | P2 | ~4 AI工时 / ~100K tokens | 商业验证后启动 |

#### AI 工时说明

> **AI 工时 = 1 个 AI 编码 Agent 连续工作 1 小时的产出量**  
> 
> 估算基准（基于当前项目实际数据）：
> - 当前代码库：~52,000 行代码 / 340 文件 / 35 张表 / 53 MCP 工具
> - 1 AI工时 ≈ 产出 500-800 行高质量代码（含测试）
> - 1 AI工时 ≈ 消耗 ~25K tokens（含上下文读取 + 代码生成 + 调试）
> - 假设每天有效 AI 编码时间：6 AI工时
> 
> **对比人工**：1 AI工时 ≈ 3-5 人工小时（含理解代码、编码、调试、测试）

### 12.2 Phase 详情

#### Phase 1A：Adapter System — 多后端适配器（~8 AI工时）

> **与 Phase 1B 并行推进，无硬依赖**

**核心交付物**：
- 四大适配器接口定义（DB / Auth / Storage / Notification）
- SQLite 适配器实现（保持当前能力）
- Supabase (PostgreSQL) 适配器实现
- CloudBase (MySQL) 适配器实现
- 初始化向导（Setup Wizard）前端
- 核心实体重构：User / Team / Member / Consumer / AIApp / Service
- Task 扩展字段（estimatedValue / actualValue / tokenCost / costBreakdown）
- 数据迁移脚本（v1 → v1.1）

**AI 工时分解**：
| 子任务 | AI工时 | 预估 Tokens |
|--------|--------|------------|
| 适配器接口定义 + SQLite 实现 | 1.5 | ~35K |
| Supabase 适配器 | 2.0 | ~50K |
| CloudBase 适配器 | 1.5 | ~35K |
| 核心实体重构 + 数据表 | 1.5 | ~40K |
| Setup Wizard 前端 | 1.0 | ~25K |
| 数据迁移脚本 + 测试 | 0.5 | ~15K |

**前置条件**：无  
**完成标志**：`npm run build` 通过，三种后端适配器均可切换运行

#### Phase 1B：Skill Evolution Engine — 自进化引擎（~6 AI工时）

> **与 Phase 1A 并行推进，无硬依赖**（利用现有 `knowhow-parser.ts` L1-L5 基础）

**核心交付物**：
- `skill_experiences` 表 + `skill_evolution_logs` 表
- `skills` 表 evolution 相关字段扩展
- 3 个新增 MCP 工具：`record_skill_experience` / `get_skill_experiences` / `promote_skill_experience`
- 自动过滤逻辑（跳过一次性错误、纯格式调整）
- 去重归并逻辑（相同 scenario → occurrenceCount++）
- 阈值晋升机制（≥3 次 → 建议晋升为 L1 规则）
- `invoke_skill` 增强：执行前自动加载 Top 10 历史经验
- 健康巡检（L4 条目超阈值提醒）

**AI 工时分解**：
| 子任务 | AI工时 | 预估 Tokens |
|--------|--------|------------|
| DB Schema 扩展 + 迁移 | 1.0 | ~25K |
| 3 个 MCP 工具实现 | 2.0 | ~50K |
| 过滤/去重/晋升逻辑 | 1.5 | ~35K |
| invoke_skill 增强 + 经验注入 | 1.0 | ~25K |
| 测试 + 文档 | 0.5 | ~15K |

**前置条件**：无（基于现有 `knowhow-parser.ts` + `update_knowledge` MCP 工具）  
**完成标志**：Skill 执行时自动加载历史经验，用户修正可记录并触发晋升建议

#### Phase 2：Workflow Engine 重写（~12 AI工时）

> **决策 D2**：完全重写，但必须向后兼容现有 SOP（7 种 StageType）

**核心交付物**：
- 全新 `WorkflowEngine` 类（DAG 执行引擎）
- 8 种 WorkflowNode 类型：`sop` / `condition` / `loop` / `parallel` / `workflow_call` / `ai_auto` / `input` / `render`
- **SOP 兼容层**：现有 SOP 7 种 StageType（input / ai_auto / ai_with_confirm / manual / render / export / review）自动映射为 WorkflowNode
- Trust Policy 基础（AI 行为分级授权）
- Workflow 可视化编辑器前端（节点拖拽画布）
- Workflow 执行状态追踪 + 断点续执行
- `AppWorkflow` 实体 + API 路由

**向后兼容策略**：
```
现有 SOP StageType → WorkflowNode 映射：
  input          → { type: 'input', fields: [...] }
  ai_auto        → { type: 'ai_auto', prompt: '...' }
  ai_with_confirm → { type: 'ai_auto', prompt: '...', requireConfirm: true }
  manual         → { type: 'input', fields: [...], manualOnly: true }
  render         → { type: 'render', templateId: '...' }
  export         → { type: 'render', exportMode: true }
  review         → { type: 'review', reviewers: [...] }
```

**AI 工时分解**：
| 子任务 | AI工时 | 预估 Tokens |
|--------|--------|------------|
| WorkflowEngine 核心 + DAG 执行 | 3.0 | ~75K |
| 8 种 Node 类型实现 | 2.5 | ~60K |
| SOP 兼容层（StageType → Node 映射） | 1.5 | ~35K |
| Trust Policy 基础 | 1.5 | ~35K |
| Workflow 可视化前端 | 2.0 | ~55K |
| 断点续执行 + 状态追踪 | 1.0 | ~25K |
| 测试（覆盖所有 SOP 场景） | 0.5 | ~15K |

**前置条件**：Phase 1A（DB Adapter 就绪）  
**完成标志**：现有所有 SOP 模板在新引擎下可正常执行，新 Workflow 类型可创建运行

#### Phase 3：Marketplace + Consumer System（~10 AI工时）

> **决策 D3**：除支付外全部开发，支付预留接口 + 数据表

**核心交付物**：
- **Consumer System**：Consumer 注册 / 登录 / 个人中心
- **Service Marketplace**：Service 列表 / 搜索 / 详情 / 分类
- **Service 动态评分**：popularityScore / effectivenessScore / averageRating / rankWeight
- **ServiceRating**：评分 + 反馈收集 + Agent 互评
- **ActivationKey**：生成 / 分发 / 激活 / 验证
- **Subscription**：订阅管理 / 激活码兑换 / 状态追踪
- **ServiceUsage**：用量追踪 / quota 限制 / credits 扣减
- **Artifact Renderer**：动态 UI 渲染（DeerFlow 参考）
- **进化机制**：低效降权 / 高效推荐 / 定期重算 rankWeight
- **支付预留**：
  - `ServiceOrder` 表（已建，status 支持 pending/paid/refunded）
  - 支付接口占位（`IPaymentAdapter` 接口定义，无具体实现）
  - Credits 充值接口占位

**AI 工时分解**：
| 子任务 | AI工时 | 预估 Tokens |
|--------|--------|------------|
| Consumer 实体 + Auth 流程 | 1.5 | ~35K |
| Marketplace 前端（列表/搜索/详情） | 2.0 | ~50K |
| 动态评分 + 进化机制 | 1.5 | ~35K |
| ActivationKey + Subscription | 1.5 | ~35K |
| ServiceUsage + Quota + Credits | 1.0 | ~25K |
| Artifact Renderer | 1.5 | ~40K |
| 支付预留接口 + ServiceOrder | 0.5 | ~15K |
| 测试 | 0.5 | ~15K |

**前置条件**：Phase 1A（实体 + Adapter 就绪）  
**完成标志**：Consumer 可注册、浏览 Marketplace、激活并使用 Service；支付接口已定义但无实际支付处理

#### Phase 4：Proactive Engine + 可观测性 + 效能面板（~8 AI工时）

**核心交付物**：
- **Proactive Engine**：
  - ProactiveRule / ProactiveEvent / ProactiveHistory 表
  - 6 种内置触发条件（任务逾期 / 交付积压 / 上下文断层 / Skill 健康 / 进度风险 / 新人上手）
  - Context Monitor + Pattern Analyzer + Decision Engine + Action Executor
- **可观测性** — 借鉴 DeskClaw：
  - EventLog 完整化（事件溯源）
  - DeadLetter 死信队列
  - CircuitState 熔断器
- **效能度量面板**：
  - Token 消耗归因（Token → Task → Project）
  - Agent 效能排名
  - 价值产出比可视化

**AI 工时分解**：
| 子任务 | AI工时 | 预估 Tokens |
|--------|--------|------------|
| Proactive Engine 核心 + 6 种触发 | 2.5 | ~60K |
| EventLog + DeadLetter + CircuitState | 2.0 | ~50K |
| 效能面板前端 | 2.0 | ~50K |
| 测试 + 文档 | 1.5 | ~40K |

**前置条件**：Phase 1B（Skill Evolution 就绪）+ Phase 1A（Task 扩展字段）  
**完成标志**：任务逾期能自动预警，EventLog 可追溯，效能面板可查看 Token 归因

#### Phase 5：支付对接 + 完整变现 + OKR（~4 AI工时）

> **商业验证后启动，Phase 3 的支付预留接口为本阶段提供基础**

**核心交付物**：
- `IPaymentAdapter` 具体实现：微信支付 / Stripe
- ServiceOrder 完整流程（下单 → 支付 → 回调 → 确认）
- Credits 充值 + 消费完整链路
- OKR 集成（可选）：ProjectObjective / KeyResult / Task 关联
- 全面测试 + 性能优化

**AI 工时分解**：
| 子任务 | AI工时 | 预估 Tokens |
|--------|--------|------------|
| 支付适配器实现 | 1.5 | ~35K |
| Credits 完整链路 | 1.0 | ~25K |
| OKR 集成（可选） | 1.0 | ~25K |
| 全面测试 + 文档 | 0.5 | ~15K |

**前置条件**：Phase 3（Marketplace + 支付预留就绪）  
**完成标志**：Consumer 可付费购买 Service，Token 消耗可归因到收入

### 12.3 总预计 AI 工时

| 阶段 | AI 工时 | 预估 Tokens | 日历时间（6h/天） |
|------|---------|------------|-----------------|
| Phase 1A + 1B（并行） | 8 + 6 = 8* | ~200K + 150K | ~1.5 天 |
| Phase 2 | 12 | ~300K | ~2 天 |
| Phase 3 | 10 | ~250K | ~1.7 天 |
| Phase 4 | 8 | ~200K | ~1.3 天 |
| Phase 5 | 4 | ~100K | ~0.7 天 |
| **总计** | **~42 AI工时** | **~1.2M tokens** | **~7 天**（纯编码） |

> *Phase 1A 和 1B 并行执行，日历时间取较长者（1A: 8h）
> 
> **实际工期 = 纯编码 × 2.5 倍（含需求确认、调试、集成测试、代码审查、部署验证）**  
> **实际预估：~17.5 工作日 ≈ 3.5 周**

### 12.4 依赖关系图

```
Phase 1A (Adapter System)  ──┬──▶  Phase 2 (Workflow Engine)
                             │
                             └──▶  Phase 3 (Marketplace)  ──▶  Phase 5 (支付+变现)
                                      
Phase 1B (Skill Evolution)  ──▶  Phase 4 (Proactive + 可观测性)

并行关系：
  Phase 1A ‖ Phase 1B （同时开始）
  Phase 2  ‖ Phase 3  （Phase 1A 完成后同时开始）
```

### 12.5 优先级排序（时间有限时的裁剪方案）

| 优先级 | 模块 | 理由 | 可裁剪？ |
|--------|------|------|---------|
| **P0** | Adapter System | 开源基础，后续所有模块依赖 | ❌ |
| **P0** | Skill 自进化引擎 | 核心差异化能力，"越用越好"是产品核心卖点 | ❌ |
| **P0** | Workflow Engine | 核心产品能力，SOP 升级 | ❌ |
| **P0** | Marketplace（除支付） | 商业模式基础 | ❌ |
| **P1** | Proactive Engine | 主动智能差异化 | 可简化为仅逾期预警 |
| **P1** | 可观测性 | EventLog 基础必需 | DeadLetter/熔断可延后 |
| **P1** | 效能面板 | 量化 AI 产出价值 | 可简化 |
| **P2** | 支付对接 | 依赖商业验证 | ✅ 可延后 |
| **P3** | OKR 集成 | 锦上添花 | ✅ 可裁剪 |

---

_Last updated: 2026-03-25T15:00:00Z（决策后修订版）_
