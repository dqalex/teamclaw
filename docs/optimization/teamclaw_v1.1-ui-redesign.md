# TeamClaw v1.1 — UI 重构规划方案

> 版本：v1.1 UI 重构  
> 日期：2026-03-26  
> 状态：规划中  
> 依据：现有项目分析 + v1.1 业务规划 + 竞品研究

---

## 关联文档

| 文档 | 位置 | 关系 |
|------|------|------|
| v1.1 主规划 | `teamclaw_v1.1.md` | 主规划 |
| OpenClaw 集成 | `teamclaw_v1.1-openclaw-integration.md` | 技术增强 |
| 竞品分析 | `deskclaw-vs-teamclaw-analysis.md` | 参考 |

---

## 一、现状分析

### 1.1 现有 UI 结构

```
app/
├── dashboard/          # 仪表盘（Gateway 状态 + 统计数据）
├── tasks/              # 任务管理（看板/列表）
├── wiki/               # 知识库（文档编辑）
├── projects/           # 项目管理
├── members/            # 团队成员
├── skills/             # 技能管理
├── sop/                # SOP 模板
├── skillhub/           # 技能市场
├── deliveries/         # 交付物
├── schedule/           # 定时任务
├── sessions/           # 会话管理
├── agents/             # Agent 管理
├── approvals/          # 审批流程
├── users/              # 用户管理
├── blog/               # 博客
├── settings/           # 系统设置
├── marketplace/         # AI 服务市场
├── landing/            # 首页
└── init/               # 初始化向导
```

**共 17 个一级页面**，存在以下问题：

### 1.2 核心问题识别

| 问题 | 描述 | 影响 |
|------|------|------|
| **导航层级混乱** | 功能分区不清晰，Settings 包含过多子功能 | 用户难以快速定位 |
| **Dashboard 信息过载** | 聚合了 Gateway、项目、任务、AI 状态等多维度数据 | 缺乏主次感 |
| **页面职责重叠** | `schedule/` 和 `scheduler/` 并存，skillhub 和 skills 功能边界模糊 | 用户困惑 |
| **设置页面臃肿** | 7 个 Tab 全部堆在一个页面，OpenClaw 设置与通用设置混杂 | 维护困难 |
| **缺乏统一布局抽象** | 各页面自行实现 Header/Sidebar，样式不统一 | 维护成本高 |
| **移动端体验缺失** | 响应式设计不足 | 用户体验差 |
| **状态展示不一致** | 卡片、徽章、按钮样式各异 | 视觉不协调 |

### 1.3 现有设计系统诊断

**已有的良好基础**：
- ✅ 完整的 CSS 变量系统（Dark Mode 支持）
- ✅ 基础组件库（Button, Card, Input, Dialog 等 14 个）
- ✅ 动画系统（fadeIn, slideIn, breathe, glow 等）
- ✅ 语义化颜色系统（brand, ai, success, warning 等）
- ✅ 统一的字体系统（Plus Jakarta Sans）

**需要增强**：
- ⚠️ 组件变体（Variants）不统一
- ⚠️ 缺乏设计 Token 文档
- ⚠️ 缺少复合组件（Compose Pattern）
- ⚠️ 样式分散在多个文件中（globals.css 568 行）
- ⚠️ 缺少图标规范

---

## 二、v1.1 UI 愿景

### 2.1 设计原则

