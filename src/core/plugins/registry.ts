/**
 * v1.1 Sprint 7: OpenClaw 插件注册表
 *
 * 通过 Gateway RPC 接口发现和管理 OpenClaw 插件。
 * 本地维护插件状态（enabled/disabled/config）。
 *
 * 参考: docs/optimization/teamclaw_v1.1-openclaw-integration.md §4
 */

import type {
  OpenClawPlugin,
  PluginState,
  PluginStatusMap,
  PluginStatus,
  IPluginRegistry,
} from './types';

/**
 * 通过 Gateway RPC 发现已安装的插件。
 *
 * 注意：当前 Gateway 可能尚未暴露 plugins.list RPC，
 * 因此注册表同时支持本地模拟模式（用于开发/演示）。
 */
export class PluginRegistry implements IPluginRegistry {
  private stateCache: Map<string, PluginState> = new Map();
  private discovered: OpenClawPlugin[] = [];
  private initialized = false;

  // ---- 发现 ----

  async discover(): Promise<OpenClawPlugin[]> {
    try {
      const plugins = await this.fetchPluginsFromGateway();
      this.discovered = plugins;

      // 为新发现的插件创建状态
      for (const plugin of plugins) {
        const existing = this.stateCache.get(plugin.id);
        if (!existing) {
          this.stateCache.set(plugin.id, {
            plugin,
            status: 'discovered',
            source: this.inferSource(plugin),
            installedAt: Date.now(),
            lastStatusChangeAt: Date.now(),
          });
        }
      }

      this.initialized = true;
      return plugins;
    } catch (error) {
      // Gateway 不可用时返回本地缓存 + 内置示例插件
      console.warn('[PluginRegistry] Gateway 不可用，使用内置插件列表:', error);
      this.discovered = this.getBuiltinPlugins();
      this.initialized = true;
      return this.discovered;
    }
  }

  // ---- 查询 ----

  async getPlugin(id: string): Promise<OpenClawPlugin | null> {
    if (!this.initialized) await this.discover();
    return this.discovered.find((p) => p.id === id) ?? null;
  }

  async getPluginState(id: string): Promise<PluginState | null> {
    if (!this.initialized) await this.discover();
    return this.stateCache.get(id) ?? null;
  }

  async getAllPluginStates(): Promise<PluginStatusMap> {
    if (!this.initialized) await this.discover();
    const result: PluginStatusMap = {};
    for (const [id, state] of this.stateCache) {
      result[id] = { ...state };
    }
    return result;
  }

  // ---- 管理 ----

  async enablePlugin(id: string): Promise<void> {
    const state = this.stateCache.get(id);
    if (!state) throw new Error(`Plugin not found: ${id}`);
    if (state.status === 'enabled') return;

    const updated: PluginState = {
      ...state,
      status: 'enabled',
      lastStatusChangeAt: Date.now(),
      errorMessage: undefined,
    };
    this.stateCache.set(id, updated);
  }

  async disablePlugin(id: string): Promise<void> {
    const state = this.stateCache.get(id);
    if (!state) throw new Error(`Plugin not found: ${id}`);
    if (state.status === 'disabled') return;

    const updated: PluginState = {
      ...state,
      status: 'disabled',
      lastStatusChangeAt: Date.now(),
    };
    this.stateCache.set(id, updated);
  }

  async updatePluginConfig(id: string, config: Record<string, unknown>): Promise<void> {
    const state = this.stateCache.get(id);
    if (!state) throw new Error(`Plugin not found: ${id}`);

    const updated: PluginState = {
      ...state,
      userConfig: { ...state.userConfig, ...config },
      lastStatusChangeAt: Date.now(),
    };
    this.stateCache.set(id, updated);
  }

  async uninstallPlugin(id: string): Promise<void> {
    const state = this.stateCache.get(id);
    if (!state) throw new Error(`Plugin not found: ${id}`);
    this.stateCache.delete(id);
    this.discovered = this.discovered.filter((p) => p.id !== id);
  }

  // ---- 内部方法 ----

  /** 从 Gateway RPC 获取插件列表 */
  private async fetchPluginsFromGateway(): Promise<OpenClawPlugin[]> {
    try {
      const res = await fetch('/api/plugins?source=gateway', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Gateway plugins API 返回 ${res.status}`);
      const data = await res.json();
      return (data.plugins ?? []) as OpenClawPlugin[];
    } catch {
      return [];
    }
  }

  /** 推断插件来源 */
  private inferSource(plugin: OpenClawPlugin): 'official' | 'community' | 'local' | 'bundled' {
    if (plugin.id.startsWith('@openclaw/')) return 'official';
    if (plugin.id.startsWith('@bundled/')) return 'bundled';
    if (plugin.id.startsWith('file:') || plugin.id.startsWith('./')) return 'local';
    return 'community';
  }

  /** 内置示例插件（Gateway 不可用时使用） */
  private getBuiltinPlugins(): OpenClawPlugin[] {
    return [
      {
        id: '@openclaw/matrix',
        name: 'Matrix',
        version: '1.2.3',
        description: 'Microsoft Teams integration via Matrix protocol',
        type: 'native',
        icon: '🔗',
        author: { name: 'OpenClaw Team', url: 'https://openclaw.ai' },
        capabilities: {
          channels: ['matrix', 'msteams'],
          tools: ['matrix.send_message', 'matrix.list_channels'],
          skills: ['teams-notification'],
          hooks: ['message_received'],
        },
        dependencies: { bins: ['node'], env: ['MATRIX_HOMESERVER', 'MATRIX_ACCESS_TOKEN'] },
      },
      {
        id: '@openclaw/nostr',
        name: 'Nostr',
        version: '0.8.0',
        description: 'Decentralized social protocol integration',
        type: 'native',
        icon: ' nostr',
        author: { name: 'OpenClaw Team' },
        capabilities: {
          channels: ['nostr'],
          tools: ['nostr.publish_event', 'nostr.subscribe'],
          hooks: ['message_received'],
        },
        dependencies: { env: ['NOSTR_RELAY_URL', 'NOSTR_PRIVATE_KEY'] },
      },
      {
        id: '@openclaw/voice-call',
        name: 'Voice Call',
        version: '1.0.0',
        description: 'Voice interaction capabilities for AI agents',
        type: 'native',
        icon: '📞',
        author: { name: 'OpenClaw Team' },
        capabilities: {
          channels: ['voice'],
          tools: ['voice.start_call', 'voice.end_call', 'voice.transcribe'],
          providers: ['whisper'],
        },
        dependencies: { env: ['VOICE_API_KEY'] },
      },
    ];
  }
}

// ---- 单例 ----

let _instance: PluginRegistry | null = null;

/** 获取插件注册表单例 */
export function getPluginRegistry(): PluginRegistry {
  if (!_instance) {
    _instance = new PluginRegistry();
  }
  return _instance;
}
