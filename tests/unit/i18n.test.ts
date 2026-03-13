/**
 * i18n.ts 单元测试
 * 测试国际化配置的异步加载和语言切换
 */
import { describe, it, expect, vi } from 'vitest';

// 简化测试 - 主要验证模块结构和基本功能
describe('i18n', () => {
  it('模块应该正确导出', async () => {
    const mod = await import('@/lib/i18n');
    expect(mod.initI18n).toBeDefined();
    expect(mod.changeLanguage).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it('initI18n 应该是函数', async () => {
    const { initI18n } = await import('@/lib/i18n');
    expect(typeof initI18n).toBe('function');
  });

  it('changeLanguage 应该是函数', async () => {
    const { changeLanguage } = await import('@/lib/i18n');
    expect(typeof changeLanguage).toBe('function');
  });
});
