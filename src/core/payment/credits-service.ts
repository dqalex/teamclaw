/**
 * Credits Service
 * 管理 Consumer Credits 的充值、扣减、退款
 */
import { db } from '@/db/index';
import { consumers, serviceUsage, eventLogs } from '@/db/schema';
import { eq, sql, and, gte, desc } from 'drizzle-orm';
import { generateId } from '@/shared/lib/id';
import { paymentRegistry } from './registry';
import { eventBus } from '@/shared/lib/event-bus';

export class CreditsService {
  /**
   * 购买 Credits（创建订单 + 支付 + 到账）
   * 注意：由于 serviceOrders.serviceId 有 FK 约束到 services.id，
   * credits 购买订单通过 eventLogs 记录，避免 FK 冲突
   */
  async purchaseCredits(params: {
    consumerId: string;
    creditsAmount: number;
    amountCents: number;
    currency?: string;
  }): Promise<{ orderId: string; creditsAdded: number; newBalance: number }> {
    const { consumerId, creditsAmount, amountCents, currency = 'CNY' } = params;

    // 1. 检查 consumer 存在
    const [consumer] = await db.select().from(consumers).where(eq(consumers.id, consumerId));
    if (!consumer) throw new Error('Consumer not found');

    // 2. 创建内部订单（通过 eventLogs 记录）
    const orderId = generateId();
    await db.insert(eventLogs).values({
      id: generateId(),
      eventType: 'credits_purchased',
      entityType: 'consumer',
      entityId: consumerId,
      actorType: 'system',
      payload: {
        orderId,
        creditsAmount,
        amountCents,
        currency,
        paymentAdapter: paymentRegistry.getAdapter().name,
      },
      createdAt: new Date(),
    });

    // 3. 调用支付适配器
    const adapter = paymentRegistry.getAdapter();
    const paymentResult = await adapter.createPayment({
      orderId,
      amount: amountCents,
      currency,
      description: `Purchase ${creditsAmount} credits`,
      consumerId,
    });

    if (!paymentResult.success || !paymentResult.paymentId) {
      // 记录失败事件
      await db.insert(eventLogs).values({
        id: generateId(),
        eventType: 'order_status_changed',
        entityType: 'order',
        entityId: orderId,
        actorType: 'system',
        payload: { status: 'failed', error: paymentResult.error },
        createdAt: new Date(),
      });
      throw new Error(paymentResult.error || 'Payment failed');
    }

    // 4. 支付成功，增加 credits
    const newBalance = (consumer.credits || 0) + creditsAmount;
    await db.update(consumers).set({
      credits: sql`${consumers.credits} + ${creditsAmount}`,
      updatedAt: new Date(),
    }).where(eq(consumers.id, consumerId));

    // 5. 记录成功订单事件
    await db.insert(eventLogs).values({
      id: generateId(),
      eventType: 'order_status_changed',
      entityType: 'order',
      entityId: orderId,
      actorType: 'system',
      payload: { status: 'paid', paymentId: paymentResult.paymentId, paymentMethod: adapter.name },
      createdAt: new Date(),
    });

    // 6. SSE 事件
    eventBus.emit({
      type: 'credits_purchased',
      resourceId: consumerId,
      data: { orderId, creditsAdded: creditsAmount, newBalance },
    });

    eventBus.emit({
      type: 'order_created',
      resourceId: orderId,
      data: { consumerId, amount: amountCents, currency, status: 'paid' },
    });

    return { orderId, creditsAdded: creditsAmount, newBalance };
  }

  /**
   * 扣减 Credits（使用 Service 时调用）
   */
  async deductCredits(params: {
    consumerId: string;
    serviceId: string;
    creditsUsed: number;
    description?: string;
  }): Promise<{ success: boolean; remainingCredits: number }> {
    const { consumerId, serviceId, creditsUsed, description } = params;

    const [consumer] = await db.select().from(consumers).where(eq(consumers.id, consumerId));
    if (!consumer) throw new Error('Consumer not found');
    if ((consumer.credits || 0) < creditsUsed) {
      return { success: false, remainingCredits: consumer.credits || 0 };
    }

    await db.transaction(async (tx) => {
      // 扣减 credits
      await tx.update(consumers).set({
        credits: sql`${consumers.credits} - ${creditsUsed}`,
        updatedAt: new Date(),
      }).where(eq(consumers.id, consumerId));

      // 记录 usage（使用 tokenCount 字段记录 credits 消耗量）
      const now = new Date();
      await tx.insert(serviceUsage).values({
        id: generateId(),
        consumerId,
        serviceId,
        tokenCount: creditsUsed,  // 复用 tokenCount 记录 credits 消耗
        requestCount: 1,
        periodStart: now,
        periodEnd: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    const remaining = (consumer.credits || 0) - creditsUsed;
    eventBus.emit({
      type: 'credits_deducted',
      resourceId: consumerId,
      data: { serviceId, creditsUsed, remaining },
    });

    return { success: true, remainingCredits: remaining };
  }

  /**
   * 退还 Credits（退款场景）
   */
  async refundCredits(params: {
    consumerId: string;
    creditsAmount: number;
    reason?: string;
  }): Promise<{ success: boolean; newBalance: number }> {
    const { consumerId, creditsAmount, reason } = params;

    await db.update(consumers).set({
      credits: sql`${consumers.credits} + ${creditsAmount}`,
      updatedAt: new Date(),
    }).where(eq(consumers.id, consumerId));

    const [consumer] = await db.select().from(consumers).where(eq(consumers.id, consumerId));
    const newBalance = consumer?.credits || 0;

    eventBus.emit({
      type: 'credits_refunded',
      resourceId: consumerId,
      data: { creditsAmount, newBalance, reason },
    });

    return { success: true, newBalance };
  }

  /**
   * 查询 Consumer 余额
   */
  async getBalance(consumerId: string): Promise<{ credits: number }> {
    const [consumer] = await db.select({ credits: consumers.credits }).from(consumers).where(eq(consumers.id, consumerId));
    return { credits: consumer?.credits || 0 };
  }
}

export const creditsService = new CreditsService();
