import { test, expect, Page, BrowserContext } from '@playwright/test';
import { AuthHelper } from './pages/AuthHelper';

/**
 * Projects CRUD E2E 测试
 *
 * 测试场景：
 * 1. 完整 CRUD 生命周期
 * 2. DELETE 级联清理（tasks, milestones, documents 等）
 * 3. 权限校验（private/public 可见性）
 * 4. 更新白名单字段
 * 5. 页面交互
 */
test.describe('Projects CRUD', () => {
  const TEST_USER = {
    email: 'project-e2e@teamclaw.test',
    password: 'TestProj123!',
    name: '项目测试用户',
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

  /** 创建项目（浏览器上下文） */
  async function createProject(page: Page, name: string, overrides: Record<string, unknown> = {}) {
    return page.evaluate(async ({ name, overrides }) => {
      const url = `${window.location.origin}/api/projects`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: '测试描述', source: 'local', visibility: 'private', ...overrides }),
      });
      if (!response.ok) throw new Error(`创建项目失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, { name, overrides });
  }

  /** 更新项目 */
  async function updateProject(page: Page, id: string, updates: Record<string, unknown>) {
    return page.evaluate(async ({ id, updates }) => {
      const url = `${window.location.origin}/api/projects/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(`更新项目失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, { id, updates });
  }

  /** 删除项目 */
  async function deleteProject(page: Page, id: string) {
    return page.evaluate(async (id) => {
      const url = `${window.location.origin}/api/projects/${id}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error(`删除项目失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, id);
  }

  /** 创建 task */
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

  /** 创建 document */
  async function createDocument(page: Page, title: string, overrides: Record<string, unknown> = {}) {
    return page.evaluate(async ({ title, overrides }) => {
      const url = `${window.location.origin}/api/documents`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: '# 测试', type: 'note', source: 'local', ...overrides }),
      });
      if (!response.ok) throw new Error(`创建文档失败: ${await response.text()}`);
      return await response.json();
    }, { title, overrides });
  }

  test('完整 CRUD 生命周期', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 创建
    const project = await test.step('创建项目', async () => {
      const p = await createProject(page, `CRUD 测试项目-${Date.now()}`);
      expect(p.id).toBeDefined();
      expect(p.name).toContain('CRUD 测试项目');
      return p;
    });

    // 读取
    await test.step('读取项目详情', async () => {
      const response = await page.request.get(`/api/projects/${project.id}`);
      expect(response.ok()).toBe(true);
      const detail = await response.json();
      expect(detail.id).toBe(project.id);
    });

    // 更新
    await test.step('更新项目名称和可见性', async () => {
      const newName = `更新后项目-${Date.now()}`;
      const updated = await updateProject(page, project.id, { name: newName, visibility: 'public' });
      expect(updated.name).toBe(newName);
      expect(updated.visibility).toBe('public');
    });

    // 删除
    await test.step('删除项目', async () => {
      await deleteProject(page, project.id);
      const response = await page.request.get(`/api/projects/${project.id}`);
      expect(response.status()).toBe(404);
    });

    await context.close();
  });

  test('级联删除 - 项目关联数据被清理', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const project = await createProject(page, `级联删除项目-${Date.now()}`);

    // 创建关联任务
    const task = await createTask(page, `项目任务-${Date.now()}`, { projectId: project.id });

    // 创建关联文档
    const doc = await createDocument(page, `项目文档-${Date.now()}`, { projectId: project.id });

    // 验证关联关系
    const taskBefore = await page.request.get(`/api/tasks/${task.id}`);
    expect((await taskBefore.json()).projectId).toBe(project.id);

    // 删除项目
    await test.step('删除项目后关联数据被清理', async () => {
      await deleteProject(page, project.id);

      // 项目已删除
      expect((await page.request.get(`/api/projects/${project.id}`)).status()).toBe(404);

      // 任务已删除
      expect((await page.request.get(`/api/tasks/${task.id}`)).status()).toBe(404);

      // 文档的 projectId 被置空（不是删除文档）
      const docAfter = await page.request.get(`/api/documents/${doc.id}`);
      expect(docAfter.ok()).toBe(true);
      expect((await docAfter.json()).projectId).toBeNull();
    });

    // 清理文档
    await page.request.delete(`/api/documents/${doc.id}`);
    await context.close();
  });

  test('可见性过滤', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const privateProject = await createProject(page, `私有项目-${Date.now()}`, { visibility: 'private' });
    const publicProject = await createProject(page, `公开项目-${Date.now()}`, { visibility: 'public' });

    // 两个项目都应该在列表中
    const response = await page.request.get('/api/projects');
    const projects = await response.json();
    const projectIds = Array.isArray(projects) ? projects.map((p: { id: string }) => p.id) : projects.data?.map((p: { id: string }) => p.id) ?? [];
    expect(projectIds).toContain(privateProject.id);
    expect(projectIds).toContain(publicProject.id);

    // 清理
    await deleteProject(page, privateProject.id);
    await deleteProject(page, publicProject.id);
    await context.close();
  });

  test('更新白名单字段', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const project = await createProject(page, `白名单测试-${Date.now()}`);

    // 只能更新 name, description, visibility, knowledgeConfig
    const updated = await updateProject(page, project.id, {
      name: '新名称',
      description: '新描述',
      visibility: 'team',
    });

    expect(updated.name).toBe('新名称');
    expect(updated.description).toBe('新描述');
    expect(updated.visibility).toBe('team');

    await deleteProject(page, project.id);
    await context.close();
  });

  test('页面交互', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const project = await createProject(page, `页面交互-${Date.now()}`);

    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(1000);
    await expect(page).toHaveURL(/\/projects/);

    await deleteProject(page, project.id);
    await context.close();
  });
});
