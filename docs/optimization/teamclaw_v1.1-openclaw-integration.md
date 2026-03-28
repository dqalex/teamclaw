# TeamClaw v1.1 — OpenClaw 生态集成优化

> 版本：v1.1 补充  
> 日期：2026-03-26  
> 依据：[OpenClaw 官方文档](https://docs.openclaw.ai/) 研究  
> 状态：规划中

---

## 关联主线规划

本文档是 `teamclaw_v1.1.md` 的补充，重点关注 **OpenClaw 生态深度集成**。建议与以下 Phase 协同推进：

| 主线 Phase | 协同点 | 本文对应章节 |
|-----------|--------|-------------|
| Phase 1A（Adapter System） | OpenClaw 配置适配器 | §2 |
| Phase 1B（Skill Evolution） | ClawHub 市场集成 | §3 |
| Phase 2（Workflow Engine） | OpenClaw Plugin 工具注册 | §4 |
| Phase 3（Marketplace） | 渠道插件 + Service 扩展 | §5 |
| Phase 4（Proactive Engine） | OpenClaw Hook 生命周期 | §6 |

---

## 一、核心定位对齐

### 1.1 TeamClaw × OpenClaw 关系

```
OpenClaw = AI 操作系统（CLI / Runtime）
TeamClaw = 系统 UI（GUI / 可视化）
           ↑
           └── 不做 AI，只做 AI 的可视化
```

**v1.1 优化方向**：从「集成 OpenClaw」升级为「深度融合 OpenClaw 生态」

| 维度 | v1.0 现状 | v1.1 优化目标 |
|------|----------|--------------|
| **集成深度** | 基础调用 | 插件感知 + 市场联动 |
| **Skill 管理** | 自成体系 | 兼容 OpenClaw + ClawHub |
| **配置管理** | 手动配置 | 热重载 + 智能适配 |
| **渠道扩展** | 依赖 OpenClaw 配置 | 插件化渠道管理 |

---

## 二、OpenClaw 配置适配器（Phase 1A 协同）

### 2.1 现状分析

当前 TeamClaw 对 OpenClaw 配置的处理方式：

```typescript
// 现有方式：直接读取/写入配置文件
const config = await readFile('~/.openclaw/openclaw.json', 'utf-8');
await writeFile(configPath, JSON.stringify(newConfig, null, 2));
```

**问题**：
- ❌ 无热重载感知
- ❌ 无 schema 校验
- ❌ 无配置版本管理
- ❌ 与 OpenClaw CLI 不同步

### 2.2 OpenClaw 配置 API 对接

OpenClaw 提供完整的配置 RPC 接口，TeamClaw 应优先使用 API 而非直接读写文件：

```typescript
// src/core/gateway/adapters/openclaw-config.adapter.ts

export interface OpenClawConfigAdapter {
  // 配置读取
  getConfig(): Promise<OpenClawConfig>;
  getConfigPath(path: string): Promise<unknown>;

  // 配置写入（推荐方式）
  setConfig(path: string, value: unknown): Promise<void>;
  unsetConfig(path: string): Promise<void>;

  // 配置校验
  validateConfig(): Promise<ValidationResult>;
  doctor(): Promise<DiagnosticResult>;

  // 热重载
  onConfigChange(callback: (event: ConfigChangeEvent) => void): void;
  reload(): Promise<void>;
}

// OpenClaw 配置热重载模式
export type ReloadMode = 'hybrid' | 'hot' | 'restart' | 'off';

// 配置校验结果
export interface ValidationResult {
  valid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
}
```

### 2.3 初始化向导集成

在 Phase 1A 的 Setup Wizard 中增加 OpenClaw 配置步骤：

```
┌─────────────────────────────────────────────────────────┐
│              TeamClaw 安装向导（扩展）                     │
│                                                          │
│  Step 1: 选择数据库（DB Adapter）                        │
│  Step 2: 选择认证方式（Auth Adapter）                     │
│  Step 3: 选择存储（Storage Adapter）                      │
│  Step 4: OpenClaw 集成配置 🆕                           │
│  │                                                      │
│  │  ○ 使用现有 OpenClaw 实例                            │
│  │    └── 输入 Gateway 地址 + Token                     │
│  │                                                      │
│  │  ○ 全新安装 OpenClaw                                 │
│  │    ├── 选择 AI 模型提供商                            │
│  │    │   ○ Anthropic (Claude)                          │
│  │    │   ○ OpenAI (GPT-4)                              │
│  │    │   ○ Google (Gemini)                             │
│  │    │   ○ 自定义 Provider                             │
│  │    ├── 配置渠道（可选）                               │
│  │    │   □ WhatsApp                                    │
│  │    │   □ Telegram                                    │
│  │    │   □ Discord                                     │
│  │    └── 配置插件目录                                  │
│  │                                                      │
│  Step 5: 创建管理员账户                                  │
└─────────────────────────────────────────────────────────┘
```

### 2.4 配置映射表

TeamClaw 配置 ↔ OpenClaw 配置映射：

| TeamClaw 概念 | OpenClaw 配置路径 | 说明 |
|--------------|------------------|------|
| AI 模型 | `agents.defaults.model` | 默认模型 |
| AI API Key | `models.providers.*.apiKey` | 模型提供商密钥 |
| 工作区路径 | `agents.defaults.workspace` | Agent 工作目录 |
| MCP 工具 | `tools.enabled` | MCP 工具开关 |
| Skills 目录 | `skills.load.extraDirs` | 额外技能目录 |
| 浏览器沙箱 | `browser.enabled` | 浏览器自动化 |
| 日志级别 | `logging.level` | 日志详细程度 |

---

## 三、ClawHub 市场集成（Phase 1B 协同）

### 3.1 现状分析

**TeamClaw Skills**（自有体系）：
- 基于 SOP 模板生成
- 支持 L1-L5 知识分层
- 有信任管理和审批流程

**OpenClaw Skills**（生态体系）：
- AgentSkills 兼容格式
- ClawHub 市场分发
- 元数据驱动的加载控制

**Gap**：两者不兼容，无法复用 ClawHub 生态

### 3.2 ClawHub API 设计

```typescript
// src/core/clawhub/client.ts

export interface ClawHubClient {
  // 市场浏览
  searchSkills(query: string, filters?: SkillFilters): Promise<ClawHubSkill[]>;
  getFeaturedSkills(): Promise<ClawHubSkill[]>;
  getSkillBySlug(slug: string): Promise<ClawHubSkillDetail>;

  // 安装/更新
  installSkill(slug: string, targetDir: string): Promise<InstallResult>;
  updateSkill(slug: string): Promise<UpdateResult>;
  updateAll(): Promise<UpdateAllResult>;

  // 同步
  syncAll(): Promise<SyncResult>;
  getSyncStatus(): Promise<SyncStatus>;
}

export interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  author: {
    name: string;
    url?: string;
  };
  tags: string[];
  downloads: number;
  rating: number;
  version: string;
  updatedAt: string;
}

export interface ClawHubSkillDetail extends ClawHubSkill {
  readme: string;
  skillyaml: string;       // SKILL.md 源码
  changelog: string;
  dependencies: string[];
  installCommand?: string;
}
```

### 3.3 Skill 格式兼容层

TeamClaw SKILL.md 扩展以兼容 OpenClaw metadata：

```typescript
// src/domains/skill/compatibility.ts

export interface ExtendedSkillFrontmatter {
  // TeamClaw 原有字段
  name: string;
  version: string;
  description: string;
  category: 'content' | 'tool' | 'automation' | 'integration';
  source: 'sop' | 'manual' | 'clawhub' | 'bundled';
  sopTemplateId?: string;
  requiredTools?: string[];
  requiredEnvironments?: string[];
  trustStatus: 'approved' | 'pending' | 'rejected';

  // 🆕 OpenClaw 兼容字段
  metadata?: {
    openclaw?: {
      requires?: {
        bins?: string[];
        anyBins?: string[];
        env?: string[];
        config?: string[];
      };
      primaryEnv?: string;
      os?: ('darwin' | 'linux' | 'win32')[];
      always?: boolean;
      homepage?: string;
      emoji?: string;
      install?: InstallerSpec[];
    };
    // Skill 进化相关
    evolution?: {
      enabled: boolean;
      promotionThreshold: number;
      maxL4Entries: number;
    };
  };
}
```

### 3.4 双市场策略

```
┌─────────────────────────────────────────────────────────────┐
│                    TeamClaw Skill 市场                       │
│                                                             │
│  ┌─────────────────┐         ┌─────────────────┐          │
│  │  TeamClaw SOP   │         │    ClawHub      │          │
│  │    Skills       │         │    Skills       │          │
│  │   (内部资产)     │◄───────►│   (生态资源)     │          │
│  └────────┬────────┘         └────────┬────────┘          │
│           │                           │                    │
│           │    Skill 格式兼容层         │                    │
│           └───────────┬───────────────┘                    │
│                       ▼                                    │
│            ┌─────────────────────┐                        │
│            │  统一 Skill Executor  │                        │
│            │  (OpenClaw 上层)      │                        │
│            └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

**安装策略**：

| 来源 | 安装位置 | 优先级 | 管理方式 |
|------|---------|--------|---------|
| TeamClaw SOP | `<workspace>/skills` | 最高 | TeamClaw UI |
| ClawHub | `~/.openclaw/skills` | 中 | ClawHub 同步 |
| Bundled | 内置 | 最低 | 自动加载 |

### 3.5 与 Skill Evolution Engine 协同

ClawHub 集成与自进化引擎形成闭环：

```
┌─────────────────────────────────────────────────────────┐
│              Skill 全生命周期管理                          │
│                                                          │
│  1. 发现阶段                                             │
│     ├── TeamClaw SOP 模板库                              │
│     └── 🆕 ClawHub 市场浏览 + 安装                        │
│         → 安装到 workspace/skills                        │
│         → 标记 source: 'clawhub'                         │
│                                                          │
│  2. 执行阶段（参考 §8.6 自进化流程）                       │
│     ├── 加载 SKILL.md                                    │
│     ├── 加载知识库 L1-L5                                 │
│     ├── 🆕 加载 skill_experiences                        │
│     └── 执行 → 用户修正 → 经验记录                        │
│                                                          │
│  3. 进化阶段                                             │
│     ├── 经验积累 → 规则晋升                               │
│     ├── 🆕 ClawHub 发布（用户可选择）                     │
│     │   → 将进化后的 Skill 提交到 ClawHub                  │
│     └── 🆕 ClawHub 更新同步                              │
│         → 社区改进 → 自动提示更新                         │
│                                                          │
│  4. 退出阶段                                             │
│     ├── 低效降权（自进化机制）                            │
│     └── 🆕 从 ClawHub 下架（用户选择）                    │
└─────────────────────────────────────────────────────────┘
```

---

## 四、插件系统集成（Phase 2 协同）

### 4.1 OpenClaw 插件类型

| 类型 | 格式 | TeamClaw 集成方式 |
|------|------|-----------------|
| **Native** | `openclaw.plugin.json` | 完整支持 |
| **Bundle** | Codex/Claude/Cursor 布局 | 部分支持（Skills/Commands）|

### 4.2 插件清单解析器

```typescript
// src/core/plugins/registry.ts

export interface OpenClawPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  type: 'native' | 'bundle';
  author?: {
    name: string;
    url?: string;
  };

  // 插件能力
  capabilities: {
    channels?: string[];     // 支持的渠道
    tools?: string[];        // 注册的工具
    skills?: string[];       // 提供的 Skills
    hooks?: string[];        // 生命周期钩子
    providers?: string[];    // 模型提供商
  };

  // 依赖
  dependencies?: {
    bins?: string[];
    env?: string[];
    config?: Record<string, unknown>;
  };

  // 配置
  configSchema?: JSONSchema;
}

