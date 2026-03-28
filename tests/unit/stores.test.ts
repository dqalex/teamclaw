/**
 * Store 模块单元测试
 * 测试 task/document/member/project store 的核心逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Task, Document, MemberWithRole, Project } from '@/db/schema';

// ============================================================
// Mock API 响应
// ============================================================
const mockApiResponse = <T>(data: T) => Promise.resolve({ data, error: undefined });
const mockApiError = (error: string) => Promise.resolve({ data: undefined, error });

// Mock data-service
vi.mock('@/lib/data-service', () => ({
  tasksApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  documentsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  membersApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  projectsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock zustand persist
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

// ============================================================
// 测试数据工厂 — 保证必填字段完整
// ============================================================
const now = new Date();

const makeTask = (overrides: Record<string, unknown> = {}): Task => ({
  id: 't1',
  title: 'Test Task',
  description: null,
  source: 'local',
  projectId: null,
  milestoneId: null,
  assignees: [],
  creatorId: 'test-user',
  status: 'todo',
  priority: 'medium',
  progress: null,
  deadline: null,
  checkItems: [],
  attachments: [],
  parentTaskId: null,
  crossProjects: [],
  sopTemplateId: null,
  currentStageId: null,
  stageHistory: [],
  sopInputs: null,
  estimatedValue: null,
  actualValue: null,
  tokenCost: 0,
  costBreakdown: null,
  workflowId: null,
  workflowRunId: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
} as Task);

const makeDoc = (overrides: Record<string, unknown> = {}): Document => ({
  id: 'd1',
  title: 'Test Doc',
  content: '',
  source: 'local',
  type: 'note',
  projectId: null,
  projectTags: [],
  externalPlatform: null,
  externalId: null,
  externalUrl: null,
  mcpServer: null,
  lastSync: null,
  syncMode: null,
  links: [],
  backlinks: [],
  renderMode: null,
  renderTemplateId: null,
  htmlContent: null,
  slotData: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
} as Document);

const makeMember = (overrides: Record<string, unknown> = {}): MemberWithRole => ({
  id: 'm1',
  name: 'Test Member',
  type: 'human',
  email: null,
  avatar: null,
  online: false,
  userId: null,
  teamId: null,
  openclawName: null,
  openclawDeployMode: null,
  openclawEndpoint: null,
  openclawConnectionStatus: null,
  openclawLastHeartbeat: null,
  openclawGatewayUrl: null,
  openclawAgentId: null,
  openclawApiToken: null,
  openclawModel: null,
  openclawEnableWebSearch: false,
  openclawTemperature: null,
  configSource: 'manual',
  executionMode: 'chat_only',
  experienceTaskCount: 0,
  experienceTaskTypes: null,
  experienceTools: null,
  userRole: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
} as MemberWithRole);

const makeProject = (overrides: Record<string, unknown> = {}): Project => ({
  id: 'p1',
  name: 'Test Project',
  description: null,
  source: 'local',
  ownerId: null,
  visibility: 'private',
  knowledgeConfig: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
} as Project);

// ============================================================
// Task Store Tests
// ============================================================
describe('useTaskStore', () => {
  let useTaskStore: typeof import('@/domains/task').useTaskStore;
  let tasksApi: typeof import('@/lib/data-service').tasksApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const dataService = await import('@/lib/data-service');
    tasksApi = dataService.tasksApi;
    
    const store = await import('@/domains/task');
    useTaskStore = store.useTaskStore;
    
    // Reset store
    useTaskStore.setState({ tasks: [], loading: false, error: null });
  });

  describe('本地操作', () => {
    it('setTasks 应该更新任务列表', () => {
      const { setTasks } = useTaskStore.getState();
      setTasks([makeTask()]);
      expect(useTaskStore.getState().tasks).toHaveLength(1);
    });

    it('addTask 应该追加任务', () => {
      const { setTasks, addTask } = useTaskStore.getState();
      setTasks([]);
      addTask(makeTask());
      expect(useTaskStore.getState().tasks).toHaveLength(1);
    });

    it('updateTask 应该更新指定任务', () => {
      const { setTasks, updateTask } = useTaskStore.getState();
      setTasks([makeTask({ title: 'Old' })]);
      updateTask('t1', { title: 'New' });
      expect(useTaskStore.getState().tasks[0].title).toBe('New');
    });

    it('deleteTask 应该删除指定任务', () => {
      const { setTasks, deleteTask } = useTaskStore.getState();
      setTasks([makeTask({ id: 't1' }), makeTask({ id: 't2' })]);
      deleteTask('t1');
      expect(useTaskStore.getState().tasks).toHaveLength(1);
      expect(useTaskStore.getState().tasks[0].id).toBe('t2');
    });
  });

  describe('派生查询', () => {
    it('getTasksByProject 应该返回项目任务', () => {
      const { setTasks, getTasksByProject } = useTaskStore.getState();
      setTasks([
        makeTask({ id: 't1', projectId: 'p1', title: 'P1 Task' }),
        makeTask({ id: 't2', projectId: 'p2', title: 'P2 Task' }),
      ]);
      const result = getTasksByProject('p1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });

    it('getTasksByMember 应该返回成员任务', () => {
      const { setTasks, getTasksByMember } = useTaskStore.getState();
      setTasks([
        makeTask({ id: 't1', assignees: ['m1'], title: 'M1 Task' }),
        makeTask({ id: 't2', assignees: ['m2'], title: 'M2 Task' }),
      ]);
      const result = getTasksByMember('m1');
      expect(result).toHaveLength(1);
    });

    it('getGlobalTasks 应该返回无项目任务', () => {
      const { setTasks, getGlobalTasks } = useTaskStore.getState();
      setTasks([
        makeTask({ id: 't1', projectId: null, title: 'Global' }),
        makeTask({ id: 't2', projectId: 'p1', title: 'Project' }),
      ]);
      const result = getGlobalTasks();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });

    it('getCrossProjectTasks 应该返回跨项目任务', () => {
      const { setTasks, getCrossProjectTasks } = useTaskStore.getState();
      setTasks([
        makeTask({ id: 't1', crossProjects: ['p1', 'p2'], title: 'Cross' }),
        makeTask({ id: 't2', crossProjects: ['p3'], title: 'Other' }),
      ]);
      const result = getCrossProjectTasks('p1');
      expect(result).toHaveLength(1);
    });
  });

  describe('异步操作', () => {
    it('fetchTasks 成功应该更新 tasks', async () => {
      const mockTasks = [makeTask()];
      (tasksApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockTasks, error: undefined });

      const { fetchTasks } = useTaskStore.getState();
      await fetchTasks();

      expect(useTaskStore.getState().tasks).toEqual(mockTasks);
      expect(useTaskStore.getState().loading).toBe(false);
    });

    it('fetchTasks 失败应该设置 error', async () => {
      (tasksApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined, error: 'Network error' });

      const { fetchTasks } = useTaskStore.getState();
      await fetchTasks();

      expect(useTaskStore.getState().error).toBe('Network error');
    });

    it('createTask 成功应该添加任务', async () => {
      const newTask = makeTask();
      (tasksApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({ data: newTask, error: undefined });

      const { createTask } = useTaskStore.getState();
      const result = await createTask({ title: 'New', creatorId: 'test-user', status: 'todo', priority: 'medium' });

      expect(result).toEqual(newTask);
      expect(useTaskStore.getState().tasks).toContainEqual(newTask);
    });

    it('updateTaskAsync 成功应该更新任务', async () => {
      const updated = makeTask({ title: 'Updated', status: 'completed' });
      (tasksApi.update as ReturnType<typeof vi.fn>).mockResolvedValue({ data: updated, error: undefined });
      
      useTaskStore.setState({ tasks: [makeTask()] });

      const { updateTaskAsync } = useTaskStore.getState();
      const result = await updateTaskAsync('t1', { status: 'completed' });

      expect(result).toBe(true);
      expect(useTaskStore.getState().tasks[0].status).toBe('completed');
    });

    it('deleteTaskAsync 成功应该删除任务', async () => {
      (tasksApi.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true }, error: undefined });
      useTaskStore.setState({ tasks: [makeTask()] });

      const { deleteTaskAsync } = useTaskStore.getState();
      const result = await deleteTaskAsync('t1');

      expect(result).toBe(true);
      expect(useTaskStore.getState().tasks).toHaveLength(0);
    });
  });
});

// ============================================================
// Document Store Tests
// ============================================================
describe('useDocumentStore', () => {
  let useDocumentStore: typeof import('@/domains/document').useDocumentStore;
  let documentsApi: typeof import('@/lib/data-service').documentsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const dataService = await import('@/lib/data-service');
    documentsApi = dataService.documentsApi;
    
    const store = await import('@/domains/document');
    useDocumentStore = store.useDocumentStore;
    
    useDocumentStore.setState({ documents: [], loading: false, error: null });
  });

  describe('派生查询', () => {
    it('getDocumentsByProject 应该返回项目文档', () => {
      const { setDocuments, getDocumentsByProject } = useDocumentStore.getState();
      setDocuments([
        makeDoc({ id: 'd1', projectId: 'p1', title: 'Doc 1' }),
        makeDoc({ id: 'd2', projectId: 'p2', title: 'Doc 2' }),
      ]);
      const result = getDocumentsByProject('p1');
      expect(result).toHaveLength(1);
    });

    it('getDocumentsByProjectTag 应该返回标签文档', () => {
      const { setDocuments, getDocumentsByProjectTag } = useDocumentStore.getState();
      setDocuments([
        makeDoc({ id: 'd1', projectTags: ['project-alpha'], title: 'Doc 1' }),
        makeDoc({ id: 'd2', projectTags: ['project-beta'], title: 'Doc 2' }),
      ]);
      const result = getDocumentsByProjectTag('project-alpha');
      expect(result).toHaveLength(1);
    });

    it('getUntaggedDocuments 应该返回无标签文档', () => {
      const { setDocuments, getUntaggedDocuments } = useDocumentStore.getState();
      setDocuments([
        makeDoc({ id: 'd1', projectId: null, projectTags: [], title: 'Untagged' }),
        makeDoc({ id: 'd2', projectId: 'p1', title: 'Tagged' }),
      ]);
      const result = getUntaggedDocuments();
      expect(result).toHaveLength(1);
    });
  });

  describe('异步操作', () => {
    it('fetchDocuments 成功应该更新 documents', async () => {
      const mockDocs = [makeDoc()];
      (documentsApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocs, error: undefined });

      const { fetchDocuments } = useDocumentStore.getState();
      await fetchDocuments();

      expect(useDocumentStore.getState().documents).toEqual(mockDocs);
    });
  });
});

// ============================================================
// Member Store Tests
// ============================================================
describe('useMemberStore', () => {
  let useMemberStore: typeof import('@/domains/member').useMemberStore;
  let membersApi: typeof import('@/lib/data-service').membersApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const dataService = await import('@/lib/data-service');
    membersApi = dataService.membersApi;
    
    const store = await import('@/domains/member');
    useMemberStore = store.useMemberStore;
    
    useMemberStore.setState({ members: [], currentMemberId: null, loading: false, error: null });
  });

  describe('派生查询', () => {
    it('getHumanMembers 应该返回人类成员', () => {
      const { setMembers, getHumanMembers } = useMemberStore.getState();
      setMembers([
        makeMember({ id: 'm1', name: 'Human', type: 'human' }),
        makeMember({ id: 'm2', name: 'AI', type: 'ai' }),
      ]);
      const result = getHumanMembers();
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('human');
    });

    it('getAIMembers 应该返回 AI 成员', () => {
      const { setMembers, getAIMembers } = useMemberStore.getState();
      setMembers([
        makeMember({ id: 'm1', name: 'Human', type: 'human' }),
        makeMember({ id: 'm2', name: 'AI', type: 'ai' }),
      ]);
      const result = getAIMembers();
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ai');
    });
  });

  describe('currentMemberId', () => {
    it('setCurrentMember 应该更新当前成员', () => {
      const { setCurrentMember } = useMemberStore.getState();
      setCurrentMember('m1');
      expect(useMemberStore.getState().currentMemberId).toBe('m1');
    });
  });
});

// ============================================================
// Project Store Tests
// ============================================================
describe('useProjectStore', () => {
  let useProjectStore: typeof import('@/domains/project').useProjectStore;
  let projectsApi: typeof import('@/lib/data-service').projectsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const dataService = await import('@/lib/data-service');
    projectsApi = dataService.projectsApi;
    
    const store = await import('@/domains/project');
    useProjectStore = store.useProjectStore;
    
    useProjectStore.setState({ projects: [], currentProjectId: null, loading: false, error: null, initialized: false });
  });

  describe('本地操作', () => {
    it('setProjects 应该设置 initialized', () => {
      const { setProjects } = useProjectStore.getState();
      setProjects([makeProject()]);
      expect(useProjectStore.getState().initialized).toBe(true);
    });

    it('setCurrentProject 应该更新当前项目', () => {
      const { setCurrentProject } = useProjectStore.getState();
      setCurrentProject('p1');
      expect(useProjectStore.getState().currentProjectId).toBe('p1');
    });
  });

  describe('异步操作', () => {
    it('fetchProjects 成功应该更新 projects', async () => {
      const mockProjects = [makeProject()];
      (projectsApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockProjects, error: undefined });

      const { fetchProjects } = useProjectStore.getState();
      await fetchProjects();

      expect(useProjectStore.getState().projects).toEqual(mockProjects);
      expect(useProjectStore.getState().initialized).toBe(true);
    });

    it('createProject 成功应该添加项目', async () => {
      const newProject = makeProject({ name: 'New Project' });
      (projectsApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({ data: newProject, error: undefined });

      const { createProject } = useProjectStore.getState();
      const result = await createProject({ name: 'New Project' });

      expect(result).toEqual(newProject);
      expect(useProjectStore.getState().projects).toContainEqual(newProject);
    });

    it('deleteProjectAsync 成功应该删除项目', async () => {
      (projectsApi.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true }, error: undefined });
      useProjectStore.setState({ projects: [makeProject()] });

      const { deleteProjectAsync } = useProjectStore.getState();
      const result = await deleteProjectAsync('p1');

      expect(result).toBe(true);
      expect(useProjectStore.getState().projects).toHaveLength(0);
    });
  });
});
