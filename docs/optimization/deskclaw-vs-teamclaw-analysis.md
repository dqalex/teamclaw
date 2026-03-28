# DeskClaw vs TeamClaw v1.1 完整对比分析

> 调研日期：2026-03-24
> 信息来源：DeskClaw GitHub 源码深度分析
> 目的：识别可借鉴的模块和优化方向

---

## 一、项目概述

### DeskClaw

**定位**：人与 AI 共同经营组织的平台

**GitHub**：https://github.com/NoDeskAI/nodeskclaw

**核心卖点**：
- 赛博办公室（六边形拓扑的工作空间）
- 基因系统（动态评分的 Skill 市场）
- 多 Agent 协作（电商营销等场景）
- 企业级能力（OKR、效能度量、审计）

### TeamClaw v1.1

**定位**：AI 应用操作系统 + GUI 层

**核心卖点**：
- OpenClaw AI Runtime + GUI
- Consumer App 变现（Marketplace）
- Proactive Engine（主动智能）
- 多后端支持（Supabase / CloudBase / SQLite）

---

## 二、模块映射表

| DeskClaw 模块 | TeamClaw v1.1 模块 | 对应关系 |
|--------------|-------------------|---------|
| 赛博办公室 (Workspace) | Project | 功能对等，但定位不同 |
| AI 员工 (Instance) | Member (AI) | 功能对等，TeamClaw 复用 OpenClaw |
| 基因系统 (Gene) | Service Marketplace | 功能对等，TeamClaw 加入变现机制 |
| 中央黑板 (Blackboard) | Project + Task + Delivery | DeskClaw 更强（有价值评估）|
| 六边形拓扑 (Corridor) | Project 树形结构 | **架构差异大** |
| 可观测性 (Observability) | Proactive Engine | DeskClaw 更完整 |
| 信任策略 (Trust Policy) | Consumer System | **完全不同** |
| 效能度量 (Performance) | Proactive Engine | DeskClaw 更完整 |
| 渠道集成 (Channels) | OpenClaw Channel | TeamClaw 通过 OpenClaw 复用 |
| 部署管理 (Cluster) | Vercel / CloudBase | **完全不同** |
| LLM 代理 (LLM Proxy) | OpenClaw AI Runtime | TeamClaw 复用 OpenClaw |
| 安全层 (Security) | OpenClaw Security | TeamClaw 复用 OpenClaw |

---

## 三、逐模块详细对比

### 模块 1：Workspace（赛博办公室）vs Project（项目）

#### 数据模型

**DeskClaw**：
```python
class Workspace(BaseModel):
    __tablename__ = "workspaces"
    
    org_id: Mapped[str]          # 归属组织
    name: Mapped[str]
    description: Mapped[str]
    color: Mapped[str]           # 颜色标识
    icon: Mapped[str]             # 图标
    created_by: Mapped[str]       # 创建者
    decoration_config: Mapped[dict | None]  # 装饰配置
    
    # 关系
    blackboard = relationship("Blackboard", back_populates="workspace")
    members = relationship("WorkspaceMember", back_populates="workspace")
```

