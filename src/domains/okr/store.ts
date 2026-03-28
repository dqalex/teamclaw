/**
 * OKR Store - Zustand store for Objectives and Key Results
 */

import { create } from 'zustand';
import { apiRequest } from '@/shared/lib/data-service';

// ============================================================
// 类型定义
// ============================================================

export interface KeyResultItem {
  id: string;
  objectiveId: string;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue: number;
  unit?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveItem {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  progress: number;
  dueDate?: string | null;
  status: string;
  keyResults?: KeyResultItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OkrState {
  objectives: ObjectiveItem[];
  loading: boolean;
  error: string | null;

  // 异步操作
  fetchObjectives: (projectId: string, status?: string) => Promise<void>;
  createObjective: (data: { projectId: string; title: string; description?: string; dueDate?: string }) => Promise<ObjectiveItem>;
  updateObjective: (id: string, data: Partial<ObjectiveItem>) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;
  createKeyResult: (data: { objectiveId: string; title: string; targetValue: number; unit?: string; description?: string }) => Promise<KeyResultItem>;
  updateKeyResult: (id: string, data: { currentValue?: number; status?: string }) => Promise<void>;
  deleteKeyResult: (id: string) => Promise<void>;
}

// ============================================================
// 创建 OKR Store
// ============================================================
export const useOkrStore = create<OkrState>()((set, get) => ({
  objectives: [],
  loading: false,
  error: null,

  fetchObjectives: async (projectId, status) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams({ project_id: projectId });
      if (status) params.set('status', status);
      const { data, error } = await apiRequest<ObjectiveItem[]>(
        `/api/okr/objectives?${params.toString()}`
      );
      if (error) {
        set({ loading: false, error });
      } else {
        set({ objectives: data || [], loading: false });
      }
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  createObjective: async (data) => {
    const { data: created, error } = await apiRequest<ObjectiveItem>('/api/okr/objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: data.projectId,
        title: data.title,
        description: data.description,
        due_date: data.dueDate,
      }),
    });
    if (error) throw new Error(error);
    const objective = created!;
    set((state) => ({ objectives: [...state.objectives, objective] }));
    return objective;
  },

  updateObjective: async (id, data) => {
    const { data: updated, error } = await apiRequest<ObjectiveItem>(`/api/okr/objectives/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (error) throw new Error(error);
    set((state) => ({
      objectives: state.objectives.map((o) => (o.id === id ? { ...o, ...updated } : o)),
    }));
  },

  deleteObjective: async (id) => {
    const { error } = await apiRequest(`/api/okr/objectives/${id}`, { method: 'DELETE' });
    if (error) throw new Error(error);
    set((state) => ({ objectives: state.objectives.filter((o) => o.id !== id) }));
  },

  createKeyResult: async (data) => {
    const { data: created, error } = await apiRequest<KeyResultItem>('/api/okr/key-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objective_id: data.objectiveId,
        title: data.title,
        targetValue: data.targetValue,
        unit: data.unit,
        description: data.description,
      }),
    });
    if (error) throw new Error(error);
    const kr = created!;
    // 更新本地 objective 的 keyResults
    set((state) => ({
      objectives: state.objectives.map((o) =>
        o.id === data.objectiveId ? { ...o, keyResults: [...(o.keyResults || []), kr] } : o
      ),
    }));
    return kr;
  },

  updateKeyResult: async (id, data) => {
    const { data: updated, error } = await apiRequest<KeyResultItem>(`/api/okr/key-results/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (error) throw new Error(error);
    const kr = updated!;
    // 更新本地 objective 的 keyResults 和 progress
    set((state) => ({
      objectives: state.objectives.map((o) => {
        if (!o.keyResults?.some((k) => k.id === id)) return o;
        return {
          ...o,
          keyResults: o.keyResults.map((k) => (k.id === id ? kr : k)),
          progress: kr.objectiveId === o.id ? Math.round(
            (o.keyResults || []).reduce((sum, k) => {
              const item = k.id === id ? kr : k;
              const ratio = item.targetValue > 0 ? Math.min(item.currentValue / item.targetValue, 1) : 0;
              return sum + ratio * 100;
            }, 0) / (o.keyResults || []).length
          ) : o.progress,
        };
      }),
    }));
  },

  deleteKeyResult: async (id) => {
    // 先找到所属 objective
    const objective = get().objectives.find((o) => o.keyResults?.some((k) => k.id === id));
    const { error } = await apiRequest(`/api/okr/key-results/${id}`, { method: 'DELETE' });
    if (error) throw new Error(error);
    set((state) => ({
      objectives: state.objectives.map((o) => {
        if (!o.keyResults?.some((k) => k.id === id)) return o;
        const newKRs = o.keyResults.filter((k) => k.id !== id);
        return { ...o, keyResults: newKRs };
      }),
    }));
  },
}));
