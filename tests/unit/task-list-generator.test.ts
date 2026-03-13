/**
 * 任务列表生成器 单元测试
 *
 * 由于 refreshTaskList 涉及复杂的 DB + FS 依赖，
 * 此测试通过 mock 方式验证主流程和边界条件。
 *
 * 测试覆盖：
 * 1. workspace 不存在/路径无效/无成员 — 返回 false
 * 2. 正常流程 — 写入文件并返回 true
 *
 * 运行方式：
 * npx vitest run tests/unit/task-list-generator.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================
// Mock fs
// ============================================================

const mockExistsSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  readFileSync: vi.fn(),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
}));

// ============================================================
// Mock crypto
// ============================================================

let hashCounter = 0;
vi.mock('crypto', () => ({
  createHash: () => ({
    update: () => ({
      digest: () => `hash_${++hashCounter}`,
    }),
  }),
}));

// ============================================================
// Mock DB — 按调用序号返回队列
// ============================================================

let dbQueryQueue: unknown[][] = [];
let dbQueryIndex = 0;

function nextDbResult() {
  const result = dbQueryQueue[dbQueryIndex] ?? [];
  dbQueryIndex++;
  return result;
}

vi.mock('@/db', () => {
  // 创建一个既可以链式调用又可以直接 await 的对象
  function createChain(): Record<string, unknown> {
    let currentResult: unknown[] = [];
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.from = vi.fn(() => {
      currentResult = nextDbResult();
      return chain;
    });
    chain.where = vi.fn(() => Promise.resolve(currentResult));
    chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(currentResult).then(resolve, reject);
    return chain;
  }

  return {
    db: {
      select: vi.fn(() => {
        const chain = createChain();
        return chain;
      }),
    },
  };
});

vi.mock('@/db/schema', () => ({
  openclawWorkspaces: { id: 'id' },
  tasks: {},
  members: {},
  projects: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn(),
}));

// ============================================================
// 测试
// ============================================================

describe('任务列表生成器', () => {
  let refreshTaskList: typeof import('@/lib/openclaw/task-list-generator').refreshTaskList;

  beforeEach(async () => {
    vi.clearAllMocks();
    dbQueryQueue = [];
    dbQueryIndex = 0;
    hashCounter = 0;
    // 清除全局 hash 缓存
    const g = globalThis as Record<string, unknown>;
    delete g['__teamclaw_task_list_hashes__'];

    vi.resetModules();
    const mod = await import('@/lib/openclaw/task-list-generator');
    refreshTaskList = mod.refreshTaskList;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('workspace 不存在时应返回 false', async () => {
    dbQueryQueue = [[]]; // workspace 查询返回空
    const result = await refreshTaskList('ws_notexist');
    expect(result).toBe(false);
  });

  it('workspace 路径不存在时应返回 false', async () => {
    dbQueryQueue = [[{
      id: 'ws_1',
      path: '/nonexistent/path',
      memberId: 'mem_1',
    }]];
    mockExistsSync.mockReturnValue(false);

    const result = await refreshTaskList('ws_1');
    expect(result).toBe(false);
  });

  it('无绑定成员时应返回 false', async () => {
    dbQueryQueue = [[{
      id: 'ws_1',
      path: '/valid/path',
      memberId: null,
    }]];
    mockExistsSync.mockReturnValue(true);

    const result = await refreshTaskList('ws_1');
    expect(result).toBe(false);
  });

  it('正常流程应写入文件并返回 true', async () => {
    const now = new Date();

    dbQueryQueue = [
      // 1. workspace 查询
      [{ id: 'ws_1', path: '/workspace', memberId: 'mem_1' }],
      // 2. queryMemberTasks: member 查询
      [{ name: 'Alex' }],
      // 3. queryMemberTasks: tasks 查询
      [{
        id: 'task_1', title: '做功能', status: 'in_progress',
        priority: 'high', progress: 50, projectId: 'proj_1',
        deadline: null, checkItems: [], updatedAt: now,
      }],
      // 4. queryMemberTasks: projects 查询
      [{ id: 'proj_1', name: 'P1' }],
      // 5. queryMemberDoneTasks: member 查询
      [{ name: 'Alex' }],
      // 6. queryMemberDoneTasks: tasks 查询
      [],
      // 7. queryMemberDoneTasks: projects 查询
      [],
    ];

    mockExistsSync.mockReturnValue(true);

    const result = await refreshTaskList('ws_1');
    expect(result).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);

    // 验证 TODO.md 内容
    const todoContent = mockWriteFileSync.mock.calls[0][1] as string;
    expect(todoContent).toContain('做功能');
    expect(todoContent).toContain('Alex');

    // 验证 DONE.md 内容
    const doneContent = mockWriteFileSync.mock.calls[1][1] as string;
    expect(doneContent).toContain('Alex');
    expect(doneContent).toContain('近 24 小时内没有完成的任务');
  });

  it('tasks 目录不存在时应创建', async () => {
    dbQueryQueue = [
      [{ id: 'ws_1', path: '/workspace', memberId: 'mem_1' }],
      [{ name: 'Alex' }], [], [],
      [{ name: 'Alex' }], [], [],
    ];

    mockExistsSync.mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('tasks')) return false;
      return true;
    });

    await refreshTaskList('ws_1');
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('tasks'),
      expect.objectContaining({ recursive: true })
    );
  });
});