export class PluginRegistry {
  private plugins: Map<string, OpenClawPlugin> = new Map();

  async discover(config: OpenClawConfig): Promise<OpenClawPlugin[]>;
  async getPlugin(id: string): Promise<OpenClawPlugin | null>;
  async enablePlugin(id: string): Promise<void>;
  async disablePlugin(id: string): Promise<void>;
  async getPluginStatus(): Promise<PluginStatusMap>;
}
```

### 4.3 官方插件集成清单

| 插件 | 包名 | TeamClaw 集成价值 | 优先级 |
|------|------|-----------------|--------|
| **@openclaw/matrix** | Matrix | MS Teams 渠道 → 企业用户 | 🔴 P0 |
| **@openclaw/nostr** | Nostr | 去中心化社交渠道 | 🟡 P1 |
| **@openclaw/voice-call** | Voice Call | 语音交互能力 | 🟡 P1 |
| **@openclaw/zalo** | Zalo | 越南市场渠道 | 🟢 P2 |

### 4.4 插件管理 UI

```
┌─────────────────────────────────────────────────────────┐
│              TeamClaw — 插件中心 🆕                       │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │  🔍 搜索插件...                    [官方] [社区] [已装] ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ 官方插件 ─────────────────────────────────────────┐ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │ │
│  │  │ Matrix       │  │ Nostr       │  │ Voice Call│ │ │
│  │  │ MS Teams     │  │ 去中心化社交 │  │ 语音通话   │ │ │
│  │  │ ● 已安装     │  │ ⚪ 未安装    │  │ ⚪ 未安装  │ │ │
│  │  │ [管理] [禁用] │  │ [安装]      │  │ [安装]    │ │ │
│  │  └─────────────┘  └─────────────┘  └───────────┘ │ │
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ 社区插件 ─────────────────────────────────────────┐ │
│  │  🔥  trending                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐                  │ │
│  │  │ slack-bridge│  │ line-notify │                  │ │
│  │  │ Slack 集成  │  │ LINE 通知  │                  │ │
│  │  │ ⭐ 4.8 (120) │  │ ⭐ 4.5 (89) │                  │ │
│  │  │ [安装]      │  │ [安装]      │                  │ │
│  │  └─────────────┘  └─────────────┘                  │ │
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ 已安装插件详情 ───────────────────────────────────┐ │
│  │                                                      │ │
│  │  Matrix v1.2.3                                       │ │
│  │  ──────────────                                     │ │
│  │  渠道: Microsoft Teams                              │ │
│  │  状态: 运行中 🟢                                     │ │
│  │  配置:                                              │ │
│  │  {                                                  │ │
│  │    "homeserver": "https://example.com",            │ │
│  │    "userId": "@bot:example.com"                    │ │
│  │  }                                                  │ │
│  │                                                      │ │
│  │  提供的能力:                                         │ │
│  │  ├── Skill: teams-notification                     │ │
│  │  ├── Tool: teams.send_message                      │ │
│  │  └── Hook: message_received                         │ │
│  │                                                      │ │
│  │  [重新加载] [配置] [卸载]                           │ │
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 4.5 Bundle 插件支持

