/**
 * v1.1 Sprint 7: ClawHub 市场客户端类型定义
 *
 * ClawHub 是 OpenClaw 官方 Skill 市场平台。
 * 参考: docs/optimization/teamclaw_v1.1-openclaw-integration.md §3
 */

// ============================================================
// ClawHub 市场类型
// ============================================================

/** Skill 筛选条件 */
export interface SkillFilters {
  /** 关键词搜索 */
  query?: string;
  /** 分类筛选 */
  category?: string;
  /** 标签筛选 */
  tags?: string[];
  /** 排序方式 */
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页偏移 */
  offset?: number;
  /** 分页大小 */
  limit?: number;
}

/** ClawHub Skill 摘要（列表项） */
export interface ClawHubSkill {
  /** 唯一标识 slug */
  slug: string;
  /** 显示名称 */
  name: string;
  /** 简要描述 */
  description: string;
  /** 作者 */
  author: {
    name: string;
    url?: string;
  };
  /** 标签 */
  tags: string[];
  /** 下载次数 */
  downloads: number;
  /** 评分（0-5） */
  rating: number;
  /** 评分人数 */
  ratingCount?: number;
  /** 当前版本 */
  version: string;
  /** 最后更新时间（ISO 8601） */
  updatedAt: string;
  /** 图标 emoji */
  icon?: string;
}

/** ClawHub Skill 详情 */
export interface ClawHubSkillDetail extends ClawHubSkill {
  /** README 内容（Markdown） */
  readme: string;
  /** SKILL.md 源码 */
  skillYaml: string;
  /** 变更日志 */
  changelog: string;
  /** 依赖列表 */
  dependencies: string[];
  /** 推荐安装命令 */
  installCommand?: string;
  /** 主页链接 */
  homepage?: string;
  /** 许可证 */
  license?: string;
}

// ============================================================
// 安装/更新操作结果
// ============================================================

/** 安装结果 */
export interface InstallResult {
  success: boolean;
  slug: string;
  version: string;
  installPath: string;
  error?: string;
}

/** 更新结果 */
export interface UpdateResult {
  success: boolean;
  slug: string;
  oldVersion: string;
  newVersion: string;
  error?: string;
}

/** 批量更新结果 */
export interface UpdateAllResult {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  results: UpdateResult[];
}

/** 同步结果 */
export interface SyncResult {
  total: number;
  added: number;
  updated: number;
  removed: number;
  errors: string[];
}

/** 同步状态 */
export interface SyncStatus {
  lastSyncAt: number | null;
  lastSyncResult: SyncResult | null;
  autoSyncEnabled: boolean;
  syncIntervalMs: number;
}

// ============================================================
// ClawHub 客户端接口
// ============================================================

/** ClawHub 市场客户端 */
export interface IClawHubClient {
  /** 搜索 Skills */
  searchSkills(query: string, filters?: SkillFilters): Promise<ClawHubSkill[]>;

  /** 获取精选 Skills */
  getFeaturedSkills(): Promise<ClawHubSkill[]>;

  /** 获取 Skill 详情 */
  getSkillBySlug(slug: string): Promise<ClawHubSkillDetail>;

  /** 安装 Skill */
  installSkill(slug: string, targetDir: string): Promise<InstallResult>;

  /** 更新单个 Skill */
  updateSkill(slug: string): Promise<UpdateResult>;

  /** 更新所有已安装 Skills */
  updateAll(): Promise<UpdateAllResult>;

  /** 同步所有已安装 Skills */
  syncAll(): Promise<SyncResult>;

  /** 获取同步状态 */
  getSyncStatus(): SyncStatus;
}
