/**
 * v1.1 Sprint 7: Skill 格式兼容层
 *
 * 扩展 TeamClaw SKILL.md frontmatter 以兼容 OpenClaw 元数据格式。
 * 支持 source='clawhub' 标记和 metadata.openclaw 字段。
 *
 * 参考: docs/optimization/teamclaw_v1.1-openclaw-integration.md §3.3
 */

// ============================================================
// 扩展的 Skill Frontmatter
// ============================================================

/** OpenClaw 兼容元数据 */
export interface OpenClawSkillMetadata {
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
}

/** 安装器规格 */
export interface InstallerSpec {
  type: 'npm' | 'pip' | 'brew' | 'apt' | 'custom';
  command: string;
  description?: string;
}

/** Skill 进化配置 */
export interface EvolutionConfig {
  enabled: boolean;
  promotionThreshold: number;
  maxL4Entries: number;
}

/** 扩展的 Skill Frontmatter（兼容 OpenClaw 格式） */
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

  // OpenClaw 兼容字段
  metadata?: {
    openclaw?: OpenClawSkillMetadata;
    evolution?: EvolutionConfig;
  };
}

// ============================================================
// 兼容性工具函数
// ============================================================

/**
 * 解析 SKILL.md frontmatter，提取扩展字段
 *
 * @param raw - YAML frontmatter 原始文本（不含 --- 分隔符）
 * @returns 解析后的 ExtendedSkillFrontmatter
 */
export function parseSkillFrontmatter(raw: string): ExtendedSkillFrontmatter {
  // 简单 YAML 解析（不含嵌套对象解析）
  const result: Record<string, unknown> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (value) result[key] = value;
  }

  return {
    name: String(result['name'] ?? ''),
    version: String(result['version'] ?? '1.0.0'),
    description: String(result['description'] ?? ''),
    category: (['content', 'tool', 'automation', 'integration'].includes(String(result['category']))
      ? result['category']
      : 'tool') as ExtendedSkillFrontmatter['category'],
    source: (['sop', 'manual', 'clawhub', 'bundled'].includes(String(result['source']))
      ? result['source']
      : 'manual') as ExtendedSkillFrontmatter['source'],
    sopTemplateId: result['sopTemplateId'] ? String(result['sopTemplateId']) : undefined,
    trustStatus: (['approved', 'pending', 'rejected'].includes(String(result['trustStatus']))
      ? result['trustStatus']
      : 'pending') as ExtendedSkillFrontmatter['trustStatus'],
  };
}

/**
 * 判断 Skill 是否来自 ClawHub
 */
export function isClawHubSkill(frontmatter: ExtendedSkillFrontmatter): boolean {
  return frontmatter.source === 'clawhub';
}

/**
 * 判断 Skill 是否需要 OpenClaw 运行环境
 */
export function requiresOpenClaw(frontmatter: ExtendedSkillFrontmatter): boolean {
  return frontmatter.metadata?.openclaw?.always ?? false;
}

/**
 * 获取 Skill 的图标（emoji）
 */
export function getSkillIcon(frontmatter: ExtendedSkillFrontmatter): string {
  return frontmatter.metadata?.openclaw?.emoji ?? '📋';
}

/**
 * 检查 Skill 是否兼容当前操作系统
 */
export function isCompatibleOS(frontmatter: ExtendedSkillFrontmatter): boolean {
  const requiredOS = frontmatter.metadata?.openclaw?.os;
  if (!requiredOS || requiredOS.length === 0) return true;
  const currentOS = typeof process !== 'undefined' ? process.platform : 'darwin';
  return requiredOS.includes(currentOS as 'darwin' | 'linux' | 'win32');
}
