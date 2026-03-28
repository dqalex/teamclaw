/**
 * Workflow Store - Zustand 状态管理
 * v1.1 Phase 2: Workflow 引擎前端状态
 */

import { create } from 'zustand';
import type { Workflow, WorkflowRun } from '@/db/schema';
import type { WorkflowNode } from '@/core/workflow/types';

// ============================================================
// API 辅助函数（避免直接依赖 data-service 的注册）
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
// Store 类型定义
// ============================================================

interface WorkflowState {
  // 数据
  workflows: Workflow[];
  workflowRuns: WorkflowRun[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // 本地操作
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, data: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;

  setWorkflowRuns: (runs: WorkflowRun[]) => void;
  addWorkflowRun: (run: WorkflowRun) => void;
  updateWorkflowRun: (id: string, data: Partial<WorkflowRun>) => void;

  // 查询方法
  getWorkflowsByProject: (projectId: string) => Workflow[];
  getWorkflowRunsByWorkflow: (workflowId: string) => WorkflowRun[];

  // 异步操作 - Workflows
  fetchWorkflows: (projectId?: string) => Promise<void>;
  fetchWorkflow: (id: string) => Promise<void>;
  createWorkflow: (data: {
    name: string;
    description?: string;
    projectId?: string;
    nodes: WorkflowNode[];
    entryNodeId: string;
  }) => Promise<Workflow | null>;
  updateWorkflowAsync: (id: string, data: Partial<Workflow>) => Promise<boolean>;
  deleteWorkflowAsync: (id: string) => Promise<boolean>;

  // 异步操作 - Workflow Runs
  fetchWorkflowRuns: (workflowId?: string, taskId?: string) => Promise<void>;
  fetchWorkflowRun: (id: string) => Promise<void>;
  executeWorkflowRun: (
    id: string,
    action: 'advance' | 'pause' | 'resume' | 'replay',
    nodeOutput?: unknown,
    nodeId?: string,
  ) => Promise<void>;
}

// ============================================================
// 创建 Workflow Store
// ============================================================

export const useWorkflowStore = create<WorkflowState>()((set, get) => ({
  // ==================== 初始状态 ====================
  workflows: [],
  workflowRuns: [],
  loading: false,
  error: null,
  initialized: false,

  // ==================== 本地操作 ====================

  setWorkflows: (workflows) => set({ workflows, initialized: true }),

  addWorkflow: (workflow) => set((state) => ({
    workflows: [...state.workflows, workflow],
  })),

  updateWorkflow: (id, data) => set((state) => ({
    workflows: state.workflows.map((w) => (w.id === id ? { ...w, ...data } : w)),
  })),

  deleteWorkflow: (id) => set((state) => ({
    workflows: state.workflows.filter((w) => w.id !== id),
  })),

  setWorkflowRuns: (runs) => set({ workflowRuns: runs }),

  addWorkflowRun: (run) => set((state) => ({
    workflowRuns: [...state.workflowRuns, run],
  })),

  updateWorkflowRun: (id, data) => set((state) => ({
    workflowRuns: state.workflowRuns.map((r) => (r.id === id ? { ...r, ...data } : r)),
  })),

  // ==================== 查询方法 ====================

  getWorkflowsByProject: (projectId) =>
    get().workflows.filter((w) => w.projectId === projectId),

  getWorkflowRunsByWorkflow: (workflowId) =>
    get().workflowRuns.filter((r) => r.workflowId === workflowId),

  // ==================== 异步操作 - Workflows ====================

  fetchWorkflows: async (projectId) => {
    set({ loading: true, error: null });
    const params = projectId ? `?projectId=${projectId}` : '';
    const { data, error } = await apiRequest<{ data: Workflow[] }>(`/api/workflows${params}`);

    if (error) {
      set({ loading: false, error });
      return;
    }

    const list = data?.data ?? [];
    set({ workflows: list, loading: false, error: null, initialized: true });
  },

  fetchWorkflow: async (id) => {
    set({ loading: true, error: null });
    const { data, error } = await apiRequest<Workflow>(`/api/workflows/${id}`);

    if (error) {
      set({ loading: false, error });
      return;
    }

    // 如果已存在则更新，否则追加
    if (data) {
      set((state) => {
        const exists = state.workflows.find((w) => w.id === id);
        if (exists) {
          return {
            workflows: state.workflows.map((w) => (w.id === id ? data : w)),
            loading: false,
            error: null,
          };
        }
        return {
          workflows: [...state.workflows, data],
          loading: false,
          error: null,
        };
      });
    }
  },

  createWorkflow: async (workflowData) => {
    set({ loading: true, error: null });
    const { data, error } = await apiRequest<Workflow>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowData),
    });

    if (error) {
      set({ loading: false, error });
      return null;
    }

    if (data) {
      // 用 API 返回值更新本地状态
      set((state) => ({
        workflows: [...state.workflows, data],
        loading: false,
        error: null,
      }));
      return data;
    }
    set({ loading: false, error: 'No data returned from server' });
    return null;
  },