对于 Codex/Claude/Cursor Bundle，TeamClaw 应支持：

| Bundle 功能 | OpenClaw 映射 | TeamClaw 支持 |
|-----------|--------------|-------------|
| Skills | `<bundle>/skills/` | ✅ 完整支持 |
| Commands | `commands/` | ✅ 作为 Skills |
| Hooks | `HOOK.md` + `handler.ts` | ✅ Hook 系统 |
| MCP Tools | `mcp.json` | ✅ MCP 服务器 |
| Settings | `settings.json` | ⚠️ 部分支持 |

---

## 五、Marketplace 渠道扩展（Phase 3 协同）

### 5.1 Service × Plugin 联动

Service Marketplace 中的 AI App 可以利用 OpenClaw 渠道插件：

```typescript
// Service 实体扩展

export interface Service {
  // ... 现有字段 ...

  // 🆕 渠道配置
  channels?: {
    type: 'whatsapp' | 'telegram' | 'discord' | 'matrix' | 'slack';
    config: Record<string, unknown>;
    pluginId?: string;       // 关联的 OpenClaw 插件
  }[];

  // 🆕 渠道使用统计
  channelStats?: {
    [channelType: string]: {
      users: number;
      messages: number;
      activeAt: Date;
    };
  };
}
```

### 5.2 一键发布到多渠道

