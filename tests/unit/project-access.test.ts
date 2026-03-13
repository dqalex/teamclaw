/**
 * 项目访问控制 单元测试
 *
 * 测试覆盖：
 * 1. checkProjectAccess — Admin/Owner/协作者/公开/无权限
 * 2. getAccessibleProjectIds — 项目列表访问过滤
 * 3. addProjectMember / removeProjectMember / updateProjectMemberRole
 *
 * 使用动态导入 + vi.mock 策略隔离 DB 依赖
 *
 * 运行方式：
 * npx vitest run tests/unit/project-access.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================
// Mock 数据
// ============================================================

const MOCK_PROJECT = {
  id: 'proj_1',
  ownerId: 'user_owner',
  visibility: 'private',
};

const MOCK_PUBLIC_PROJECT = {
  id: 'proj_pub',
  ownerId: 'user_other',
  visibility: 'public',
};

const MOCK_MEMBERSHIP = {
  role: 'member',
};

// ============================================================
// Mock DB
// ============================================================

// ============================================================
// Mock DB — 基于调用次序的链式查询 mock
// ============================================================

/** 按调用顺序返回不同结果的队列 */
let queryResults: unknown[][] = [];
let queryCallIndex = 0;

function nextQueryResult() {
  const result = queryResults[queryCallIndex] ?? [];
  queryCallIndex++;
  return result;
}