```
┌─────────────────────────────────────────────────────────────┐
│                  TeamClaw v1.1 Design Principles           │
│                                                              │
│  1. 清晰的信息架构（Clear Information Architecture）          │
│     └── 符合 Mental Model 的导航分组                         │
│                                                              │
│  2. 一致的交互模式（Consistent Interaction Patterns）         │
│     └── 统一的状态反馈、过渡动画、错误处理                    │
│                                                              │
│  3. 渐进式复杂度（Progressive Complexity）                   │
│     └── 基础视图 → 高级视图 → 专业视图                        │
│                                                              │
│  4. 移动优先响应式（Mobile-First Responsive）               │
│     └── 核心功能移动端可用                                    │
│                                                              │
│  5. 可访问性优先（Accessibility First）                      │
│     └── 键盘导航、屏幕阅读器、色彩对比度                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 视觉方向

基于现有 Deep-space 极简美学，v1.1 升级为：

```
主题：Deep Command Center（深空指挥中心）
├── 深色系为主：#050810 → #101420
├── 强调色：AI 电光青 #06b6d4
├── 人类色：协作紫 #8b5cf6
├── 信息密度：中高（专业用户）
└── 交互反馈：微光晕 + 流畅动画
```

### 2.3 核心视觉升级

| 维度 | v1.0 | v1.1 |
|------|------|------|
| **图标** | Lucide React 混用 | 统一 Icon System（Lucide + 自定义） |
| **间距** | 随意（px, py, gap-3混用） | 8px 网格系统 |
| **圆角** | rounded-3xl 为主 | 统一半径系统（sm/md/lg/xl） |
| **阴影** | 分散定义 | 统一 Elevation Tokens |
| **动画** | 分散定义 | Motion Primitives |
| **状态** | CSS 类名 | Design Tokens 变量 |

---

## 三、信息架构重构

### 3.1 新导航结构

```
┌──────────────────────────────────────────────────────────────────────┐
│  TeamClaw v1.1 Navigation Architecture                                │
│                                                                        │
│  ┌─ 快捷入口 ─────────────────────────────────────────────────────┐   │
│  │  Dashboard ← 首页仪表盘（Gateway + 核心指标 + 快捷入口）        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ 工作区 ─────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   项目 ← projects/     项目列表 + 里程碑                       │   │
│  │    │                      ↓                                     │   │
│  │    ├── 任务 ← tasks/    看板/列表视图                          │   │
│  │    ├── 文档 ← wiki/     知识库 + 编辑器                       │   │
│  │    └── 成员 ← members/  团队成员（人 + AI）                   │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ 自动化 ─────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   定时 ← schedule/     Cron 任务管理                           │   │
│  │    │                      ↓                                     │   │
│  │    ├── 流程 ← workflows/ Workflow 可视化编辑器 🆕            │   │
│  │    └── 触发 ← triggers/   事件触发规则 🆕                     │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ 资产库 ─────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   技能 ← skills/       技能管理（自进化）                      │   │
│  │    │                      ↓                                     │   │
│  │    ├── 市场 ← skillhub/  ClawHub 技能市场 🆕                   │   │
│  │    └── SOP  ← sop/       SOP 模板库                           │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ 协作 ───────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   交付 ← deliveries/   交付物审核                             │   │
│  │    │                      ↓                                     │   │
│  │    ├── 审批 ← approvals/ 审批流程                            │   │
│  │    ├── 记录 ← sessions/   对话记录                            │   │
│  │    └── OKR  ← okr/        目标管理 🆕                          │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ 运营 ───────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   市场 ← marketplace/   AI 服务市场（Consumer）               │   │
│  │    │                      ↓                                     │   │
│  │    ├── 订阅 ← subscriptions/ 已订阅服务 🆕                    │   │
│  │    └── 收益 ← earnings/    收益中心 🆕                        │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ 管理 ───────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   设置 ← settings/      系统设置（Tab 分类）                  │   │
│  │    │                      ↓                                     │   │
│  │    ├── 通用 ← /general   主题/语言/数据                       │   │
│  │    ├── OpenClaw ← /openclaw Gateway + Workspace              │   │
│  │    ├── 插件 ← /plugins   插件管理 🆕                          │   │
│  │    ├── 渠道 ← /channels  渠道管理 🆕                          │   │
│  │    ├── 安全 ← /security  安全设置                             │   │
│  │    ├── 首页 ← /landing   首页内容管理                          │   │
│  │    ├── 调试 ← /debug     调试工具                              │   │
│  │    └── 关于 ← /about      关于系统                              │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ 其他 ───────────────────────────────────────────────────────┐   │
│  │   Agent ← agents/     Agent 管理（OpenClaw 原生）             │   │
│  │   博客 ← blog/        博客管理                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 页面重组对照表

