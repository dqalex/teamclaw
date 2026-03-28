import { create } from 'zustand';

// ============================================================
// Marketplace 类型定义（前端独立）
// ============================================================

export interface Service {
  id: string;
  aiAppId?: string;
  teamId?: string;
  name: string;
  description?: string;
  pricingModel: 'free' | 'credits' | 'subscription' | 'one_time';
  priceCredits?: number;
  status: string;
  popularityScore?: number;
  effectivenessScore?: number;
  averageRating?: number;
  ratingCount?: number;
  rankWeight?: number;
  totalUsageTokens?: number;
  totalUsageRequests?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface MarketplaceState {
  // 数据
  services: Service[];
  currentService: Service | null;
  total: number;
  loading: boolean;
  error: string | null;

  // 异步操作
  fetchServices: (params?: {
    search?: string;
    category?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  fetchService: (id: string) => Promise<void>;
  submitRating: (serviceId: string, rating: number, feedback?: string) => Promise<void>;
  activateService: (serviceId: string, key: string) => Promise<void>;
  subscribeService: (serviceId: string, plan: string) => Promise<void>;
}

// ============================================================
// 辅助函数：获取 Consumer token
// ============================================================
function getConsumerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('consumer_token');
}

// ============================================================
// 创建 Marketplace Store
// ============================================================
export const useMarketplaceStore = create<MarketplaceState>()((set) => ({
  // ==================== 初始状态 ====================
  services: [],
  currentService: null,
  total: 0,
  loading: false,
  error: null,

  // ==================== 异步操作 ====================
  fetchServices: async (params) => {
    set({ loading: true, error: null });
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));

      const query = searchParams.toString();
      const url = `/api/marketplace/services${query ? `?${query}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        set({ loading: false, error: data.error || 'Failed to fetch services' });
        return;
      }

      set({
        services: data.services || [],
        total: data.total || 0,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  fetchService: async (id: string) => {
    set({ loading: true, error: null, currentService: null });
    try {
      const res = await fetch(`/api/marketplace/services/${id}`);
      const data = await res.json();

      if (!res.ok) {
        set({ loading: false, error: data.error || 'Failed to fetch service' });
        return;
      }

      // API 可能直接返回 service 对象，或 { service: ... }
      const service = data.service || data;
      set({
        currentService: service,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  submitRating: async (serviceId: string, rating: number, feedback?: string) => {
    set({ loading: true, error: null });
    try {
      const token = getConsumerToken();
      if (!token) {
        set({ loading: false, error: 'Authentication required' });
        return;
      }

      const body: Record<string, unknown> = { rating };
      if (feedback) body.feedback = feedback;

      const res = await fetch(`/api/marketplace/services/${serviceId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.error || 'Failed to submit rating' });
        return;
      }

      // 更新本地 currentService 的评分数据
      set((state) => ({
        currentService: state.currentService
          ? { ...state.currentService, averageRating: rating, ratingCount: (state.currentService.ratingCount || 0) + 1 }
          : null,
        loading: false,
        error: null,
      }));
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  activateService: async (serviceId: string, key: string) => {
    set({ loading: true, error: null });
    try {
      const token = getConsumerToken();
      if (!token) {
        set({ loading: false, error: 'Authentication required' });
        return;
      }

      const res = await fetch(`/api/marketplace/services/${serviceId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.error || 'Activation failed' });
        return;
      }

      set({ loading: false, error: null });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  subscribeService: async (serviceId: string, plan: string) => {
    set({ loading: true, error: null });
    try {
      const token = getConsumerToken();
      if (!token) {
        set({ loading: false, error: 'Authentication required' });
        return;
      }

      const res = await fetch(`/api/marketplace/services/${serviceId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.error || 'Subscription failed' });
        return;
      }

      set({ loading: false, error: null });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },
}));