```
┌─────────────────────────────────────────────────────────┐
│              AI App — 渠道发布 🆕                        │
│                                                          │
│  选择发布渠道：                                          │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ☑ Web (默认)                                    │   │
│  │     URL: https://app.example.com                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ☑ WhatsApp 🆕                                  │   │
│  │     插件: @openclaw/whatsapp                    │   │
│  │     需要: WhatsApp Business API                  │   │
│  │     [配置]                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ☑ Microsoft Teams 🆕                           │   │
│  │     插件: @openclaw/matrix                       │   │
│  │     需要: Matrix Server                          │   │
│  │     [配置]                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ☐ Telegram                                       │   │
│  │     插件: 内置                                    │   │
│  │     Bot Token: [________________]                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [全选] [取消全选]     [批量发布]                         │
└─────────────────────────────────────────────────────────┘
```

---

## 六、Hook 生命周期集成（Phase 4 协同）

### 6.1 OpenClaw Hook 类型

| Hook | 触发时机 | TeamClaw 集成价值 |
|------|---------|------------------|
| `before_tool_call` | 工具调用前 | 权限校验 + 用量记录 |
| `after_tool_call` | 工具调用后 | 结果处理 + 错误追踪 |
| `message_sending` | 消息发送前 | 内容审核 + 敏感词过滤 |
| `message_received` | 消息接收后 | 路由分发 + 意图识别 |
| `agent_started` | Agent 启动 | 上下文初始化 |
| `agent_finished` | Agent 结束 | 结果归档 + 统计分析 |

### 6.2 Hook 配置示例

```typescript
// TeamClaw Hook 注册

export interface TeamClawHooks {
  // 工具调用权限校验
  before_tool_call: {
    block: true,
    handler: async (toolName: string, params: unknown) => {
      // 检查 Consumer 是否有权使用此工具
      const hasPermission = await checkToolPermission(
        getCurrentConsumerId(),
        toolName
      );
      if (!hasPermission) {
        throw new PermissionDeniedError(toolName);
      }
      // 记录用量
      await recordToolUsage(getCurrentConsumerId(), toolName);
    }
  };

  // 消息发送审核
  message_sending: {
    cancel: true,
    handler: async (message: Message) => {
      // 内容安全检查
      const safetyResult = await checkContentSafety(message.content);
      if (!safetyResult.safe) {
        throw new ContentBlockedError(safetyResult.reason);
      }
    }
  };
}
```

### 6.3 与 Proactive Engine 联动

Hook 事件可以作为 Proactive Engine 的触发源：

```
Hook 事件流：
  OpenClaw Hook → TeamClaw Hook Handler → Proactive Engine
                                          │
                                          ├── 任务逾期预警
                                          ├── 交付积压提醒
                                          ├── 上下文断层检测
                                          └── Skill 健康巡检
```