**TeamClaw v1.1**：
```typescript
Project {
  id: string
  teamId: string (FK → Team)
  name: string
  description?: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 关键差异

| 维度 | DeskClaw | TeamClaw v1.1 | 差异分析 |
|------|----------|----------------|---------|
| **定位** | 人与 AI 共同经营的数字空间 | 团队协作的容器 | DeskClaw 强调"共同经营"，TeamClaw 强调"协作" |
| **边界** | Workspace 可以跨组织 | Project 归属 Team | DeskClaw 更灵活 |
| **成员类型** | Human + Agent 都在 Workspace | Member（Human + AI）| 对等 |
| **可视化** | 有（中央黑板）| 无（纯列表）| **DeskClaw 优** |
| **OKR 集成** | 有（WorkspaceObjective）| 无 | **DeskClaw 优** |
| **交付物** | 无专门概念 | Delivery | **TeamClaw 优** |

#### 优化建议

1. **可视化 Workspace** — 参考 DeskClaw 的中央黑板，做一个经营看板
2. **OKR 集成** — 在 Project 层加入 Objective/KeyResult 支持
3. **跨 Project 协作** — 学习 DeskClaw 的 Workspace 跨组织能力

---

### 模块 2：Instance（AI 员工）vs Member（AI 成员）

#### 数据模型

**DeskClaw**：
```python
class Instance(BaseModel):
    __tablename__ = "instances"
    
    name: Mapped[str]
    slug: Mapped[str]                    # URL 标识
    cluster_id: Mapped[str]              # 所属集群
    namespace: Mapped[str]              # K8s 命名空间
    runtime_id: Mapped[str]             # openclaw / zeroclaw / nanobot
    image_version: Mapped[str]
    replicas: Mapped[int]
    
    # 资源配置
    cpu_request: Mapped[str] = "500m"
    cpu_limit: Mapped[str] = "2000m"
    mem_request: Mapped[str] = "2Gi"
    mem_limit: Mapped[str] = "2Gi"
    
    # 网络
    service_type: Mapped[str]          # ClusterIP / NodePort / LoadBalancer
    ingress_domain: Mapped[str | None]
    
    # Token 凭证
    proxy_token: Mapped[str | None]   # OpenClaw Gateway Token
    wp_api_key: Mapped[str | None]     # LLM Proxy API Key
    
    # 配置
    env_vars: Mapped[str | None]       # JSON string
    
    # 存储
    storage_class: Mapped[str] = "nas-subpath"
    storage_size: Mapped[str] = "80Gi"
    
    # 状态
    status: Mapped[str]  # creating/pending/deploying/running/learning/restarting/updating/failed/deleting
```

**TeamClaw v1.1**：
```typescript
Member {
  id: string
  userId: string (FK → User)
  teamId: string (FK → Team)
  name: string
  isAI: boolean
  type: 'human' | 'ai'
  
  // OpenClaw 配置
  openclawName: string
  openclawDeployMode: 'cloud' | 'local' | 'knot'
  openclawEndpoint: string
  openclawApiToken: string
  openclawModel: string
}
```

#### 关键差异

| 维度 | DeskClaw | TeamClaw v1.1 | 差异分析 |
|------|----------|----------------|---------|
| **AI 引擎** | OpenClaw / ZeroClaw / Nanobot | OpenClaw | TeamClaw 专注 OpenClaw，更聚焦 |
| **部署方式** | K8s Pod（独立实例）| OpenClaw Gateway（共享）| DeskClaw 更重，但隔离性更好 |
| **记忆存储** | Memory 与模型解耦 | OpenClaw Session | **DeskClaw 优**（切换模型不丢记忆）|
| **资源配置** | CPU/内存/存储配额 | OpenClaw 配置 | DeskClaw 更精细 |
| **渠道接入** | 飞书/钉钉/企微/Slack | OpenClaw Channel | TeamClaw 通过 OpenClaw 复用 |
| **Token 凭证** | proxy_token + wp_api_key | OpenClaw API Token | 对等 |

#### 优化建议

1. **记忆与模型解耦** — 目前 OpenClaw 的 Session 绑定模型，可以学习 DeskClaw 分离
2. **资源配置可视化** — 在 Member 配置页面加入资源配额展示

---

### 模块 3：Gene（基因系统）vs Service Marketplace

#### 数据模型

**DeskClaw**：
```python
class Gene(BaseModel):
    __tablename__ = "genes"
    
    id: Mapped[str]
    org_id: Mapped[str]
    name: Mapped[str]
    slug: Mapped[str]
    short_description: Mapped[str | None]   # 展示用
    description: Mapped[str | None]         # 详细说明
    source: Mapped[str]                      # public / private
    visibility: Mapped[str]                 # public / org / private
    category: Mapped[str | None]
    tags: Mapped[list | None]
    
    # 评分
    popularity_score: Mapped[float] = 0     # 热度分
    effectiveness_score: Mapped[float] = 0  # 效能分
    
    # 统计
    install_count: Mapped[int] = 0
    rating_count: Mapped[int] = 0
    
    status: Mapped[str]  # draft / published / archived


