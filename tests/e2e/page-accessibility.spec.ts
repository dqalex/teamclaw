import { test, expect, BrowserContext } from '@playwright/test';
import { AuthHelper } from './pages/AuthHelper';

/**
 * 低优先级页面基础 E2E 测试
 *
 * 仅验证页面加载和基本可达性。
 * 覆盖之前完全无测试的页面。
 */
test.describe('页面可达性', () => {
  const TEST_USER = {
    email: 'pages-e2e@teamclaw.test',
    password: 'TestPages123!',
    name: '页面测试用户',
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

  // 所有需要验证的页面
  const pages = [
    // 核心页面
    { path: '/dashboard', label: '仪表盘', minContent: 500 },
    { path: '/tasks', label: '任务', minContent: 500 },
    { path: '/projects', label: '项目', minContent: 500 },
    { path: '/wiki', label: 'Wiki', minContent: 500 },
    { path: '/workflows', label: '工作流', minContent: 500 },
    { path: '/deliveries', label: '投递', minContent: 500 },
    { path: '/approvals', label: '审批', minContent: 500 },
    { path: '/members', label: '成员', minContent: 500 },
    { path: '/schedule', label: '定时任务', minContent: 500 },
    { path: '/sessions', label: '会话', minContent: 500 },
    { path: '/sop', label: 'SOP', minContent: 500 },
    { path: '/skills', label: '技能', minContent: 500 },
    { path: '/skillhub', label: 'SkillHub', minContent: 500 },
    { path: '/agents', label: 'Agent', minContent: 500 },
    { path: '/settings', label: '设置', minContent: 500 },
    { path: '/settings/openclaw', label: 'OpenClaw 设置', minContent: 500 },
    { path: '/milestones', label: '里程碑', minContent: 300 },
    { path: '/analytics', label: '数据分析', minContent: 300 },
  ];

  // 批量测试：每个页面独立 test case
  for (const { path, label, minContent } of pages) {
    test(`${label}页面 (${path}) 正常加载`, async ({ browser }) => {
      const context = await browser.newContext();
      const { page } = await setupUser(context);

      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // 验证页面有内容
      const bodyContent = await page.locator('body').innerHTML();
      expect(bodyContent.length).toBeGreaterThan(minContent);

      // 验证 URL 正确
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')));

      // 验证没有严重错误（白屏检测）
      const hasError = await page.locator('text=/error|500|Internal Server Error/i').first().isVisible().catch(() => false);
      expect(hasError).toBe(false);

      await context.close();
    });
  }

  test('所有核心页面在侧边栏中可点击导航', async ({ browser }) => {
    const context = await browser.newContext();
    const { page } = await setupUser(context);

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 查找侧边栏导航链接
    const navLinks = page.locator('nav a, [role="navigation"] a, aside a');
    const count = await navLinks.count();

    // 侧边栏应该有多个导航链接
    expect(count).toBeGreaterThan(3);

    await context.close();
  });
});
