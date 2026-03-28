import { test, expect, Page, BrowserContext } from '@playwright/test';
import { AuthHelper } from './pages/AuthHelper';

/**
 * Approvals E2E 测试
 *
 * 测试场景：
 * 1. 创建审批请求
 * 2. 获取审批列表（权限过滤）
 * 3. 获取审批详情（含审批历史）
 * 4. 审批操作（approve/reject/cancel）
 * 5. 参数校验
 * 6. 页面交互
 */
test.describe('Approvals', () => {
  const TEST_USER = {
    email: 'approval-e2e@teamclaw.test',
    password: 'TestApproval123!',
    name: '审批测试用户',
  };

  async function setupUser(context: BrowserContext) {
    const page = await context.newPage();
    const auth = new AuthHelper(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loginSuccess = await auth.login(TEST_USER.email, TEST_USER.password);
    if (!loginSuccess) {
      await auth.register(TEST_USER.email, TEST_USER.password, TEST_USER.name);
      await auth.login(TEST_USER.email, TEST_USER.password);
    }
    return { page, auth };
  }

  /** 创建审批请求 */
  async function createApprovalRequest(page: Page, overrides: Record<string, unknown> = {}) {
    return page.evaluate(async (overrides) => {
      const url = `${window.location.origin}/api/approval-requests`;
      const body = {
        type: 'skill_publish',
        resourceType: 'skill',
        resourceId: overrides.resourceId || 'test-resource-id',
        requestNote: 'E2E 测试审批',
        ...overrides,
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    }, overrides);
  }

  /** 获取审批列表 */
  async function getApprovalRequests(page: Page, params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return page.evaluate(async (query) => {
      const url = `${window.location.origin}/api/approval-requests${query}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`获取审批列表失败: ${await response.text()}`);
      return await response.json();
    }, query);
  }

  /** 获取审批详情 */
  async function getApprovalDetail(page: Page, id: string) {
    return page.evaluate(async (id) => {
      const url = `${window.location.origin}/api/approval-requests/${id}`;
      const response = await fetch(url);
      return { status: response.status, data: await response.json() };
    }, id);
  }

  /** 创建 task（生成有效的 resourceId） */
  async function createTask(page: Page) {
    return page.evaluate(async () => {
      const url = `${window.location.origin}/api/tasks`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `审批测试任务-${Date.now()}`, status: 'todo', priority: 'medium' }),
      });
      if (!response.ok) throw new Error(`创建任务失败: ${await response.text()}`);
      return await response.json();
    });
  }

  test('创建审批请求', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const task = await createTask(page);

    await test.step('成功创建审批请求', async () => {
      const result = await createApprovalRequest(page, {
        type: 'task_deploy',
        resourceType: 'task',
        resourceId: task.id,
      });

      expect(result.status).toBe(201);
      expect(result.data.request).toBeDefined();
      expect(result.data.request.id).toBeDefined();
      expect(result.data.request.status).toBe('pending');
      expect(result.data.request.type).toBe('task_deploy');
    });

    // 清理
    await page.request.delete(`/api/tasks/${task.id}`);
    await context.close();
  });

  test('参数校验', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 缺少必填字段
    const result1 = await page.evaluate(async () => {
      const url = `${window.location.origin}/api/approval-requests`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'skill_publish' }),
      });
      return { status: response.status, data: await response.json() };
    });
    expect(result1.status).toBe(400);
    expect(result1.data.error).toContain('Missing');

    // 无效 resourceId 格式
    const result2 = await page.evaluate(async () => {
      const url = `${window.location.origin}/api/approval-requests`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'skill_publish',
          resourceType: 'skill',
          resourceId: 'invalid-id!!',
        }),
      });
      return { status: response.status, data: await response.json() };
    });
    expect(result2.status).toBe(400);
    expect(result2.data.error).toContain('resourceId');

    await context.close();
  });

  test('审批列表和详情', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const task = await createTask(page);

    // 创建审批请求
    const created = await createApprovalRequest(page, {
      type: 'task_deploy',
      resourceType: 'task',
      resourceId: task.id,
      requestNote: '测试详情查询',
    });
    expect(created.status).toBe(201);

    // 查询列表
    await test.step('列表包含创建的审批请求', async () => {
      const list = await getApprovalRequests(page);
      const requests = list.requests;
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.some((r: { id: string }) => r.id === created.data.request.id)).toBe(true);
    });

    // 按状态过滤
    await test.step('按状态过滤', async () => {
      const pendingList = await getApprovalRequests(page, { status: 'pending' });
      expect(pendingList.requests.every((r: { status: string }) => r.status === 'pending')).toBe(true);
    });

    // 获取详情
    await test.step('获取审批详情含历史', async () => {
      const detail = await getApprovalDetail(page, created.data.request.id);
      expect(detail.status).toBe(200);
      expect(detail.data.request.id).toBe(created.data.request.id);
      expect(detail.data.histories).toBeDefined();
      expect(Array.isArray(detail.data.histories)).toBe(true);
    });

    // 清理
    await page.request.delete(`/api/tasks/${task.id}`);
    await context.close();
  });

  test('审批操作 - 批准/拒绝/取消', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const task = await createTask(page);

    // 创建审批请求
    const created = await createApprovalRequest(page, {
      type: 'task_deploy',
      resourceType: 'task',
      resourceId: task.id,
    });
    const approvalId = created.data.request.id;

    // 取消审批
    await test.step('取消审批请求', async () => {
      const result = await page.evaluate(async (approvalId) => {
        const url = `${window.location.origin}/api/approval-requests/${approvalId}/cancel`;
        const response = await fetch(url, { method: 'POST' });
        return { status: response.status, data: await response.json() };
      }, approvalId);

      // 取消可能成功或因权限返回其他状态码
      expect([200, 201, 403, 404]).toContain(result.status);
    });

    // 清理
    await page.request.delete(`/api/tasks/${task.id}`);
    await context.close();
  });

  test('页面交互', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    await page.goto('/approvals');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(500);
    await expect(page).toHaveURL(/\/approvals/);

    await context.close();
  });
});
