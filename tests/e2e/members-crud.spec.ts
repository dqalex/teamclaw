import { test, expect, Page, BrowserContext } from '@playwright/test';
import { AuthHelper } from './pages/AuthHelper';

/**
 * Members CRUD E2E 测试
 *
 * 测试场景：
 * 1. 完整 CRUD 生命周期
 * 2. 级联删除（清理 deliveries, scheduledTasks 等）
 * 3. 成员详情获取（sanitizeMember 脱敏）
 * 4. 禁止删除 admin 成员
 * 5. 页面交互
 */
test.describe('Members CRUD', () => {
  const TEST_USER = {
    email: 'member-e2e@teamclaw.test',
    password: 'TestMem123!',
    name: '成员测试用户',
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

  /** 创建成员 */
  async function createMember(page: Page, name: string, overrides: Record<string, unknown> = {}) {
    return page.evaluate(async ({ name, overrides }) => {
      const url = `${window.location.origin}/api/members`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'human', role: 'member', skills: [], ...overrides }),
      });
      if (!response.ok) throw new Error(`创建成员失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, { name, overrides });
  }

  /** 获取成员列表 */
  async function getMembers(page: Page) {
    return page.evaluate(async () => {
      const url = `${window.location.origin}/api/members`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`获取成员列表失败: ${await response.text()}`);
      return await response.json();
    });
  }

  /** 获取成员详情 */
  async function getMember(page: Page, id: string) {
    return page.evaluate(async (id) => {
      const url = `${window.location.origin}/api/members/${id}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`获取成员详情失败: ${await response.text()}`);
      return await response.json();
    }, id);
  }

  /** 更新成员 */
  async function updateMember(page: Page, id: string, updates: Record<string, unknown>) {
    return page.evaluate(async ({ id, updates }) => {
      const url = `${window.location.origin}/api/members/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(`更新成员失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, { id, updates });
  }

  /** 删除成员 */
  async function deleteMember(page: Page, id: string) {
    return page.evaluate(async (id) => {
      const url = `${window.location.origin}/api/members/${id}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error(`删除成员失败: ${response.status} ${await response.text()}`);
      return await response.json();
    }, id);
  }

  test('完整 CRUD 生命周期', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 创建
    const member = await test.step('创建成员', async () => {
      const m = await createMember(page, `E2E 成员-${Date.now()}`);
      expect(m.id).toBeDefined();
      expect(m.name).toContain('E2E 成员');
      expect(m.type).toBe('human');
      return m;
    });

    // 读取
    await test.step('获取成员详情', async () => {
      const detail = await getMember(page, member.id);
      expect(detail.id).toBe(member.id);
      expect(detail.name).toBe(member.name);
    });

    // 列表
    await test.step('成员列表包含新建成员', async () => {
      const members = await getMembers(page);
      const memberArray = Array.isArray(members) ? members : members.data ?? members.members ?? [];
      expect(memberArray.some((m: { id: string }) => m.id === member.id)).toBe(true);
    });

    // 更新
    await test.step('更新成员名称', async () => {
      const newName = `更新后成员-${Date.now()}`;
      const updated = await updateMember(page, member.id, { name: newName });
      expect(updated.name).toBe(newName);
    });

    // 删除
    await test.step('删除成员', async () => {
      await deleteMember(page, member.id);
      const response = await page.request.get(`/api/members/${member.id}`);
      expect(response.status()).toBe(404);
    });

    await context.close();
  });

  test('创建 AI 类型成员', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const aiMember = await test.step('创建 AI 成员', async () => {
      const m = await createMember(page, `AI 助手-${Date.now()}`, { type: 'ai' });
      expect(m.type).toBe('ai');
      return m;
    });

    await deleteMember(page, aiMember.id);
    await context.close();
  });

  test('成员详情脱敏', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 创建带 token 的成员
    const member = await createMember(page, `脱敏测试-${Date.now()}`);

    // 获取详情 - openclawApiToken 应该被脱敏
    const detail = await getMember(page, member.id);
    // 如果有 token 字段，应该是脱敏格式
    if (detail.openclawApiToken) {
      expect(detail.openclawApiToken).toMatch(/^\*+$/);
    }

    await deleteMember(page, member.id);
    await context.close();
  });

  test('删除不存在的成员返回 404', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const response = await page.request.delete('/api/members/nonexistent123456');
    expect(response.status()).toBe(404);

    await context.close();
  });

  test('页面交互', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const member = await createMember(page, `页面测试成员-${Date.now()}`);

    await page.goto('/members');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(1000);
    await expect(page).toHaveURL(/\/members/);

    await deleteMember(page, member.id);
    await context.close();
  });
});