/** 创建按序号返回结果的队列 */
vi.mock('@/db', () => {
  const handler = {
    get(_target: object, prop: string) {
      if (prop === 'select') {
        return vi.fn(() => {
          const chain: Record<string, unknown> = {};
          chain.from = vi.fn(() => {
            // from() 返回 thenable 对象，但不消费队列
            // 只在真正需要值时（where() 或 then()）才消费
            const thenableChain: Record<string, unknown> = {};
            let consumed = false;
            let cachedResult: unknown[] = [];

            const consumeOnce = () => {
              if (!consumed) {
                cachedResult = nextQueryResult();
                consumed = true;
              }
              return cachedResult;
            };

            thenableChain.where = vi.fn(() => {
              return Promise.resolve(consumeOnce());
            });
            thenableChain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
              return Promise.resolve(consumeOnce()).then(resolve, reject);
            };
            return thenableChain;
          });
          return chain;
        });
      }
      if (prop === 'insert') {
        return vi.fn(() => ({
          values: vi.fn(() => Promise.resolve(undefined)),
        }));
      }
      if (prop === 'delete') {
        return vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(undefined)),
        }));
      }
      if (prop === 'update') {
        return vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve(undefined)),
          })),
        }));
      }
      return undefined;
    },
  };

  return {
    db: new Proxy({}, handler),
    projects: { id: 'id', ownerId: 'ownerId', visibility: 'visibility' },
    projectMembers: { id: 'id', projectId: 'projectId', userId: 'userId', role: 'role' },
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  or: vi.fn((...args: unknown[]) => ({ type: 'or', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  inArray: vi.fn((...args: unknown[]) => ({ type: 'inArray', args })),
  sql: vi.fn(),
}));

// ============================================================
// 测试套件
// ============================================================

describe('项目访问控制', () => {
  let checkProjectAccess: typeof import('@/lib/project-access').checkProjectAccess;
  let getAccessibleProjectIds: typeof import('@/lib/project-access').getAccessibleProjectIds;
  let addProjectMember: typeof import('@/lib/project-access').addProjectMember;
  let removeProjectMember: typeof import('@/lib/project-access').removeProjectMember;
  let updateProjectMemberRole: typeof import('@/lib/project-access').updateProjectMemberRole;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryResults = [];
    queryCallIndex = 0;
    // 动态导入让 vi.mock 生效
    const mod = await import('@/lib/project-access');
    checkProjectAccess = mod.checkProjectAccess;
    getAccessibleProjectIds = mod.getAccessibleProjectIds;
    addProjectMember = mod.addProjectMember;
    removeProjectMember = mod.removeProjectMember;
    updateProjectMemberRole = mod.updateProjectMemberRole;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // checkProjectAccess
  // ============================================================

  describe('checkProjectAccess', () => {
    it('Admin 用户应该拥有全部权限', async () => {
      // Admin 路径不查 DB
      const result = await checkProjectAccess('proj_1', 'user_admin', 'admin');
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe('admin');
      expect(result.canEdit).toBe(true);
      expect(result.canDelete).toBe(true);
      expect(result.canManageMembers).toBe(true);
    });

    it('Admin 的 isOwner 应为 false', async () => {
      const result = await checkProjectAccess('proj_1', 'user_admin', 'admin');
      expect(result.isOwner).toBe(false);
    });

    it('项目不存在应该返回无权限', async () => {
      queryResults = [[]]; // 查询项目返回空
      const result = await checkProjectAccess('not_exist', 'user_1', 'user');
      expect(result.hasAccess).toBe(false);
      expect(result.role).toBeNull();
    });

    it('Owner 应该拥有全部权限', async () => {
      queryResults = [[MOCK_PROJECT]]; // 项目存在且 ownerId 匹配
      const result = await checkProjectAccess('proj_1', 'user_owner', 'user');
      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.canDelete).toBe(true);
    });

    it('协作成员应该有编辑权限但不能删除', async () => {
      queryResults = [
        [{ ...MOCK_PROJECT, ownerId: 'user_other' }], // 项目存在但不是 owner
        [MOCK_MEMBERSHIP],                             // 是 member
      ];
      const result = await checkProjectAccess('proj_1', 'user_collab', 'user');
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe('member');
      expect(result.canEdit).toBe(true);
      expect(result.canDelete).toBe(false);
      expect(result.canManageMembers).toBe(false);
    });

    it('Admin 角色协作者应该能删除和管理成员', async () => {
      queryResults = [
        [{ ...MOCK_PROJECT, ownerId: 'user_other' }],
        [{ role: 'admin' }],
      ];
      const result = await checkProjectAccess('proj_1', 'user_admin_member', 'user');
      expect(result.canDelete).toBe(true);
      expect(result.canManageMembers).toBe(true);
    });

    it('公开项目非成员应该只读', async () => {
      queryResults = [
        [MOCK_PUBLIC_PROJECT],
        [],
      ];
      const result = await checkProjectAccess('proj_pub', 'user_stranger', 'user');
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe('public');
      expect(result.canEdit).toBe(false);
      expect(result.canDelete).toBe(false);
    });

    it('私有项目非成员应该无权限', async () => {
      queryResults = [
        [{ ...MOCK_PROJECT, ownerId: 'user_other' }],
        [],
      ];
      const result = await checkProjectAccess('proj_1', 'user_stranger', 'user');
      expect(result.hasAccess).toBe(false);
    });
  });

  // ============================================================
  // getAccessibleProjectIds
  // ============================================================

  describe('getAccessibleProjectIds', () => {
    it('Admin 应该返回所有项目', async () => {
      // admin 路径: select().from() 直接返回（无 where()）
      queryResults = [
        [{ id: 'proj_1' }, { id: 'proj_2' }, { id: 'proj_3' }],
      ];
      const result = await getAccessibleProjectIds('admin_user', 'admin');
      expect(result).toHaveLength(3);
    });

    it('普通用户应该合并去重', async () => {
      queryResults = [
        [{ id: 'proj_1' }],                                  // owned
        [{ id: 'proj_2' }, { id: 'proj_1' }],                // collaborating（proj_1 重复）
        [{ id: 'proj_3' }],                                  // public
      ];
      const result = await getAccessibleProjectIds('user_1', 'user');
      expect(result).toHaveLength(3);
      expect(new Set(result).size).toBe(3);
    });
  });

  // ============================================================
  // 成员管理
  // ============================================================

  describe('addProjectMember', () => {
    it('成功添加应该返回 success: true', async () => {
      const result = await addProjectMember('proj_1', 'user_new', 'member');
      expect(result.success).toBe(true);
    });
  });

  describe('removeProjectMember', () => {
    it('成功移除应该返回 success: true', async () => {
      const result = await removeProjectMember('proj_1', 'user_1');
      expect(result.success).toBe(true);
    });
  });

  describe('updateProjectMemberRole', () => {
    it('成功更新应该返回 success: true', async () => {
      const result = await updateProjectMemberRole('proj_1', 'user_1', 'admin');
      expect(result.success).toBe(true);
    });
  });
});
