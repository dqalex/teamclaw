import { test, expect, Page, BrowserContext } from '@playwright/test';
import { AuthHelper } from './pages/AuthHelper';

/**
 * Workflows CRUD E2E 测试
 *
 * 测试场景：
 * 1. 完整 CRUD 生命周期（创建/读取/更新/删除）
 * 2. 级联删除：删除 workflow 后关联 tasks 的 workflowId 被清理
 * 3. 参数校验：缺失必填字段、无效 ID
 * 4. 分页查询
 * 5. 状态过滤
 * 6. 页面交互验证
 */
test.describe('Workflows CRUD', () => {
  const TEST_USER = {
    email: 'workflow-e2e@teamclaw.test',
    password: 'TestWf123!',
    name: '工作流测试用户',
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

  /** 创建 workflow（浏览器上下文，自动携带 Cookie） */
  async function createWorkflow(page: Page, name: string, options: {
    description?: string;
    nodes?: unknown[];
    entryNodeId?: string;
    projectId?: string;
  } = {}) {
    const nodes = options.nodes ?? [
      { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
    ];
    const entryNodeId = options.entryNodeId ?? 'node-1';

    const result = await page.evaluate(async ({ name, description, nodes, entryNodeId, projectId }) => {
      const url = `${window.location.origin}/api/workflows`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, nodes, entryNodeId, projectId }),
      });
      if (!response.ok) {
        throw new Error(`创建工作流失败: ${response.status} ${await response.text()}`);
      }
      return await response.json();
    }, { name, description: options.description, nodes, entryNodeId, projectId: options.projectId });

    return result;
  }

  /** 获取 workflow 列表 */
  async function getWorkflows(page: Page, params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const result = await page.evaluate(async (query) => {
      const url = `${window.location.origin}/api/workflows${query}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`获取工作流列表失败: ${await response.text()}`);
      return await response.json();
    }, query);
    return result;
  }

  /** 更新 workflow */
  async function updateWorkflow(page: Page, id: string, updates: Record<string, unknown>) {
    const result = await page.evaluate(async ({ id, updates }) => {
      const url = `${window.location.origin}/api/workflows/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(`更新工作流失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, { id, updates });
    return result;
  }

  /** 删除 workflow */
  async function deleteWorkflow(page: Page, id: string) {
    const result = await page.evaluate(async (id) => {
      const url = `${window.location.origin}/api/workflows/${id}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error(`删除工作流失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, id);
    return result;
  }

  /** 创建 task（用于级联删除测试） */
  async function createTask(page: Page, title: string, overrides: Record<string, unknown> = {}) {
    return page.evaluate(async ({ title, overrides }) => {
      const url = `${window.location.origin}/api/tasks`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, status: 'todo', priority: 'medium', ...overrides }),
      });
      if (!response.ok) throw new Error(`创建任务失败: ${await response.text()}`);
      return await response.json();
    }, { title, overrides });
  }

  test('完整 CRUD 生命周期', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 阶段 1: 创建
    const workflow = await test.step('创建工作流', async () => {
      const wf = await createWorkflow(page, `E2E CRUD 测试-${Date.now()}`, {
        description: '测试描述',
      });
      expect(wf.id).toBeDefined();
      expect(wf.name).toContain('E2E CRUD 测试');
      expect(wf.status).toBe('draft');
      expect(wf.version).toBe(1);
      expect(wf.nodes).toHaveLength(1);
      return wf;
    });

    // 阶段 2: 读取
    await test.step('读取工作流详情', async () => {
      const response = await page.request.get(`/api/workflows/${workflow.id}`);
      expect(response.ok()).toBe(true);
      const detail = await response.json();
      expect(detail.id).toBe(workflow.id);
      expect(detail.name).toBe(workflow.name);
    });

    // 阶段 3: 更新
    await test.step('更新工作流', async () => {
      const newName = `更新后-${Date.now()}`;
      const updated = await updateWorkflow(page, workflow.id, { name: newName, description: '更新描述' });
      expect(updated.name).toBe(newName);
      expect(updated.description).toBe('更新描述');
    });

    // 阶段 4: 删除
    await test.step('删除工作流', async () => {
      await deleteWorkflow(page, workflow.id);
      const response = await page.request.get(`/api/workflows/${workflow.id}`);
      expect(response.status()).toBe(404);
    });

    await context.close();
  });

  test('级联删除 - 关联 task 的 workflowId 被清理', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 创建工作流
    const workflow = await createWorkflow(page, `级联删除测试-${Date.now()}`);

    // 创建关联的 task
    const task = await createTask(page, `关联任务-${Date.now()}`, {
      workflowId: workflow.id,
    });

    // 验证关联关系
    const taskBefore = await page.request.get(`/api/tasks/${task.id}`);
    const taskDataBefore = await taskBefore.json();
    expect(taskDataBefore.workflowId).toBe(workflow.id);

    // 删除工作流
    await test.step('删除工作流后 task 的 workflowId 应被置空', async () => {
      await deleteWorkflow(page, workflow.id);

      // 验证工作流已删除
      const wfResponse = await page.request.get(`/api/workflows/${workflow.id}`);
      expect(wfResponse.status()).toBe(404);

      // 验证 task 的 workflowId 被清理
      const taskAfter = await page.request.get(`/api/tasks/${task.id}`);
      expect(taskAfter.ok()).toBe(true);
      const taskDataAfter = await taskAfter.json();
      expect(taskDataAfter.workflowId).toBeNull();
    });

    // 清理 task
    await page.request.delete(`/api/tasks/${task.id}`);
    await context.close();
  });

  test('参数校验 - 缺失必填字段', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 缺少 name
    const response1 = await page.evaluate(async () => {
      const url = `${window.location.origin}/api/workflows`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: [] }),
      });
      return { status: response.status, data: await response.json() };
    });
    expect(response1.status).toBe(400);
    expect(response1.data.error).toContain('name');

    // 缺少 nodes
    const response2 = await page.evaluate(async () => {
      const url = `${window.location.origin}/api/workflows`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });
      return { status: response.status, data: await response.json() };
    });
    expect(response2.status).toBe(400);
    expect(response2.data.error).toContain('nodes');

    // 无效 ID 格式
    const response3 = await page.request.get('/api/workflows/invalid-id-format!!');
    expect(response3.status()).toBe(400);

    await context.close();
  });

  test('分页查询', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 创建多个工作流
    const created = [];
    for (let i = 0; i < 3; i++) {
      const wf = await createWorkflow(page, `分页测试-${i}-${Date.now()}`);
      created.push(wf);
    }

    await test.step('默认分页', async () => {
      const result = await getWorkflows(page, { page: '1', limit: '2' });
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
      expect(result.pagination.limit).toBe(2);
    });

    await test.step('第二页', async () => {
      const result = await getWorkflows(page, { page: '2', limit: '2' });
      expect(result.pagination.page).toBe(2);
    });

    // 清理
    for (const wf of created) {
      await deleteWorkflow(page, wf.id);
    }

    await context.close();
  });

  test('状态过滤', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 创建工作流
    const wf = await createWorkflow(page, `状态过滤测试-${Date.now()}`);

    // 按状态过滤
    const draftResult = await getWorkflows(page, { status: 'draft' });
    expect(draftResult.data.some((w: { id: string }) => w.id === wf.id)).toBe(true);

    const publishedResult = await getWorkflows(page, { status: 'published' });
    expect(publishedResult.data.some((w: { id: string }) => w.id === wf.id)).toBe(false);

    // 无效状态值
    const response = await page.request.get('/api/workflows?status=invalid_status');
    expect(response.status()).toBe(400);

    // 清理
    await deleteWorkflow(page, wf.id);
    await context.close();
  });

  test('更新白名单字段过滤', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const wf = await createWorkflow(page, `白名单测试-${Date.now()}`);

    // 尝试传入非法字段（version 不在白名单中）
    const updated = await updateWorkflow(page, wf.id, {
      name: '合法更新',
      version: 999, // 应被忽略
    });

    expect(updated.name).toBe('合法更新');
    expect(updated.version).toBe(1); // version 不在白名单中，不应被更新

    // 清理
    await deleteWorkflow(page, wf.id);
    await context.close();
  });

  test('页面交互 - 工作流列表页', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 创建测试数据
    const wf = await createWorkflow(page, `页面交互测试-${Date.now()}`);

    await page.goto('/workflows');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 验证页面加载
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(1000);
    await expect(page).toHaveURL(/\/workflows/);

    // 清理
    await deleteWorkflow(page, wf.id);
    await context.close();
  });
});