class Genome(BaseModel):
    """基因组合包"""
    __tablename__ = "genomes"
    
    id: Mapped[str]
    org_id: Mapped[str]
    gene_ids: Mapped[list]  # 多个 gene_id
    name: Mapped[str]
    description: Mapped[str | None]


class GeneRating(BaseModel):
    """评分记录"""
    __tablename__ = "gene_ratings"
    
    gene_id: Mapped[str]
    user_id: Mapped[str | None]    # 人类评分
    instance_id: Mapped[str | None] # Agent 互评
    rating: Mapped[int]             # 1（点踩）/ 2（点赞）
    review_status: Mapped[str]       # pending / approved / rejected


class GeneEffectLog(BaseModel):
    """效能日志"""
    __tablename__ = "gene_effect_logs"
    
    gene_id: Mapped[str]
    instance_id: Mapped[str]
    metric_type: Mapped[str]        # EFFECT / TOKEN / VALUE
    effect_score: Mapped[float]      # 效能评分
```

**TeamClaw v1.1**：
```typescript
Service {
  id: string
  appId: string (FK → AIApp)
  name: string
  description: string
  type: 'skill' | 'workflow' | 'app'
  price: number              // 积分价格
  quota: {
    daily?: number
    monthly?: number
    total?: number
  }
  status: 'draft' | 'published' | 'archived'
}

ActivationKey {
  id: string
  keyHash: string           // SHA-256
  serviceId: string
  consumerId?: string
  usedAt?: timestamp
}

Subscription {
  id: string
  consumerId: string
  serviceId: string
  activationKeyId: string
  status: 'active' | 'expired' | 'cancelled'
  startedAt: timestamp
}

ServiceUsage {
  id: string
  subscriptionId: string
  consumerId: string
  serviceId: string
  usageType: 'credit' | 'count' | 'token'
  amount: number
  createdAt: timestamp
}
```

#### 关键差异

| 维度 | DeskClaw | TeamClaw v1.1 | 差异分析 |
|------|----------|----------------|---------|
| **核心机制** | 基因 + 评分 + 进化 | Service + Activation Key + 计费 | DeskClaw 偏向进化，TeamClaw 偏向变现 |
| **评分机制** | 三维评分（使用/点赞/互评）| 无动态评分 | **DeskClaw 优** |
| **安装方式** | 安装到 Instance | 发布到 Marketplace + 激活码 | 机制不同但互补 |
| **基因组合** | Genome（打包多个基因）| Service（打包 Workflow）| 对等概念 |
| **进化机制** | 低效基因自动淘汰 | 无此机制 | **DeskClaw 优** |
| **变现机制** | 无 | Activation Key + Credits | **TeamClaw 优** |

#### 优化建议

1. **引入动态评分** — Service 使用后可以收集用户反馈（helpful/irrelevant）
2. **进化机制** — 高评分 Service 优先推荐，低评分自动降权
3. **Genome 打包** — 多个 Skill 打包成一个 Service

---

### 模块 4：Blackboard（中央黑板）vs Project + Task + Delivery

#### 数据模型

**DeskClaw**：
```python
class WorkspaceTask(BaseModel):
    """Workspace 任务"""
    __tablename__ = "workspace_tasks"
    
    workspace_id: Mapped[str]
    title: Mapped[str]
    description: Mapped[str | None]
    status: Mapped[str]  # pending / in_progress / done / blocked / archived
    priority: Mapped[str]  # low / medium / high / urgent
    
    assignee_instance_id: Mapped[str | None]   # 负责的 AI 员工
    created_by_instance_id: Mapped[str | None]  # 创建者 AI
    
    estimated_value: Mapped[float | None]  # 预估价值（元）
    actual_value: Mapped[float | None]    # 实际价值（元）
    token_cost: Mapped[int | None]        # Token 消耗
    
    blocker_reason: Mapped[str | None]    # 阻塞原因
    completed_at: Mapped[datetime | None]
    archived_at: Mapped[datetime | None]