---

## 七、实施优先级建议

### 7.1 OpenClaw 集成细化

| 优先级 | 功能 | 协同 Phase | 工作量 | 说明 |
|--------|------|-----------|--------|------|
| 🔴 P0 | 插件清单解析 | Phase 2 | ~1 AI工时 | 感知可用插件 |
| 🔴 P0 | ClawHub 客户端 | Phase 1B | ~2 AI工时 | 市场集成基础 |
| 🟡 P1 | 渠道插件 UI | Phase 3 | ~2 AI工时 | 插件管理界面 |
| 🟡 P1 | Hook 系统 | Phase 4 | ~1.5 AI工时 | 生命周期集成 |
| 🟡 P1 | 配置热重载 | Phase 1A | ~0.5 AI工时 | 配置 API |
| 🟢 P2 | Bundle 完整支持 | Phase 2 | ~1 AI工时 | Codex/Claude 兼容 |
| 🟢 P2 | 多渠道一键发布 | Phase 3 | ~2 AI工时 | Service × Plugin |

### 7.2 精简版实现（时间有限）

若 v1.1 时间紧张，可采用精简策略：

| 精简项 | 替代方案 | 风险 |
|--------|---------|------|
| ClawHub 完整实现 | 仅支持手动安装 SKILL.md | 失去市场联动 |
| 插件管理 UI | 仅在设置页面显示已装插件 | 无法图形化管理 |
| Hook 系统 | 使用现有 MCP 拦截器 | 功能受限 |

---

## 八、技术债务与风险

### 8.1 依赖风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| OpenClaw API 变更 | 配置适配器失效 | 版本锁定 + 接口抽象 |
| ClawHub 服务不可用 | 市场功能中断 | 本地缓存 + 离线模式 |
| 插件兼容性 | 某些插件无法工作 | 充分测试 + 错误处理 |

### 8.2 安全考量

- **Bundle 安全**：OpenClaw 对 Bundle 有边界检查，TeamClaw 应继承此安全模型
- **插件权限**：插件可注册工具/hook，需验证来源可信
- **密钥管理**：渠道插件通常需要 API Key，使用 Secret Refs

---

## 九、竞品深度研究（2026-03-26 更新）

> 本章节补充 v1.1 主规划中各竞品的深入技术分析，为架构决策提供参考。

### 9.1 Coze Studio（字节跳动）

**GitHub**: https://github.com/coze-dev/coze-studio  
**许可证**: Apache 2.0  
**技术栈**: Golang 后端 + React + TypeScript 前端  
**架构**: 微服务 + DDD（领域驱动设计）

#### 核心架构组件

| 组件 | 技术 | TeamClaw 借鉴价值 |
|------|------|------------------|
| **Eino 框架** | Agent 和 Workflow 运行时引擎、模型抽象、RAG 索引检索 | ⭐⭐⭐⭐⭐ |
| **FlowGram** | 工作流画布编辑器 | ⭐⭐⭐⭐ 可视化编辑器 |
| **Hertz** | Go HTTP 框架（高性能、强扩展性） | ⭐⭐⭐ 微服务基础 |

#### 核心能力矩阵

| 能力 | 说明 | TeamClaw 当前 | 差距 |
|------|------|--------------|------|
| **Model Service** | 模型列表管理（OpenAI + 火山引擎） | 依赖 OpenClaw | 间接支持 |
| **Build Agent** | Agent 构建、发布、管理，支持知识库/插件 | ✅ SOP 驱动 | 同等能力 |
| **Build Apps** | 通过 Workflow 构建业务逻辑 | ⚠️ 基础 | 需增强 |
| **Build Workflow** | 可视化画布节点拖拽 | ❌ 无 | v1.1 Phase 2 |
| **Plugins** | 插件市场 + 第三方认证 | ⚠️ OpenClaw 集成 | 需 UI |
| **Knowledge Bases** | 知识库管理 | ✅ L1-L5 分层 | 已有 |
| **Prompts** | 提示词管理 | ✅ SOP 模板 | 已有 |
| **API & SDK** | OpenAPI + Chat SDK | ⚠️ 基础 API | 需完善 |

#### 关键设计决策

1. **DDD 架构**：后端按领域组织，职责清晰
2. **可视化编排**：FlowGram 工作流画布是核心差异化
3. **多渠道发布**：支持 Bot、知识库、API 多端发布

#### TeamClaw 借鉴点

```
✅ 采纳：
├── Eino 框架理念 → TeamClaw Skill Executor 增强
├── DDD 架构 → Phase 1A Adapter System 采用
├── 插件化思维 → OpenClaw 插件感知
└── 可视化 Workflow → Phase 2 Workflow Engine

⚠️ 参考：
├── 火山引擎集成 → OpenClaw Provider 扩展
└── 多渠道发布 → Service × Plugin 联动
```

