import { create } from 'zustand';
import { apiRequest } from '@/shared/lib/data-service';

interface ProactiveEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  status: string;
  projectId?: string;
  createdAt: string;
  actedAt?: string;
}

interface EventLog {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId?: string;
  tokenCount?: number;
  tokenCost?: number;
  projectId?: string;
  createdAt: string;
}

interface AnalyticsSummary {
  totalTokens: number;
  totalCost: number;
  taskCount: number;
  completedTasks: number;
  eventCount: number;
  agentStats: Array<{
    agentId: string;
    agentName: string;
    tokenCount: number;
    completedTasks: number;
  }>;
  periodStart: string;
  periodEnd: string;
}

interface ProactiveState {
  events: ProactiveEvent[];
  eventLogs: EventLog[];
  analytics: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
  fetchEvents: (params?: { status?: string; severity?: string; projectId?: string; limit?: number }) => Promise<void>;
  dismissEvent: (eventId: string, reason?: string) => Promise<void>;
  fetchAnalytics: (params?: { projectId?: string; period?: string; groupBy?: string }) => Promise<void>;
  fetchEventLogs: (params?: { entityType?: string; projectId?: string; limit?: number }) => Promise<void>;
  recordEventLog: (data: { eventType: string; entityType: string; entityId: string; actorType: string; actorId?: string; tokenCount?: number; tokenCost?: number; projectId?: string }) => Promise<void>;
}

export const useProactiveStore = create<ProactiveState>((set, get) => ({
  events: [],
  eventLogs: [],
  analytics: null,
  loading: false,
  error: null,

  fetchEvents: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.severity) query.set('severity', params.severity);
      if (params.projectId) query.set('project_id', params.projectId);
      if (params.limit) query.set('limit', String(params.limit));
      const { data } = await apiRequest<ProactiveEvent[]>(`/api/proactive/events?${query}`);
      set({ events: data || [], loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  dismissEvent: async (eventId, reason) => {
    try {
      await apiRequest(`/api/proactive/events/${eventId}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      set({ events: get().events.filter(e => e.id !== eventId) });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchAnalytics: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params.projectId) query.set('project_id', params.projectId);
      if (params.period) query.set('period', params.period);
      if (params.groupBy) query.set('group_by', params.groupBy);
      const { data } = await apiRequest<AnalyticsSummary>(`/api/analytics/summary?${query}`);
      set({ analytics: data || null, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchEventLogs: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params.entityType) query.set('entity_type', params.entityType);
      if (params.projectId) query.set('project_id', params.projectId);
      if (params.limit) query.set('limit', String(params.limit));
      const { data } = await apiRequest<EventLog[]>(`/api/event-logs?${query}`);
      set({ eventLogs: data || [], loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  recordEventLog: async (data) => {
    try {
      await apiRequest('/api/event-logs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error('Failed to record event log:', err);
    }
  },
}));
