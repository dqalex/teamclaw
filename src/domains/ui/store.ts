import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storeEvents } from '@/lib/store-events';

// 导航分组定义
export type NavSection = 'dashboard' | 'projects' | 'assets' | 'automation' | 'collaboration' | 'operations' | 'settings';

interface UIState {
  sidebarOpen: boolean;
  chatOpen: boolean;
  theme: 'light' | 'dark';
  hydrated: boolean;
  expandedProjects: string[];
  /** 当前激活的导航分组，驱动顶部子导航切换 */
  activeNavSection: NavSection;
  toggleSidebar: () => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setHydrated: (hydrated: boolean) => void;
  toggleProjectExpand: (projectId: string) => void;
  expandProject: (projectId: string) => void;
  setActiveNavSection: (section: NavSection) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      chatOpen: false,
      theme: 'light',
      hydrated: false,
      expandedProjects: [],
      activeNavSection: 'assets' as NavSection,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
      setChatOpen: (open) => set({ chatOpen: open }),
      setTheme: (theme) => set({ theme }),
      setHydrated: (hydrated) => set({ hydrated }),
      toggleProjectExpand: (projectId) => set((state) => {
        const expanded = state.expandedProjects;
        if (expanded.includes(projectId)) {
          return { expandedProjects: expanded.filter(id => id !== projectId) };
        }
        return { expandedProjects: [...expanded, projectId] };
      }),
      expandProject: (projectId) => set((state) => {
        if (state.expandedProjects.includes(projectId)) return state;
        return { expandedProjects: [...state.expandedProjects, projectId] };
      }),
      setActiveNavSection: (section) => set({ activeNavSection: section }),
    }),
    {
      name: 'teamclaw-ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        expandedProjects: state.expandedProjects,
        activeNavSection: state.activeNavSection,
      }),
      onRehydrateStorage: () => (state) => {
        // rehydration 完成后标记 hydrated
        useUIStore.setState({ hydrated: true });
      },
    }
  )
);

// 双重保险：使用 persist API 的 onFinishHydration 订阅
// 如果 onRehydrateStorage 回调未触发（Next.js App Router 下的已知问题），
// 这里确保 hydrated 最终会被设为 true
if (typeof window !== 'undefined') {
  // 方式 1: persist.onFinishHydration 订阅
  useUIStore.persist.onFinishHydration(() => {
    if (!useUIStore.getState().hydrated) {
      useUIStore.setState({ hydrated: true });
    }
  });

  // 方式 2: 如果已经 hydrated 过了（页面刷新时 persist 可能同步完成），直接标记
  if (useUIStore.persist.hasHydrated() && !useUIStore.getState().hydrated) {
    useUIStore.setState({ hydrated: true });
  }

  // 方式 3: 终极 fallback — 500ms 后如果仍未 hydrated，强制标记
  setTimeout(() => {
    if (!useUIStore.getState().hydrated) {
      console.warn('[UIStore] hydration timeout, forcing hydrated=true');
      useUIStore.setState({ hydrated: true });
    }
  }, 500);

  // v3.0 Phase F: 订阅 Store 事件
  storeEvents.on('ui:chatOpen', (payload) => {
    useUIStore.getState().setChatOpen(payload.open);
  });
}
