import { create } from 'zustand';

// ============================================================
// Consumer Auth 类型定义（前端独立，不依赖后端 schema）
// ============================================================

export interface Consumer {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  tier: 'free' | 'pro' | 'enterprise';
  credits: number;
}

interface ConsumerAuthState {
  // 数据
  consumer: Consumer | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // 异步操作
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

// Token 存储 key
const TOKEN_KEY = 'consumer_token';

// ============================================================
// 创建 Consumer Auth Store
// ============================================================
export const useConsumerAuthStore = create<ConsumerAuthState>()((set, get) => ({
  // ==================== 初始状态 ====================
  consumer: null,
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  loading: false,
  error: null,
  initialized: false,

  // ==================== 异步操作 ====================
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/consumer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.error || 'Login failed' });
        return;
      }
      // 用 API 返回的 token 和 consumer 更新状态
      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        consumer: data.consumer,
        token: data.token,
        loading: false,
        error: null,
        initialized: true,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/consumer/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.error || 'Registration failed' });
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        consumer: data.consumer,
        token: data.token,
        loading: false,
        error: null,
        initialized: true,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      consumer: null,
      token: null,
      error: null,
      initialized: true,
    });
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) {
      set({ initialized: true });
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/consumer/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        // token 无效，清除登录状态
        localStorage.removeItem(TOKEN_KEY);
        set({ consumer: null, token: null, loading: false, error: null, initialized: true });
        return;
      }
      set({
        consumer: data.consumer || data,
        loading: false,
        error: null,
        initialized: true,
      });
    } catch {
      // 网络错误不清除 token，下次重试
      set({ loading: false, initialized: true });
    }
  },
}));