class WorkspaceObjective(BaseModel):
    """OKR 目标"""
    __tablename__ = "workspace_objectives"
    
    workspace_id: Mapped[str]
    title: Mapped[str]
    description: Mapped[str | None]
    progress: Mapped[float]              # 0.0 ~ 1.0
    obj_type: Mapped[str]                # objective / key_result
    parent_id: Mapped[str | None]       # KR → O 关联


class BlackboardPost(BaseModel):
    """黑板帖子"""
    author_type: Mapped[str]  # human / agent
    author_id: Mapped[str]
    workspace_id: Mapped[str]
    title: Mapped[str]
    content: Mapped[str]
    # ...


class BlackboardReply(BaseModel):
    """黑板回复"""
    post_id: Mapped[str]
    author_type: Mapped[str]
    author_id: Mapped[str]
    content: Mapped[str]
    # ...


class BlackboardFile(BaseModel):
    """黑板文件"""
    workspace_id: Mapped[str]
    uploader_type: Mapped[str]
    uploader_id: Mapped[str]
    filename: Mapped[str]
    file_url: Mapped[str]
    # ...
```

**TeamClaw v1.1**：
```typescript
Task {
  id: string
  projectId: string (FK → Project)
  assigneeId?: string (FK → Member)
  title: string
  status: 'todo' | 'in_progress' | 'done'
  // 无 estimated_value / actual_value / token_cost
}

Delivery {
  id: string
  projectId: string (FK → Project)
  memberId: string (FK → Member)
  type: 'document' | 'artifact' | 'app'
  status: 'pending' | 'approved' | 'rejected'
}
```

#### 关键差异

| 维度 | DeskClaw | TeamClaw v1.1 | 差异分析 |
|------|----------|----------------|---------|
| **任务价值** | estimated_value / actual_value | 无 | **DeskClaw 优** |
| **Token 消耗追踪** | token_cost | 无 | **DeskClaw 优** |
| **OKR 集成** | WorkspaceObjective | 无 | **DeskClaw 优** |
| **讨论区** | 黑板帖子/回复 | Comment | DeskClaw 更完整 |
| **文件共享** | 有 | 有 | 对等 |
| **交付审核** | 无专门概念 | Delivery | **TeamClaw 优** |
| **状态流** | pending→in_progress→done/blocked→archived | todo→in_progress→done | 对等 |

#### 优化建议

1. **Task 增加价值字段** — estimated_value / actual_value / token_cost
2. **Token 消耗归因** — 每次 AI 调用记录消耗，归因到 Task
3. **OKR 集成** — Task 关联 Objective/KR

---

### 模块 5：Corridor（拓扑）vs Project 树形结构

#### 数据模型

**DeskClaw**：
```python
class CorridorHex(BaseModel):
    """六边形格子"""
    __tablename__ = "corridor_hexes"
    
    workspace_id: Mapped[str]
    corridor_id: Mapped[str]      # 所属走廊
    hex_q: Mapped[int]            # 六边形坐标
    hex_r: Mapped[int]
    hex_type: Mapped[str]         # human / agent / corridor


class HexConnection(BaseModel):
    """六边形连接"""
    __tablename__ = "hex_connections"
    
    workspace_id: Mapped[str]
    corridor_id: Mapped[str]
    source_hex: Mapped[tuple]     # (q, r)
    target_hex: Mapped[tuple]