| v1.0 页面 | v1.1 归属 | 变更说明 |
|----------|----------|---------|
| dashboard/ | 快捷入口 | 保持独立，作为首页 |
| tasks/ | 工作区 | 保持独立 |
| wiki/ | 工作区 | 保持独立 |
| projects/ | 工作区 | 保持独立 |
| members/ | 工作区 | 保持独立 |
| schedule/ | 自动化 | 保持独立 |
| scheduler/ | 自动化 | **合并到 schedule/** |
| skills/ | 资产库 | 保持独立 |
| skillhub/ | 资产库/市场 | 重构为 ClawHub 市场 |
| sop/ | 资产库 | 保持独立 |
| deliveries/ | 协作 | 保持独立 |
| approvals/ | 协作 | 保持独立 |
| sessions/ | 协作 | 保持独立 |
| agents/ | Agent | 保持独立 |
| users/ | 管理 | **移除（仅管理员可见）** |
| settings/ | 管理/设置 | **拆分为子路由** |
| marketplace/ | 运营 | 保持独立 |
| blog/ | 其他 | 保持独立 |

---

## 四、布局系统重构

### 4.1 AppShell 2.0

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

```
┌────────────────────────────────────────────────────────────────────┐
│                    AppShell2 布局系统                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Header (可折叠)                          │  │
│  │  [Logo] [Breadcrumb]          [Search] [Notifications] [User]│  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌────────────┬───────────────────────────────────────────────┐  │
│  │            │                                                │  │
│  │            │                                                │  │
│  │  Sidebar   │               Main Content                     │  │
│  │  (可折叠)   │                                                │  │
│  │            │                                                │  │
│  │            │                                                │  │
│  └────────────┴───────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Command Bar (⌘K)                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Sidebar 2.0

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

### 4.3 Header 2.0

```typescript
// src/shared/layout/Header2.tsx

interface Header2Props {
  title?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  variant?: 'default' | 'transparent' | 'blur';
}
```

### 4.4 Command Bar（⌘K）

新增全局命令面板：

```
┌─────────────────────────────────────────────┐
│  ⌘K  Command Bar                            │
├─────────────────────────────────────────────┤
│  🔍 搜索功能、页面、设置...                   │
├─────────────────────────────────────────────┤
│  RECENT                                    │
│  ├── 创建新任务                             │
│  ├── 查看项目进度                           │
│  └── OpenClaw 设置                         │
├─────────────────────────────────────────────┤
│  ACTIONS                                   │
│  ├── 🌙 切换主题                            │
│  ├── 🚪 登出                               │
│  └── ⚙️ 系统设置                           │
└─────────────────────────────────────────────┘
```

---

## 五、组件系统重构

### 5.1 Design Tokens 体系

```typescript
// src/shared/ui/tokens.ts

export const tokens = {
  // 颜色
  colors: {
    brand: {
      DEFAULT: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    ai: {
      DEFAULT: '#06b6d4',
      light: '#22d3ee',
    },
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },

  // 间距
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },

  // 圆角
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },

  // 阴影
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.06)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.08)',
  },

  // 动画
  motion: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
```

### 5.2 组件分层

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Layers                          │
│                                                              │
│  Layer 1: Primitives（原子组件）                             │
│  ├── Button, Input, Select, Checkbox                         │
│  ├── Badge, Tag, Avatar                                      │
│  ├── Icon, Text, Heading                                     │
│  └── Divider, Spacer                                         │
│                                                              │
│  Layer 2: Composites（复合组件）                             │
│  ├── Card, Panel, Modal, Drawer                             │
│  ├── Table, List, Tree                                       │
│  ├── Form, Field, FieldGroup                                 │
│  └── Tabs, Accordion, Stepper                                │
│                                                              │
│  Layer 3: Patterns（业务模式）                                │
│  ├── StatCard, QuickLink, StatusIndicator                   │
│  ├── DataTable, FilterBar, Pagination                       │
│  ├── SearchBar, CommandPalette                              │
│  └── Notification, Toast, Confirmation                       │
│                                                              │
│  Layer 4: Features（功能模块）                                │
│  ├── TaskCard, TaskBoard                                    │
│  ├── ChatBubble, ChatPanel                                  │
│  ├── SkillCard, WorkflowNode                               │
│  └── MarketplaceItem, PricingCard                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 核心组件重构

#### 5.3.1 Button v2

```typescript
// src/shared/ui/v2/Button.tsx

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

#### 5.3.2 Card v2

```typescript
// src/shared/ui/v2/Card.tsx

interface CardProps {
  variant?: 'default' | 'bordered' | 'elevated' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}
```

#### 5.3.3 DataTable v2

```typescript
// src/shared/ui/v2/DataTable.tsx

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: PaginationConfig;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
}
```

### 5.4 新增组件

| 组件 | 用途 | 优先级 |
|------|------|--------|
| **CommandBar** | 全局命令面板（⌘K） | 🔴 P0 |
| **Breadcrumb** | 面包屑导航 | 🔴 P0 |
| **Notification** | 通知中心 | 🔴 P0 |
| **DataTable** | 数据表格 | 🔴 P0 |
| **KanbanBoard** | 看板组件（从 TaskBoard 抽象） | 🟡 P1 |
| **WorkflowCanvas** | 可视化工作流编辑器 | 🟡 P1 |
| **SkillGraph** | 技能依赖可视化 | 🟢 P2 |
| **AuditLogViewer** | 审计日志查看器 | 🟢 P2 |

---

## 六、重点页面重构

### 6.1 Dashboard 2.0

**重构目标**：从信息聚合 → 指挥中心

```
┌────────────────────────────────────────────────────────────────────┐
│  Dashboard 2.0 — 指挥中心                                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Gateway 状态卡片（醒目）                                      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │
│  │  │ ● OK   │ │ Uptime  │ │Sessions │ │ Channels│            │  │
│  │  │ 运行中  │ │  12h    │ │   5     │ │  4/6    │            │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 今日概览 ─────────────────────────────────────────────────┐  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │  │
│  │  │ 进行中  │ │ 待审核  │ │ 待交付  │ │ 工作 AI │              │  │
│  │  │   8    │ │   3    │ │   2    │ │   2    │              │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ 快捷入口 ─────────────────────────────────────────────────┐  │
│  │  [任务] [文档] [技能] [定时] [审批]                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ AI 团队状态 ─┐  ┌─ 项目进度 ─────────────────────────────┐  │
│  │               │  │                                      │  │
│  │ 🤖 AI-001 运行 │  │  项目A  ████████░░░░░░░░░  40%       │  │
│  │ 🤖 AI-002 空闲 │  │  项目B  ██████████████░░  80%       │  │
│  │ 🤖 AI-003 空闲 │  │  项目C  ████░░░░░░░░░░░░  20%       │  │
│  │               │  │                                      │  │
│  └───────────────┘  └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2 Settings 2.0

**重构目标**：从单页 Tab → 路由化子页面

```
┌────────────────────────────────────────────────────────────────────┐
│  Settings 2.0 — 路由化设置                                          │
│                                                                     │
│  设置分组（Sidebar）            当前设置内容                          │
│  ┌────────────────────┐  ┌────────────────────────────────────┐   │
│  │ 🔧 通用             │  │                                    │   │
│  │ ├── 外观           │  │  外观设置                          │   │
│  │ ├── 语言           │  │                                    │   │
│  │ └── 数据           │  │  主题: [浅色] [深色] [跟随系统]     │   │
│  │                    │  │                                    │   │
│  │ 🤖 OpenClaw        │  │  语言: [中文] [English]            │   │
│  │ ├── Gateway        │  │                                    │   │
│  │ ├── Workspace      │  │  ────────────────────────────────  │   │
│  │ └── Agent          │  │                                    │   │
│  │                    │  │  数据管理                          │   │
│  │ 🔌 插件 🆕        │  │  数据库: SQLite                    │   │
│  │ ├── 已安装        │  │  位置: ~/.teamclaw/data            │   │
│  │ ├── 市场 🆕      │  │                                    │   │
│  │ └── 配置 🆕      │  │  [导出数据] [刷新数据] [备份]       │   │
│  │                    │  │                                    │   │
│  │ 📡 渠道 🆕        │  └────────────────────────────────────┘   │
│  │ ├── WhatsApp       │                                            │
│  │ ├── Telegram       │                                            │
│  │ └── Discord        │                                            │
│  │                    │                                            │
│  │ 🔒 安全            │                                            │
│  │ ├── 密码           │                                            │
│  │ ├── 安全码         │                                            │
│  │ └── SSRF           │                                            │
│  │                    │                                            │
│  │ 📝 内容            │                                            │
│  │ └── 首页           │                                            │
│  │                    │                                            │
│  │ 🔧 工具            │                                            │
│  │ ├── 调试           │                                            │
│  │ └── 重置           │                                            │
│  │                    │                                            │
│  │ ℹ️ 关于            │                                            │
│  └────────────────────┘                                            │
└────────────────────────────────────────────────────────────────────┘
```

### 6.3 Workflow Editor（Phase 2）

```
┌────────────────────────────────────────────────────────────────────┐
│  Workflow Editor 2.0 — 可视化工作流                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [← 返回]  [Workflow Name]              [保存] [运行] [发布]   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────┬──────────────────────────────────────────────┐  │
│  │  节点面板    │               Canvas                          │  │
│  │  ┌────────┐ │  ┌─────────────────────────────────────────┐ │  │
│  │  │ Trigger│ │  │                                         │ │  │
│  │  │ ○ Cron │ │  │     ┌──────┐     ┌──────┐               │ │  │
│  │  │ ○ Event│ │  │     │ Start│────▶│ Step1│               │ │  │
│  │  │ ○ Webhook│ │  │     └──────┘     └──────┘               │ │  │
│  │  └────────┘ │  │                    │                       │ │  │
│  │  ┌────────┐ │  │            ┌──────▼──────┐                 │ │  │
│  │  │ Action │ │  │            │  Condition  │                 │ │  │
│  │  │ ○ Task │ │  │            └──────┬──────┘                 │ │  │
│  │  │ ○ Notify│ │  │         ┌───────┴───────┐                │ │  │
│  │  │ ○ Webhook│ │  │         ▼               ▼                │ │  │
│  │  │ ○ Delay │ │  │    ┌──────┐        ┌──────┐              │ │  │
│  │  └────────┘ │  │    │ Step2│        │ Step3│              │ │  │
│  │  ┌────────┐ │  │    └──────┘        └──────┘              │ │  │
│  │  │ Logic  │ │  │                                         │ │  │
│  │  │ ○ If   │ │  │                                         │ │  │
│  │  │ ○ Loop │ │  └─────────────────────────────────────────┘ │  │
│  │  │ ○ Merge│ │                                               │  │
│  │  └────────┘ │  ┌──────────────────────────────────────────┐│  │
│  │  ┌────────┐ │  │  属性面板                                 ││  │
│  │  │ AI     │ │  │  Node: Cron Trigger                      ││  │
│  │  │ ○ Ask  │ │  │  ──────────────────────────────         ││  │
│  │  │ ○ Generate│ │  │  表达式: 0 0 9 * * *                  ││  │
│  │  │ ○ Summarize│ │ │  时区: Asia/Shanghai                  ││  │
│  │  └────────┘ │  │  ──────────────────────────────         ││  │
│  └──────────────┴──────────────────────────────────────────┘│  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 七、响应式设计

### 7.1 断点系统

| 断点 | 范围 | 布局 |
|------|------|------|
| **xs** | < 640px | 单列，移动优先 |
| **sm** | 640-767px | 简化侧边栏 |
| **md** | 768-1023px | 可折叠侧边栏 |
| **lg** | 1024-1279px | 标准布局 |
| **xl** | 1280-1535px | 扩展布局 |
| **2xl** | ≥ 1536px | 宽屏优化 |

### 7.2 移动端导航

```
┌─────────────────────┐
│ ☰  TeamClaw    🔍  │  ← 移动端 Header
└─────────────────────┘
│                     │
│   [Dashboard]       │  ← 抽屉式导航
│   [Tasks]           │
│   [Wiki]            │
│   [Skills]         │
│   ...               │
│                     │
│   ─────────         │
│   [Settings]        │
│   [Help]            │
└─────────────────────┘
```

### 7.3 关键页面响应式

| 页面 | xs (<640px) | sm-md (640-1023px) | lg+ (≥1024px) |
|------|-------------|-------------------|--------------|
| Dashboard | 卡片单列 | 2列网格 | 4列网格 |
| Tasks | 列表视图 | 列表/看板 | 看板 + 详情 |
| Wiki | 单列 | 侧边栏折叠 | 侧边栏展开 |
| Settings | 全屏 Tab | Drawer Tab | 分栏布局 |

---

## 八、交互模式统一

### 8.1 状态反馈规范

| 状态 | 视觉表现 | 交互表现 |
|------|---------|---------|
| **默认** | 正常样式 | 可交互 |
| **悬停** | 背景变亮 + 轻微阴影 | 指针变为 pointer |
| **激活** | 品牌色边框/背景 | 立即响应 |
| **加载** | 骨架屏/微调样式 | 禁用交互 |
| **成功** | 绿色渐变 + 动画 | 自动消失或显示确认 |
| **错误** | 红色边框/背景 | 显示错误信息 |
| **禁用** | 透明度 50% | 禁止交互 |

### 8.2 动画规范

```typescript
// src/shared/ui/motion.ts

export const motion = {
  // 快速反馈（按钮点击、切换）
  quick: {
    duration: 150,
    easing: 'ease-out',
  },

  // 正常过渡（页面切换、展开收起）
  normal: {
    duration: 300,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // spring
  },

  // 缓慢动画（数据加载、进度）
  slow: {
    duration: 500,
    easing: 'ease-in-out',
  },

  // 特殊效果
  bounce: {
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};
```

### 8.3 错误处理模式

```
┌─────────────────────────────────────────────────────┐
│  错误处理层级                                       │
│                                                     │
│  Level 1: 内联错误（Inline）                       │
│  ├── 输入框下方红色提示文字                        │
│  └── 适用于：表单字段验证                          │
│                                                     │
│  Level 2: Toast 通知（Toast）                     │
│  ├── 右上角弹出，3-5秒自动消失                      │
│  └── 适用于：操作失败、成功、警告                  │
│                                                     │
│  Level 3: 确认对话框（Confirmation）               │
│  ├── 模态框，需要用户确认                          │
│  └── 适用于：危险操作确认                         │
│                                                     │
│  Level 4: 错误页面（Error Page）                  │
│  ├── 全屏错误提示，提供重试/返回选项                │
│  └── 适用于：严重错误、网络问题                    │
└─────────────────────────────────────────────────────┘
```

---

## 九、实施计划

### Phase 1: 基础重构（v1.1 早期）

#### Week 1-2: 布局系统
- [ ] 重构 AppShell2
- [ ] 重构 Sidebar2
- [ ] 重构 Header2
- [ ] 实现 CommandBar
- [ ] 实现响应式断点

#### Week 3-4: 设计系统
- [ ] 提取 Design Tokens
- [ ] 重构 Button/Card/Input v2
- [ ] 实现 DataTable v2
- [ ] 实现 Notification 系统
- [ ] 统一动画规范

### Phase 2: 页面重构（v1.1 中期）

#### Week 5-6: Dashboard + Settings
- [ ] 重构 Dashboard 2.0
- [ ] Settings 路由化拆分
- [ ] 统一状态展示

#### Week 7-8: 工作区页面
- [ ] Tasks 页面优化
- [ ] Wiki 页面优化
- [ ] Members 页面优化

### Phase 3: 新功能 UI（v1.1 后期）

#### Week 9-10: Workflow Editor
- [ ] WorkflowCanvas 基础
- [ ] 节点拖拽
- [ ] 属性面板
- [ ] 预览/运行

#### Week 11-12: 高级功能
- [ ] SkillGraph 可视化
- [ ] AuditLogViewer
- [ ] 移动端适配
- [ ] 性能优化

---

## 十、技术实现

### 10.1 目录结构

```
src/
├── shared/
│   ├── ui/
│   │   ├── v2/                    # v2 组件（重写）
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── ...
│   │   ├── tokens/                # Design Tokens
│   │   │   ├── colors.ts
│   │   │   ├── spacing.ts
│   │   │   ├── radius.ts
│   │   │   └── index.ts
│   │   ├── motion/                # 动画系统
│   │   │   └── transitions.ts
│   │   └── index.ts
│   │
│   ├── layout/
│   │   ├── AppShell2.tsx         # 新布局
│   │   ├── Sidebar2.tsx          # 新侧边栏
│   │   ├── Header2.tsx            # 新头部
│   │   └── CommandBar.tsx         # 命令面板
│   │
│   └── hooks/
│       ├── useDesignTokens.ts
│       ├── useResponsive.ts
│       └── useMotion.ts
│
├── app/
│   ├── settings/
│   │   ├── layout.tsx            # Settings 专属布局
│   │   ├── page.tsx              # 重定向到 general
│   │   ├── general/
│   │   │   └── page.tsx          # 通用设置
│   │   ├── openclaw/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── workspace/
│   │   │       └── page.tsx
│   │   ├── plugins/              # 🆕
│   │   │   └── page.tsx
│   │   ├── channels/             # 🆕
│   │   │   └── page.tsx
│   │   └── security/
│   │       └── page.tsx
│   │
│   ├── workflows/               # 🆕
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── editor/
│   │           └── page.tsx
│   │
│   └── ... (其他页面)
```

### 10.2 迁移策略

```typescript
// 1. 保持 v1 组件兼容
// src/shared/ui/index.ts
export { Button } from './Button';      // v1 (旧)
export { Button as ButtonV2 } from './v2/Button';  // v2 (新)

// 2. 渐进式迁移
// 新页面使用 v2，旧页面逐步迁移
// 使用 Feature Flag 控制

// 3. 样式迁移
// globals.css 中的样式逐步迁移到 Tailwind @apply 或 CSS Modules
```

### 10.3 性能考虑

| 优化项 | 方案 |
|--------|------|
| **组件懒加载** | dynamic import for heavy components |
| **图片优化** | Next.js Image / WebP |
| **代码分割** | Route-based splitting |
| **状态优化** | Zustand selector 精确订阅 |
| **渲染优化** | React.memo / useMemo |
| **动画优化** | CSS animation / GPU acceleration |

---

## 十一、验收标准

### 11.1 功能验收

- [ ] 所有现有页面在 v2 布局下正常工作
- [ ] Settings 路由化拆分完成
- [ ] Dashboard 2.0 信息架构清晰
- [ ] Command Bar (⌘K) 功能完整
- [ ] 响应式布局在 3 个断点下正常

### 11.2 视觉验收

- [ ] Design Tokens 在所有组件中一致使用
- [ ] 动画流畅，无 jank
- [ ] Dark Mode 完整支持
- [ ] 组件变体统一
- [ ] 图标大小/风格统一

### 11.3 性能验收

- [ ] Lighthouse Performance ≥ 90
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] 无 Layout Shift

---

_本文档配合 `teamclaw_v1.1.md` 主规划文件使用_  
_Last updated: 2026-03-26_