---

### 9.2 DeerFlow 2.0（字节跳动）

**GitHub**: https://github.com/bytedance/deer-flow  
**星标**: 15.8k+  
**许可证**: MIT  
**技术栈**: Python + LangGraph + LangChain  
**状态**: v2.0 完全重写，与 v1 无共享代码

#### 核心架构

```
DeerFlow 2.0 架构
│
├── LeadAgent (LangGraph StateGraph)
│   ├── ClarificationMiddleware     # 追问澄清
│   ├── LoopDetectionMiddleware    # 循环检测
│   ├── MemoryMiddleware           # 记忆管理
│   ├── SubagentLimitMiddleware    # 子 Agent 限流
│   ├── TodoMiddleware             # 任务清单
│   └── SummarizationMiddleware    # 上下文压缩
│
├── Skills & Tools
│   ├── Built-in: present_file, ask_clarification, task
│   ├── MCP Tools: 动态加载
│   └── Subagent Tools: task（子任务分发）
│
├── Sandbox Executor
│   ├── Local Execution
│   ├── Docker Execution
│   └── Kubernetes Execution (via provisioner)
│
└── IM Channels
    ├── Telegram (Bot API)
    ├── Slack (Socket Mode)
    └── Feishu/Lark (WebSocket)
```

#### 核心特性深度分析

| 特性 | 实现方式 | TeamClaw 借鉴 |
|------|---------|--------------|
| **Sub-Agents** | LangGraph 并行节点，子 Agent 独立上下文 | ⭐⭐⭐⭐ 复杂任务分解 |
| **Sandbox** | Docker/K8s 隔离容器，完整文件系统 | ⭐⭐⭐⭐ Agent 执行环境 |
| **Context Engineering** | 子 Agent 上下文隔离 + 会话内压缩 | ⭐⭐⭐⭐ Phase 4 Proactive |
| **Long-Term Memory** | 跨会话持久化，用户画像积累 | ⭐⭐⭐ Phase 1B Evolution |
| **Skills System** | SKILL.md 格式，渐进加载 | ⭐⭐⭐⭐ 直接兼容 |
| **MCP Server** | HTTP/SSE MCP，支持 OAuth | ⭐⭐⭐⭐ OpenClaw 已有 |
| **IM Channels** | Telegram/Slack/Feishu 三选一 | ⭐⭐⭐ OpenClaw Plugin |

#### Skills 格式（与 OpenClaw 兼容）

```markdown
# DeerFlow Skill 结构
/mnt/skills/public/
├── research/SKILL.md
├── report-generation/SKILL.md
├── slide-creation/SKILL.md
├── web-page/SKILL.md
└── image-generation/SKILL.md

/mnt/skills/custom/
└── your-custom-skill/SKILL.md
```

DeerFlow 支持标准 AgentSkills 格式（与 OpenClaw ClawHub 兼容）：
- 支持 frontmatter metadata（version, author, compatibility）
- 支持渐进加载（只加载任务需要的 Skill）
- 支持自定义 Skill 安装

#### Claude Code 集成

DeerFlow 提供 Claude Code ↔ DeerFlow 双向集成：

```bash
# 安装
npx skills add https://github.com/bytedance/deer-flow --skill claude-to-deerflow

# 在 Claude Code 中使用
/claude-to-deerflow
```

支持功能：
- 发送消息并获取流式响应
- 选择执行模式：flash / standard / pro / ultra
- 健康检查、模型列表、技能列表
- 线程管理、上传文件

#### TeamClaw 借鉴点

```
✅ 直接采纳：
├── LangGraph 中间件体系 → DeerFlow Middleware Pattern
│   ├── LoopDetection → Phase 2 Workflow Engine
│   ├── Clarification → Phase 2 User Interaction
│   └── Memory → Phase 1B Skill Evolution
├── Skills 渐进加载 → Skill Executor 优化
├── MCP Server 支持 → OpenClaw MCP 已有
└── Docker Sandbox → OpenClaw Sandbox 已有

⚠️ 参考设计：
├── Sub-Agent 并行执行 → 复杂 SOP 分解
├── Context Compression → Phase 4 上下文管理
└── Long-Term Memory → Phase 1B Evolution Memory
```

---

### 9.3 DeskClaw（NoDeskAI）

**GitHub**: https://github.com/NoDeskAI/nodeskclaw  
**许可证**: Apache 2.0 (CE) / 商业 (EE)  
**技术栈**: Python 3.12 + FastAPI + Vue 3 + PostgreSQL  
**定位**: 人与 AI 共同经营组织的平台

#### 双版本架构

