/**
 * v1.1 Sprint 7: ClawHub 市场客户端
 *
 * ClawHub API 客户端，支持 Skill 搜索、浏览、安装、更新。
 * 当前为模拟实现，实际 ClawHub API 接入后替换 fetch 调用即可。
 *
 * 参考: docs/optimization/teamclaw_v1.1-openclaw-integration.md §3
 */

import type {
  ClawHubSkill,
  ClawHubSkillDetail,
  SkillFilters,
  InstallResult,
  UpdateResult,
  UpdateAllResult,
  SyncResult,
  SyncStatus,
  IClawHubClient,
} from './types';

/** ClawHub API 基础 URL（默认使用官方） */
const CLAWHUB_API_BASE = process.env.CLAWHUB_API_BASE ?? 'https://clawhub.com/api/v1';

/**
 * ClawHub 市场客户端
 *
 * 设计原则：
 * - 所有方法返回 Promise，便于异步集成
 * - Gateway 不可用时返回模拟数据（开发/演示模式）
 * - 实际 API 就绪后只需替换 fetch 逻辑
 */
export class ClawHubClient implements IClawHubClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? CLAWHUB_API_BASE;
  }

  // ---- 浏览 ----

  async searchSkills(query: string, filters?: SkillFilters): Promise<ClawHubSkill[]> {
    try {
      const params = new URLSearchParams({ q: query });
      if (filters?.category) params.set('category', filters.category);
      if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters?.offset) params.set('offset', String(filters.offset));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const res = await fetch(`${this.baseUrl}/skills/search?${params}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`ClawHub search failed: ${res.status}`);
      const data = await res.json();
      return (data.skills ?? []) as ClawHubSkill[];
    } catch (error) {
      console.warn('[ClawHubClient] API 不可用，返回模拟数据:', error);
      return this.getMockSkills(query);
    }
  }

  async getFeaturedSkills(): Promise<ClawHubSkill[]> {
    try {
      const res = await fetch(`${this.baseUrl}/skills/featured`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`ClawHub featured failed: ${res.status}`);
      const data = await res.json();
      return (data.skills ?? []) as ClawHubSkill[];
    } catch (error) {
      console.warn('[ClawHubClient] API 不可用，返回模拟数据:', error);
      return this.getMockSkills('');
    }
  }

  async getSkillBySlug(slug: string): Promise<ClawHubSkillDetail> {
    try {
      const res = await fetch(`${this.baseUrl}/skills/${encodeURIComponent(slug)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`ClawHub detail failed: ${res.status}`);
      return (await res.json()) as ClawHubSkillDetail;
    } catch (error) {
      console.warn('[ClawHubClient] API 不可用，返回模拟数据:', error);
      const mock = this.getMockSkillDetail(slug);
      if (!mock) throw new Error(`Skill not found: ${slug}`);
      return mock;
    }
  }

  // ---- 安装/更新 ----

  async installSkill(slug: string, targetDir: string): Promise<InstallResult> {
    try {
      const res = await fetch(`${this.baseUrl}/skills/${encodeURIComponent(slug)}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDir }),
      });
      if (!res.ok) throw new Error(`Install failed: ${res.status}`);
      return (await res.json()) as InstallResult;
    } catch (error) {
      console.warn('[ClawHubClient] 安装失败（模拟模式）:', error);
      return {
        success: true,
        slug,
        version: '1.0.0',
        installPath: targetDir,
      };
    }
  }

  async updateSkill(slug: string): Promise<UpdateResult> {
    try {
      const res = await fetch(`${this.baseUrl}/skills/${encodeURIComponent(slug)}/update`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return (await res.json()) as UpdateResult;
    } catch (error) {
      console.warn('[ClawHubClient] 更新失败（模拟模式）:', error);
      return {
        success: true,
        slug,
        oldVersion: '1.0.0',
        newVersion: '1.0.1',
      };
    }
  }

  async updateAll(): Promise<UpdateAllResult> {
    try {
      const res = await fetch(`${this.baseUrl}/skills/update-all`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Update all failed: ${res.status}`);
      return (await res.json()) as UpdateAllResult;
    } catch {
      return { total: 0, updated: 0, skipped: 0, failed: 0, results: [] };
    }
  }

  // ---- 同步 ----

  async syncAll(): Promise<SyncResult> {
    try {
      const res = await fetch(`${this.baseUrl}/sync`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
      return (await res.json()) as SyncResult;
    } catch {
      return { total: 0, added: 0, updated: 0, removed: 0, errors: [] };
    }
  }

  getSyncStatus(): SyncStatus {
    return {
      lastSyncAt: null,
      lastSyncResult: null,
      autoSyncEnabled: false,
      syncIntervalMs: 3600000,
    };
  }

  // ---- 模拟数据（Gateway 不可用时） ----

  private getMockSkills(query: string): ClawHubSkill[] {
    const all = [
      {
        slug: 'task-automation',
        name: 'Task Automation',
        description: 'Automate repetitive tasks with AI-powered workflows',
        author: { name: 'OpenClaw Team' },
        tags: ['automation', 'workflow', 'tasks'],
        downloads: 1520,
        rating: 4.7,
        ratingCount: 89,
        version: '2.1.0',
        updatedAt: '2026-03-20T10:00:00Z',
        icon: '⚡',
      },
      {
        slug: 'code-review',
        name: 'Code Review',
        description: 'AI-assisted code review with best practices analysis',
        author: { name: 'DevTools Lab' },
        tags: ['code', 'review', 'quality'],
        downloads: 980,
        rating: 4.5,
        ratingCount: 56,
        version: '1.3.0',
        updatedAt: '2026-03-18T15:00:00Z',
        icon: '🔍',
      },
      {
        slug: 'doc-generator',
        name: 'Doc Generator',
        description: 'Generate API documentation from code and comments',
        author: { name: 'OpenClaw Team' },
        tags: ['docs', 'generator', 'api'],
        downloads: 750,
        rating: 4.3,
        ratingCount: 42,
        version: '1.1.0',
        updatedAt: '2026-03-15T08:00:00Z',
        icon: '📄',
      },
      {
        slug: 'data-analyzer',
        name: 'Data Analyzer',
        description: 'Analyze datasets and generate insights automatically',
        author: { name: 'DataLab' },
        tags: ['data', 'analysis', 'insights'],
        downloads: 620,
        rating: 4.6,
        ratingCount: 38,
        version: '1.0.2',
        updatedAt: '2026-03-22T12:00:00Z',
        icon: '📊',
      },
      {
        slug: 'security-scanner',
        name: 'Security Scanner',
        description: 'Scan code for security vulnerabilities and best practices',
        author: { name: 'SecOps Team' },
        tags: ['security', 'scanner', 'vulnerability'],
        downloads: 1100,
        rating: 4.8,
        ratingCount: 72,
        version: '2.0.1',
        updatedAt: '2026-03-25T09:00:00Z',
        icon: '🛡️',
      },
    ];

    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.includes(q))
    );
  }

  private getMockSkillDetail(slug: string): ClawHubSkillDetail | null {
    const skill = this.getMockSkills(slug).find((s) => s.slug === slug);
    if (!skill) return null;
    return {
      ...skill,
      readme: `# ${skill.name}\n\n${skill.description}\n\n## Installation\n\n\`\`\`bash\nnpx skills add ${skill.slug}\n\`\`\`\n\n## Usage\n\nSee SKILL.md for detailed instructions.`,
      skillYaml: `---\nname: ${skill.name}\nversion: ${skill.version}\ndescription: ${skill.description}\ntags: [${skill.tags.join(', ')}]\n---\n\n# ${skill.name}\n\n${skill.description}`,
      changelog: `## ${skill.version}\n- Initial release`,
      dependencies: [],
      installCommand: `npx skills add ${skill.slug}`,
      homepage: 'https://clawhub.com/skills/' + slug,
      license: 'MIT',
    };
  }
}

// ---- 单例 ----

let _instance: ClawHubClient | null = null;

/** 获取 ClawHub 客户端单例 */
export function getClawHubClient(): ClawHubClient {
  if (!_instance) {
    _instance = new ClawHubClient();
  }
  return _instance;
}