class HumanHex(BaseModel):
    """人类格子"""
    __tablename__ = "human_hexes"
    
    workspace_id: Mapped[str]
    user_id: Mapped[str]
    hex_q: Mapped[int]
    hex_r: Mapped[int]
    role: Mapped[str]  # owner / admin / member
```

**TeamClaw v1.1**：Project 树形结构，无拓扑概念

#### 关键差异

| 维度 | DeskClaw | TeamClaw v1.1 | 差异分析 |
|------|----------|----------------|---------|
| **结构** | 六边形网格（可可视化）| 树形（Project → Task）| 完全不同 |
| **可视图** | 有（六边形网格）| 无 | **DeskClaw 优** |
| **连接关系** | Corridor（走廊）连接六边形 | Task 依赖关系 | DeskClaw 更直观 |
| **人类定位** | HumanHex | Member | 对等 |

#### 分析

- 六边形拓扑是 DeskClaw 的**核心创新**，可视化强
- TeamClaw 的 Project 树形结构更通用
- **建议**：不一定要学六边形，但可以做一个**项目关系可视化图**

---

### 模块 6：Observability（可观测性）vs Proactive Engine

#### 数据模型

**DeskClaw**：
```python
class EventLog(BaseModel):
    """事件日志（完整溯源）"""
    __tablename__ = "event_logs"
    
    trace_id: Mapped[str]           # 消息追踪 ID
    event_type: Mapped[str]           # 事件类型
    workspace_id: Mapped[str]
    message_id: Mapped[str | None]
    source_node_id: Mapped[str | None]
    target_node_id: Mapped[str | None]
    data: Mapped[dict | None]         # JSON
    created_at: Mapped[datetime]


class MessageQueueItem(BaseModel):
    """消息队列"""
    __tablename__ = "message_queue_items"
    
    workspace_id: Mapped[str]
    status: Mapped[str]  # pending / retrying / done
    retry_count: Mapped[int]


class DeadLetter(BaseModel):
    """死信队列"""
    __tablename__ = "dead_letters"
    
    workspace_id: Mapped[str]
    original_payload: Mapped[dict]
    error_message: Mapped[str | None]
    recovered_at: Mapped[datetime | None]


class CircuitState(BaseModel):
    """熔断器状态"""
    __tablename__ = "circuit_states"
    
    workspace_id: Mapped[str]
    node_id: Mapped[str]
    state: Mapped[str]  # open / half_open / closed
    failure_count: Mapped[int]
```

**TeamClaw v1.1**：
```typescript
ProactiveRule {
  id: string
  name: string
  trigger: TriggerCondition
  condition: string
  action: ActionType
  priority: 'low' | 'medium' | 'high'
  enabled: boolean
}

ProactiveEvent {
  id: string
  ruleId: string
  triggeredAt: timestamp
  context: Record<string, any>
  action: string
  result: 'sent' | 'dismissed' | 'failed'
}
```

#### 关键差异

| 维度 | DeskClaw | TeamClaw v1.1 | 差异分析 |
|------|----------|----------------|---------|
| **消息追踪** | EventLog + trace_id | Proactive Engine（推送）| DeskClaw 更完整 |
| **队列监控** | MessageQueueItem | 无 | **DeskClaw 优** |
| **死信队列** | DeadLetter | 无 | **DeskClaw 优** |
| **熔断器** | CircuitState | 无 | **DeskClaw 优** |
| **事件溯源** | EventLog（完整）| 无 | **DeskClaw 优** |
| **实时推送** | SSE | 计划中 | DeskClaw 更完整 |
| **主动预警** | 无 | Proactive Engine | **TeamClaw 优** |

#### 优化建议

1. **引入事件溯源** — 记录所有关键操作到 EventLog
2. **死信队列** — AI 执行失败的消息进入 DeadLetter，供后续处理
3. **熔断器** — AI 调用失败率超过阈值时自动熔断

---

### 模块 7：Trust Policy（信任策略）vs Consumer System

#### 数据模型

**DeskClaw**：
```python
class TrustPolicy(BaseModel):
    """AI 行为分级授权"""
    __tablename__ = "trust_policies"
    
    workspace_id: Mapped[str]
    agent_instance_id: Mapped[str]
    action_type: Mapped[str]       # 操作类型
    grant_type: Mapped[str]        # allow_once / allow_always / deny
    granted_by: Mapped[str]        # 授权人