  updateWorkflowAsync: async (id, data) => {
    set({ loading: true, error: null });
    const { data: updated, error } = await apiRequest<Workflow>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (error) {
      set({ loading: false, error });
      return false;
    }

    if (updated) {
      // 用 API 返回值更新本地状态
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? updated : w)),
        loading: false,
        error: null,
      }));
    }
    return true;
  },

  deleteWorkflowAsync: async (id) => {
    set({ loading: true, error: null });
    const { error } = await apiRequest(`/api/workflows/${id}`, { method: 'DELETE' });

    if (error) {
      set({ loading: false, error });
      return false;
    }

    // 先 await 成功再移除本地数据
    set((state) => ({
      workflows: state.workflows.filter((w) => w.id !== id),
      workflowRuns: state.workflowRuns.filter((r) => r.workflowId !== id),
      loading: false,
      error: null,
    }));
    return true;
  },

  // ==================== 异步操作 - Workflow Runs ====================

  fetchWorkflowRuns: async (workflowId, taskId) => {
    set({ loading: true, error: null });
    const params = new URLSearchParams();
    if (workflowId) params.set('workflowId', workflowId);
    if (taskId) params.set('taskId', taskId);
    const query = params.toString() ? `?${params.toString()}` : '';

    const { data, error } = await apiRequest<{ data: WorkflowRun[] }>(`/api/workflow-runs${query}`);

    if (error) {
      set({ loading: false, error });
      return;
    }

    const list = data?.data ?? [];
    set({ workflowRuns: list, loading: false, error: null });
  },

  fetchWorkflowRun: async (id) => {
    set({ loading: true, error: null });
    const { data, error } = await apiRequest<WorkflowRun>(`/api/workflow-runs/${id}`);

    if (error) {
      set({ loading: false, error });
      return;
    }

    if (data) {
      set((state) => {
        const exists = state.workflowRuns.find((r) => r.id === id);
        if (exists) {
          return {
            workflowRuns: state.workflowRuns.map((r) => (r.id === id ? data : r)),
            loading: false,
            error: null,
          };
        }
        return {
          workflowRuns: [...state.workflowRuns, data],
          loading: false,
          error: null,
        };
      });
    }
  },

  executeWorkflowRun: async (id, action, nodeOutput, nodeId) => {
    set({ loading: true, error: null });
    const body: Record<string, unknown> = { action };
    if (nodeOutput !== undefined) body.nodeOutput = nodeOutput;
    if (nodeId !== undefined) body.nodeId = nodeId;

    const { data, error } = await apiRequest<Record<string, unknown>>(`/api/workflow-runs/${id}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (error) {
      set({ loading: false, error });
      return;
    }

    if (data) {
      // 用 API 返回值更新本地 workflowRun 状态
      set((state) => ({
        workflowRuns: state.workflowRuns.map((r) =>
          r.id === id
            ? { ...r, status: data.status as WorkflowRun['status'], currentNodeId: data.currentNodeId as string | null }
            : r
        ),
        loading: false,
        error: null,
      }));
    }
  },
}));