```
┌─────────────────────────────────────────────────────────┐
│                    DeskClaw CE / EE                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    Portal (CE + EE)               │  │
│  │              Vue 3 + Tailwind CSS                  │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │                   Backend API Hub                  │  │
│  │          Python 3.12 + FastAPI + SQLAlchemy        │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                              │
│         ┌─────────────────┼─────────────────┐          │
│         ▼                 ▼                 ▼          │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐     │
│   │ Cyber    │      │ Gene     │      │ Compute  │     │
│   │ Workspace│      │ System   │      │ K8s/Docker│     │
│   └──────────┘      └──────────┘      └──────────┘     │
│                           │                              │
│                           ▼                              │
│                    ┌──────────────┐                     │
│                    │ OpenClaw     │                     │
│                    │ Runtime      │                     │
│                    └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

#### 核心功能深度分析

| 功能 | 说明 | TeamClaw 现状 | 借鉴优先级 |
|------|------|--------------|-----------|
| **Cyber Workspace** | 六边形拓扑可视化、AI 与人协作面板 | ⚠️ 基础看板 | ⭐⭐⭐⭐ |
| **Gene System** | AI 能力模块化加载、市场化配置 | ❌ 无 | ⭐⭐⭐⭐⭐ |
| **Elastic Scale** | 一键 K8s/Docker 扩缩容 | ❌ 无 | ⭐⭐ Phase 5 |
| **Multi-Cluster** | 跨集群编排、健康检查 | ❌ 无 | ⭐ Phase 5 |
| **Enterprise Auth** | 飞书 SSO + 组织结构同步 | ⚠️ 基础 Auth | ⭐⭐⭐ |

#### Gene System（最具借鉴价值）

Gene System 是 DeskClaw 的核心创新，类似于"AI 能力插件市场"：

```
Gene = 可组合的 AI 能力包

├── 市场 Genes（Public）
│   ├── 营销能力包
│   ├── 客服能力包
│   └── 销售能力包
│
├── 企业 Genes（Private）
│   ├── 公司专有流程
│   ├── 内部知识库
│   └── 定制规则
│
└── 加载到 AI Partner
    └── AI Partner 获得对应能力
```

**与 TeamClaw Skill Evolution 对比**：

| 维度 | DeskClaw Gene | TeamClaw Skill |
|------|--------------|---------------|
| **组织形式** | 可组合能力包 | 独立 Skill |
| **市场分发** | Public/Private 市场 | ClawHub |
| **加载方式** | 动态加载到 AI | 固定绑定 |
| **进化机制** | 业务表现驱动 | 经验积累驱动 |
| **粒度** | 能力维度 | 任务维度 |

#### 技术架构亮点

1. **FeatureGate 运行时检测**：CE/EE 双版本通过代码是否存在自动切换
2. **Backend Factory + Hook Bus**：插件化后端设计
3. **SSE 实时进度**：AI 执行状态实时推送
4. **OpenClaw Channel Plugin**：Cyber Workspace 通信基础设施

#### Channel Plugin 架构

```typescript
// DeskClaw OpenClaw Channel Plugin 架构
OpenClaw Runtime
    │
    ├── openclaw-channel-nodeskclaw/   // Cyber Workspace 通信
    │   └── SSE 协议
    │
    └── openclaw-channel-dingtalk/      // 钉钉集成
        └── Stream 协议
```

#### TeamClaw 借鉴点

```
✅ 直接采纳：
├── Gene System 理念 → Skill 市场 + 自进化
├── Cyber Workspace 拓扑 → TeamClaw 项目可视化
├── 实时 SSE 推送 → Phase 4 Proactive Engine
└── FeatureGate CE/EE → TeamClaw 部署模式

⚠️ 参考设计：
├── Backend Factory 模式 → Phase 1A Adapter System
├── Hook Bus 事件总线 → Phase 4 事件驱动
└── K8s 弹性扩缩容 → 未来 Phase 5

🔴 不适用：
├── 多集群管理 → TeamClaw 单实例定位不同
└── 企业级 SSO → Phase 3 Consumer Auth 可选
```

---

### 9.4 n8n

**GitHub**: https://github.com/n8n-io/n8n  
**许可证**: Sustainable Use License + n8n Enterprise License  
**技术栈**: Node.js + TypeScript + Vue.js  
**定位**: 工作流自动化平台，AI 原生支持

#### 核心架构

```
n8n 架构
│
├── Editor (Vue.js)
│   └── 可视化节点编辑器
│
├── Backend (Node.js)
│   ├── Workflow Executor
│   ├── Node Library (400+)
│   └── LangChain Integration
│
└── Database
    └── SQLite / PostgreSQL
