/**
 * 插件管理 Store
 *
 * 管理插件列表状态、发现、启用/禁用操作。
 */

import { create } from 'zustand';
import type { PluginListItem } from '@/core/plugins';

interface PluginStoreState {
  plugins: PluginListItem[];
  loading: boolean;
  error: string | null;
  /** 当前激活的标签页 */
  activeTab: 'official' | 'community' | 'installed';

  // ---- 操作 ----
  fetchPlugins: () => Promise<void>;
  enablePlugin: (id: string) => Promise<void>;
  disablePlugin: (id: string) => Promise<void>;
  uninstallPlugin: (id: string) => Promise<void>;
  setActiveTab: (tab: 'official' | 'community' | 'installed') => void;
}

export const usePluginStore = create<PluginStoreState>((set, get) => ({
  plugins: [],
  loading: false,
  error: null,
  activeTab: 'official',

  fetchPlugins: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/plugins');
      if (!res.ok) throw new Error(`Failed to fetch plugins: ${res.status}`);
      const data = await res.json();
      const plugins = (data.plugins ?? []) as PluginListItem[];
      set({ plugins, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
    }
  },

  enablePlugin: async (id: string) => {
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'enabled' }),
      });
      if (!res.ok) throw new Error(`Failed to enable plugin: ${res.status}`);
      const data = await res.json();
      // 用 API 返回的 data 更新本地状态
      const { plugins } = get();
      set({
        plugins: plugins.map((p) =>
          p.id === id ? { ...p, status: data.plugin?.status ?? 'enabled' } : p
        ),
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
    }
  },

  disablePlugin: async (id: string) => {
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disabled' }),
      });
      if (!res.ok) throw new Error(`Failed to disable plugin: ${res.status}`);
      const data = await res.json();
      const { plugins } = get();
      set({
        plugins: plugins.map((p) =>
          p.id === id ? { ...p, status: data.plugin?.status ?? 'disabled' } : p
        ),
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
    }
  },

  uninstallPlugin: async (id: string) => {
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Failed to uninstall plugin: ${res.status}`);
      const { plugins } = get();
      set({
        plugins: plugins.filter((p) => p.id !== id),
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
}));
