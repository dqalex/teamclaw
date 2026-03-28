/**
 * v1.1 Sprint 7: OpenClaw 插件系统类型定义
 *
 * 插件清单、注册表、状态管理的类型。
 * 参考: docs/optimization/teamclaw_v1.1-openclaw-integration.md §4
 */

// ============================================================
// 插件清单
// ============================================================

/** OpenClaw 插件类型 */
export type PluginType = 'native' | 'bundle';

/** 插件状态 */
export type PluginStatus = 'discovered' | 'enabled' | 'disabled' | 'error';

/** 插件来源 */
export type PluginSource = 'official' | 'community' | 'local' | 'bundled';

/** 插件能力声明 */
export interface PluginCapabilities {
  /** 支持的渠道（whatsapp, telegram, discord, matrix, slack 等） */
  channels?: string[];
  /** 注册的 MCP 工具 */
  tools?: string[];
  /** 提供的 Skills */
  skills?: string[];
  /** 生命周期钩子 */
  hooks?: string[];
  /** 模型提供商 */
  providers?: string[];
}

/** 插件依赖声明 */
export interface PluginDependencies {
  /** 需要的系统命令 */
  bins?: string[];
  /** 需要的环境变量（不含值） */
  env?: string[];
  /** 需要的 OpenClaw 配置路径 */
  config?: Record<string, unknown>;
}

/** 插件作者信息 */
export interface PluginAuthor {
  name: string;
  url?: string;
  email?: string;
}

/** OpenClaw 插件清单 */
export interface OpenClawPlugin {
  /** 插件唯一标识（npm 包名或本地路径） */
  id: string;
  /** 插件显示名称 */
  name: string;
  /** 语义化版本 */
  version: string;
  /** 简要描述 */
  description?: string;
  /** 插件类型 */
  type: PluginType;
  /** 作者信息 */
  author?: PluginAuthor;
  /** 插件能力 */
  capabilities: PluginCapabilities;
  /** 运行依赖 */
  dependencies?: PluginDependencies;
  /** 配置 schema（JSON Schema 格式） */
  configSchema?: Record<string, unknown>;
  /** 首页链接 */
  homepage?: string;
  /** 许可证 */
  license?: string;
  /** 关键词/标签 */
  keywords?: string[];
  /** 插件图标 emoji */
  icon?: string;
}

/** 插件状态快照 */
export interface PluginState {
  plugin: OpenClawPlugin;
  status: PluginStatus;
  source: PluginSource;
  /** 安装时间 */
  installedAt: number;
  /** 最后启用/禁用时间 */
  lastStatusChangeAt: number;
  /** 错误信息（仅 status=error 时有值） */
  errorMessage?: string;
  /** 用户自定义配置 */
  userConfig?: Record<string, unknown>;
}

/** 插件状态映射（id → state） */
export type PluginStatusMap = Record<string, PluginState>;

// ============================================================
// 插件注册表接口
// ============================================================

/** 插件注册表操作接口 */
export interface IPluginRegistry {
  /** 发现已安装的插件（扫描配置文件） */
  discover(): Promise<OpenClawPlugin[]>;

  /** 获取单个插件信息 */
  getPlugin(id: string): Promise<OpenClawPlugin | null>;

  /** 获取插件完整状态 */
  getPluginState(id: string): Promise<PluginState | null>;

  /** 获取所有插件状态 */
  getAllPluginStates(): Promise<PluginStatusMap>;

  /** 启用插件 */
  enablePlugin(id: string): Promise<void>;

  /** 禁用插件 */
  disablePlugin(id: string): Promise<void>;

  /** 更新插件配置 */
  updatePluginConfig(id: string, config: Record<string, unknown>): Promise<void>;

  /** 卸载插件 */
  uninstallPlugin(id: string): Promise<void>;
}

// ============================================================
// 插件管理 API 请求/响应类型
// ============================================================

/** 创建/更新插件配置请求 */
export interface PluginConfigRequest {
  config: Record<string, unknown>;
}

/** 插件列表响应中的单项 */
export interface PluginListItem {
  id: string;
  name: string;
  version: string;
  description?: string;
  type: PluginType;
  status: PluginStatus;
  source: PluginSource;
  icon?: string;
  capabilities: PluginCapabilities;
  installedAt: number;
  errorMessage?: string;
}
