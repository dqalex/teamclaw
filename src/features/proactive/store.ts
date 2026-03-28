/**
 * Proactive Rules Store
 * 管理主动规则 CRUD 操作，扩展 useProactiveStore 的规则管理能力
 */

import { create } from 'zustand';
import { eventBus } from '@/shared/lib/event-bus';

// ============================================================
// 类型定义
// ============================================================

interface ProactiveRule {
  id: string;
  name: string;
  triggerType: string;
  config: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high';
  enabled: boolean;
  cooldownMinutes: number;
  projectId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// API 辅助函数
// ============================================================

type ApiResponse<T> = { data?: T; error?: string };

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Request timeout (30s)' };
    }
    return { error: err instanceof Error ? err.message : 'Network request failed' };
  }
}

// ============================================================
// Store 定义
// ============================================================

interface ProactiveRulesState {
  // 数据
  rules: ProactiveRule[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // 异步操作
  fetchRules: (projectId?: string) => Promise<void>;
  createRule: (data: {
    name: string;
    triggerType: string;
    priority: 'low' | 'medium' | 'high';
    enabled: boolean;
    cooldownMinutes: number;
    config: Record<string, unknown>;
    projectId?: string;
  }) => Promise<ProactiveRule | null>;
  updateRule: (id: string, data: Partial<ProactiveRule>) => Promise<boolean>;
  deleteRule: (id: string) => Promise<boolean>;
  toggleEnabled: (id: string, enabled: boolean) => Promise<void>;
}

// ============================================================
// Store 实现
// ============================================================

export const useProactiveRulesStore = create<ProactiveRulesState>()((set, get) => ({
  rules: [],
  loading: false,
  error: null,
  initialized: false,

  fetchRules: async (projectId) => {
    set({ loading: true, error: null });
    const params = projectId ? `?project_id=${projectId}` : '';
    const { data, error } = await apiRequest<ProactiveRule[]>(`/api/proactive/rules${params}`);

    if (error) {
      set({ loading: false, error });
      return;
    }

    const list = Array.isArray(data) ? data : [];
    set({ rules: list, loading: false, error: null, initialized: true });
  },

  createRule: async (ruleData) => {
    set({ loading: true, error: null });
    const { data, error } = await apiRequest<ProactiveRule>('/api/proactive/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    });

    if (error) {
      set({ loading: false, error });
      return null;
    }

    if (data) {
      set((state) => ({
        rules: [...state.rules, data],
        loading: false,
        error: null,
      }));
      return data;
    }
    set({ loading: false, error: 'No data returned from server' });
    return null;
  },

  updateRule: async (id, data) => {
    set({ loading: true, error: null });
    const { data: updated, error } = await apiRequest<ProactiveRule>(`/api/proactive/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (error) {
      set({ loading: false, error });
      return false;
    }

    if (updated) {
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updated : r)),
        loading: false,
        error: null,
      }));
    }
    return true;
  },

  deleteRule: async (id) => {
    set({ loading: true, error: null });
    const { error } = await apiRequest(`/api/proactive/rules/${id}`, { method: 'DELETE' });

    if (error) {
      set({ loading: false, error });
      return false;
    }

    set((state) => ({
      rules: state.rules.filter((r) => r.id !== id),
      loading: false,
      error: null,
    }));
    return true;
  },

  toggleEnabled: async (id, enabled) => {
    // 乐观更新
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === id ? { ...r, enabled, updatedAt: new Date().toISOString() } : r
      ),
    }));

    const { error } = await apiRequest(`/api/proactive/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });

    if (error) {
      // 回滚
      set((state) => ({
        rules: state.rules.map((r) =>
          r.id === id ? { ...r, enabled: !enabled } : r
        ),
      }));
    }
  },
}));
