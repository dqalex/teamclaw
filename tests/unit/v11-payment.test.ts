/**
 * v1.1 Phase 5: Payment System 单元测试
 * 测试 paymentRegistry 降级策略和 CreditsOnlyAdapter
 *
 * 注意：PaymentRegistry 没有导出类（只有 paymentRegistry 单例），
 * 所以直接通过重新导入的方式测试。实际上降级逻辑在 configure() 中，
 * 单例的 getAdapter() 会自动配置 credits_only。
 */
import { describe, it, expect } from 'vitest';
import { CreditsOnlyAdapter } from '@/src/core/payment/credits-only-adapter';

describe('CreditsOnlyAdapter', () => {
  const adapter = new CreditsOnlyAdapter();

  it('name 应该是 credits_only', () => {
    expect(adapter.name).toBe('credits_only');
  });

  it('createPayment 应该返回成功', async () => {
    const result = await adapter.createPayment({
      orderId: 'order-1',
      amount: 100,
      currency: 'CNY',
      description: 'Test',
      consumerId: 'c1',
    });
    expect(result.success).toBe(true);
    expect(result.paymentId).toBe('credits_order-1');
  });

  it('queryPayment 应该返回已支付', async () => {
    const result = await adapter.queryPayment('credits_order-1');
    expect(result.status).toBe('paid');
    expect(result.paid).toBe(true);
  });

  it('refund 应该返回成功', async () => {
    const result = await adapter.refund({
      orderId: 'order-1',
      paymentId: 'credits_order-1',
    });
    expect(result.success).toBe(true);
    expect(result.refundId).toBe('refund_credits_order-1');
  });

  it('verifyWebhook 应该返回 false', () => {
    expect(adapter.verifyWebhook({}, 'sig')).toBe(false);
  });

  it('parseWebhook 应该返回 null', () => {
    expect(adapter.parseWebhook({})).toBeNull();
  });
});

describe('PaymentRegistry 降级逻辑', () => {
  // PaymentRegistry 没有导出类，只导出 paymentRegistry 单例
  // 测试 configure 逻辑需要直接导入单例
  // 由于单例状态是持久的，这里通过测试 getAdapter() 默认行为来验证

  it('默认应该返回 credits_only 适配器', async () => {
    const { paymentRegistry } = await import('@/src/core/payment/registry');
    const adapter = paymentRegistry.getAdapter();
    expect(adapter).toBeInstanceOf(CreditsOnlyAdapter);
    expect(adapter.name).toBe('credits_only');
  });

  it('getConfig 默认应该返回 credits_only 配置', async () => {
    const { paymentRegistry } = await import('@/src/core/payment/registry');
    const config = paymentRegistry.getConfig();
    expect(config.adapter).toBe('credits_only');
  });
});