```

#### 核心能力对比

| 能力 | n8n | TeamClaw | 差距 |
|------|-----|----------|------|
| **可视化编辑** | ✅ 完整 | ❌ 无 | Phase 2 |
| **节点市场** | 400+ | 37 MCP | 数量差距大 |
| **LangChain** | ✅ 原生 | ❌ 无 | OpenClaw 替代 |
| **AI Agent** | ✅ 内置 | ✅ OpenClaw | 同等 |
| **自托管** | ✅ | ✅ | 同等 |
| **消费者分发** | ❌ | ✅ | TeamClaw 优势 |
| **变现机制** | ❌ | ✅ | TeamClaw 优势 |

#### n8n LangChain 集成模式

n8n 通过 LangChain.js 实现 AI 能力：

```typescript
// n8n AI Agent Node
{
  "nodes": [
    {
      "parameters": {
        "model": "gpt-4",
        "memory": "buffer-window",
        "tools": ["search", "calculator"]
      }
    }
  ]
}

// LangChain Expression Language (LCEL)
"{{ $json.message }} + ' - processed by AI'"
```

#### TeamClaw 差异化定位

n8n 是通用工作流自动化，TeamClaw 是 AI Native 的团队协作平台：

| 维度 | n8n | TeamClaw |
|------|-----|----------|
| **核心定位** | 自动化工作流 | AI 团队协作 |
| **用户角色** | 技术/运营 | 团队成员 + AI |
| **交付物** | 自动化流程 | AI 服务/应用 |
| **消费者视角** | ❌ 无 | ✅ Marketplace |
| **变现机制** | ❌ 无 | ✅ Credits/订阅 |

#### 借鉴价值评估

```
⚠️ 低优先级借鉴：
├── 400+ Node Library → OpenClaw MCP 生态可覆盖
├── LangChain 集成 → OpenClaw 已封装
└── 可视化编辑器 → Phase 2 Workflow 独立实现

✅ 参考学习：
├── Workflow 可视化交互模式
├── Node 配置面板设计
└── 错误处理与重试机制
```

---

### 9.5 竞品技术对比总结

#### 技术栈对比

| 产品 | 后端 | 前端 | 数据库 | AI 框架 | 部署 |
|------|------|------|--------|---------|------|
| **Coze Studio** | Golang | React+TS | - | Eino（自研）| Docker |
| **DeerFlow** | Python | - | - | LangGraph/LangChain | Docker/K8s |
| **DeskClaw** | Python 3.12 | Vue 3 | PostgreSQL | OpenClaw | Docker/K8s |
| **n8n** | Node.js | Vue.js | SQLite/PG | LangChain.js | Docker |
| **TeamClaw** | Node.js (Next.js) | React+TS | SQLite | OpenClaw | Docker |

#### 关键架构决策参考

| 决策点 | Coze Studio | DeerFlow | DeskClaw | n8n | TeamClaw v1.1 |
|--------|-------------|----------|----------|-----|---------------|
| **Agent 框架** | Eino 自研 | LangGraph | OpenClaw | LangChain | OpenClaw |
| **工作流引擎** | FlowGram | LangGraph | - | 自研图引擎 | 需新建 |
| **可扩展性** | 微服务+DDD | 模块化 | Plugin+Hook | Node Library | Adapter System |
| **沙箱执行** | - | Docker/K8s | K8s | - | OpenClaw Sandbox |
| **多渠道** | 平台集成 | IM Channels | Channel Plugin | Webhook | OpenClaw Plugin |

#### TeamClaw v1.1 架构决策建议

```
核心原则：
├── AI Runtime → OpenClaw（不变）
├── Agent 能力 → OpenClaw 插件生态
├── 工作流 → 新建可视化引擎（Phase 2）
├── 可扩展 → Adapter System（Phase 1A）
└── 差异化 → Consumer System + Marketplace
```

**参考架构模式**：

1. **DeerFlow 中间件体系** → Workflow Engine 中间件
2. **DeskClaw Gene System** → Skill 自进化 + 市场
3. **Coze Studio DDD** → Adapter System 接口设计
4. **n8n 可视化** → Workflow Editor UI

---

## 十、参考文档

### 官方资源

| 项目 | 链接 |
|------|------|
| OpenClaw | https://docs.openclaw.ai/ |
| ClawHub | https://clawhub.com |
| Coze Studio | https://github.com/coze-dev/coze-studio |
| DeerFlow | https://github.com/bytedance/deer-flow |
| DeskClaw | https://github.com/NoDeskAI/nodeskclaw |
| n8n | https://github.com/n8n-io/n8n |

### 相关文档

| 文档 | 位置 |
|------|------|
| TeamClaw v1.1 主规划 | `docs/optimization/teamclaw_v1.1.md` |
| DeskClaw vs TeamClaw | `docs/optimization/deskclaw-vs-teamclaw-analysis.md` |
| DeerFlow 参考笔记 | `docs/openclaw/CLAUDE.md` |

---

_本文档配合 `teamclaw_v1.1.md` 主规划文件使用_  
_Last updated: 2026-03-26_