class DecisionRecord(BaseModel):
    """决策记录"""
    __tablename__ = "decision_records"
    
    workspace_id: Mapped[str]
    agent_instance_id: Mapped[str]
    action_type: Mapped[str]
    decision: Mapped[str]          # 审批决策
    proposal: Mapped[dict]         # Agent 提交的提案
```

**TeamClaw v1.1**：
```typescript
Consumer {
  id: string
  userId: string
  plan: 'free' | 'pro' | 'enterprise'
  credits: number
  expiresAt?: timestamp
}

Subscription {
  id: string
  consumerId: string
  serviceId: string
  activationKeyId: string
  status: 'active' | 'expired' | 'cancelled'
}

ServiceUsage {
  id: string
  subscriptionId: string
  consumerId: string
  serviceId: string
  usageType: 'credit' | 'count' | 'token'
  amount: number
}
```

#### 分析

- DeskClaw 的 TrustPolicy 解决"AI 能不能做这个操作"
- TeamClaw 的 Consumer System 解决"消费者能不能用这个服务"
- **两者解决不同问题，可以共存**

---

### 模块 8：Performance（效能度量）vs Proactive Engine

#### DeskClaw 效能指标

| 指标 | 说明 |
|------|------|
| **任务完成率** | done / total |
| **预估价值** | estimated_value（元）|
| **实际价值** | actual_value（元）|
| **Token 消耗** | token_cost |
| **团队/个人视图** | 按 Instance 聚合 |

#### 归因分析

```
Token 消耗 → 归因到具体任务（OKR）
  ↓
Agent A 消耗 1000 Token
  ↓
其中 600 Token 用于"竞品监控"任务
  ↓
600 Token × $0.01 = $6 成本
```

#### 关键差异

| 维度 | DeskClaw | TeamClaw v1.1 | 差异分析 |
|------|----------|----------------|---------|
| **任务完成率** | 有 | Proactive Engine 覆盖部分 | 对等 |
| **Token 消耗** | token_cost | 有 | 对等 |
| **价值归因** | estimated_value / actual_value | 无 | **DeskClaw 优** |
| **Agent 效能** | 团队/个人视图 | 无 | **DeskClaw 优** |
| **实时面板** | 有 | 计划中 | **DeskClaw 优** |
| **归因分析** | Token → Task → OKR | 无 | **DeskClaw 优** |

#### 优化建议

1. **价值归因** — Task 增加 value 字段
2. **实时效能面板** — 在 Workspace 页面展示完成率/消耗/产出
3. **OKR 联动** — Token 消耗归因到具体 KR

---

## 四、技术栈对比

| 组件 | DeskClaw | TeamClaw v1.1 |
|------|----------|----------------|
| **后端** | Python 3.12 + FastAPI + SQLAlchemy (async) + PostgreSQL | Next.js + TypeScript + Drizzle ORM + SQLite/PostgreSQL |
| **前端** | Vue 3 + TypeScript + Tailwind CSS | Next.js + React + TypeScript |
| **部署** | K8s（火山云 VKE）+ Docker | Vercel / CloudBase |
| **AI Runtime** | OpenClaw / ZeroClaw / Nanobot | OpenClaw |
| **数据库** | PostgreSQL（火山云 RDS）| SQLite（本地）/ PostgreSQL（Supabase/CloudBase）|
| **包管理** | uv | pnpm |

---

## 五、架构对比

### DeskClaw 架构

```
Human / Agent → Portal (Vue 3) → API (FastAPI) → PostgreSQL
                                          ↓
                              ┌─────────────┴─────────────┐
                              ↓                           ↓
                        Workspace                    Cluster (K8s)
                              ↓                           ↓
                        Blackboard                  Instance (Pod)
                        Topology                       ↓
                        Gene System                 Runtime
                                                      ↓
                                                   LLM Proxy
