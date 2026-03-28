import { test, expect, BrowserContext } from '@playwright/test';
import { AuthHelper } from './pages/AuthHelper';

/**
 * Settings 页面 E2E 测试
 *
 * 测试场景：
 * 1. 设置主页加载
 * 2. OpenClaw 设置页加载
 * 3. SkillHub 设置页加载
 * 4. 用户资料修改
 * 5. 所有设置子页面可达
 */
test.describe('Settings', () => {
  const TEST_USER = {
    email: 'settings-e2e@teamclaw.test',
    password: 'TestSettings123!',
    name: '设置测试用户',
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

  const settingsPages = [
    { path: '/settings', label: '设置主页' },
    { path: '/settings/openclaw', label: 'OpenClaw 设置' },
    { path: '/skillhub/settings', label: 'SkillHub 设置' },
  ];

  for (const { path, label } of settingsPages) {
    test(`${label}页面加载`, async ({ browser }) => {
      const context = await browser.newContext();
      const { page } = await setupUser(context);

      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const bodyContent = await page.locator('body').innerHTML();
      expect(bodyContent.length).toBeGreaterThan(500);
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')));

      await context.close();
    });
  }

  test('用户资料 API - 获取当前用户', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const response = await page.request.get('/api/auth/me');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(TEST_USER.email);

    await context.close();
  });

  test('修改密码 API - 旧密码校验', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    // 错误的旧密码
    const response = await page.request.post('/api/auth/password', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        currentPassword: 'wrong-password',
        newPassword: 'NewPassword123!',
      },
    });

    // 应该返回错误（400 或 401）
    expect([400, 401, 403]).toContain(response.status());

    await context.close();
  });

  test('Gateway 配置 API', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    const response = await page.request.get('/api/gateway/config');
    // Gateway 可能未连接，但 API 应该返回正常（200 或带配置信息）
    expect([200, 503]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      // 配置应该有 endpoint 等字段
      expect(data).toBeDefined();
    }

    await context.close();
  });
});