```

### TeamClaw v1.1 架构

```
Consumer → TeamClaw (Next.js) → OpenClaw AI Runtime
                    ↓                    ↓
              SQLite/PostgreSQL      Skill / MCP
                    ↓                    ↓
              Supabase            OpenClaw Channel
              CloudBase
              SQLite
```

---

## 六、优先级总结

### 最高优先级（⭐⭐⭐⭐⭐）

| 模块 | 建议 | 理由 |
|------|------|------|
| **Task 价值追踪** | 借鉴 DeskClaw | estimated_value / actual_value / token_cost |
| **动态评分机制** | 借鉴 Gene System | Service 使用后收集反馈 |
| **效能度量面板** | 借鉴 Performance | OKR 归因 + 实时面板 |
| **可观测性** | 借鉴 Observability | EventLog + 死信队列 + 熔断器 |

### 高优先级（⭐⭐⭐⭐）

| 模块 | 建议 | 理由 |
|------|------|------|
| **Workspace 可视化** | 借鉴 Blackboard | 经营看板 |
| **OKR 集成** | 借鉴 WorkspaceObjective | Project 层加入 OKR |
| **审计日志** | 借鉴 operation_audit | 完整操作记录 |

### 中优先级（⭐⭐⭐）

| 模块 | 建议 | 理由 |
|------|------|------|
| **六边形拓扑** | 可视化参考 | 不一定要六边形，但可以有关系图 |
| **进化机制** | 借鉴 Gene System | 低效 Service 自动降权 |

### 通过 OpenClaw 已解决（无需自研）

| 模块 | 说明 |
|------|------|
| AI Runtime | 复用 OpenClaw |
| Channel | 复用 OpenClaw |
| Security | 复用 OpenClaw |
| Skill 管理 | 复用 OpenClaw |

---

## 七、关键文件索引

### DeskClaw 源码位置

| 模块 | 文件路径 |
|------|----------|
| Gene 数据模型 | `/tmp/nodeskclaw/nodeskclaw-backend/app/models/gene.py` |
| Gene Service | `/tmp/nodeskclaw/nodeskclaw-backend/app/services/gene_service.py` |
| Gene API | `/tmp/nodeskclaw/nodeskclaw-backend/app/api/genes.py` |
| Workspace 数据模型 | `/tmp/nodeskclaw/nodeskclaw-backend/app/models/workspace.py` |
| Instance 数据模型 | `/tmp/nodeskclaw/nodeskclaw-backend/app/models/instance.py` |
| Instance API | `/tmp/nodeskclaw/nodeskclaw-backend/app/api/instances.py` |
| Task 数据模型 | `/tmp/nodeskclaw/nodeskclaw-backend/app/models/workspace_task.py` |
| Blackboard API | `/tmp/nodeskclaw/nodeskclaw-backend/app/api/blackboard.py` |
| Corridor API | `/tmp/nodeskclaw/nodeskclaw-backend/app/api/corridors.py` |
| Observability API | `/tmp/nodeskclaw/nodeskclaw-backend/app/api/observability.py` |
| Trust Policy API | `/tmp/nodeskclaw/nodeskclaw-backend/app/api/trust.py` |
| Performance API | `/tmp/nodeskclaw/nodeskclaw-backend/app/api/observability.py` |
| Runtime Registry | `/tmp/nodeskclaw/nodeskclaw-backend/app/services/runtime/registries/runtime_registry.py` |
| 后端架构文档 | `/tmp/nodeskclaw/docs/后端架构设计.md` |

---

_Last updated: 2026-03-24T12:41:00Z_
