/**
 * Marketplace MCP 工具处理器
 * v1.1 Phase 3
 */

import { db, services, serviceRatings, subscriptions, activationKeys } from '@/db';
import { eq, sql, like, and } from 'drizzle-orm';
import { sqlite } from '@/db';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';
import { generateId } from '@/lib/id';
import { updateServiceRating } from './scoring';
import { eventBus } from '@/lib/event-bus';

const auth = new LocalAuthAdapter();

/**
 * 浏览 Marketplace 服务列表
 */
export async function handleListMarketplaceServices(params: Record<string, unknown>) {
  try {
    const search = params.search as string | undefined;
    const category = params.category as string | undefined;
    const sort = (params.sort as string) || 'rating';
    const limit = Math.min(Number(params.limit) || 20, 100);
    const offset = Number(params.offset) || 0;

    // 构建查询
    const conditions: string[] = ["s.status = 'published'"];
    const queryParts: unknown[] = [];
    let joinClause = 'JOIN ai_apps a ON s.ai_app_id = a.id';

    if (search) {
      conditions.push('s.name LIKE ?');
      queryParts.push(`%${search}%`);
    }

    if (category) {
      conditions.push('a.category = ?');
      queryParts.push(category);
    }

    const whereClause = conditions.join(' AND ');

    // 排序
    let orderClause = 's.rank_weight DESC';
    if (sort === 'usage') {
      orderClause = 's.total_usage_requests DESC';
    } else if (sort === 'newest') {
      orderClause = 's.created_at DESC';
    }

    // 总数
    const totalResult = sqlite.prepare(
      `SELECT COUNT(*) as count FROM services s ${joinClause} WHERE ${whereClause}`
    ).get(...queryParts) as { count: number };
    const total = totalResult?.count || 0;

    // 列表
    const rows = sqlite.prepare(
      `SELECT s.* FROM services s ${joinClause} WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`
    ).all(...queryParts, limit, offset);

    return {
      success: true,
      data: {
        services: rows,
        total,
        limit,
        offset,
      },
    };
  } catch (error) {
    console.error('[MCP] list_marketplace_services error:', error);
    return { success: false, error: 'Failed to list marketplace services' };
  }
}

/**
 * 提交服务评分
 */
export async function handleSubmitServiceRating(params: Record<string, unknown>) {
  try {
    const serviceId = params.service_id as string;
    const rating = Number(params.rating);
    const feedback = params.feedback as string | undefined;
    const consumerToken = params.consumer_token as string;

    if (!serviceId) {
      return { success: false, error: 'service_id is required' };
    }

    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    if (!consumerToken) {
      return { success: false, error: 'consumer_token is required' };
    }

    // 验证 consumer token
    const payload = await auth.verifyToken(consumerToken);
    const p = payload as Record<string, unknown> | null;
    if (!p || p.type !== 'consumer' || !p.sub) {
      return { success: false, error: 'Invalid or expired consumer token' };
    }
    const consumerId = p.sub as string;

    // 检查 service 存在
    const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!service) {
      return { success: false, error: 'Service not found' };
    }

    // 创建评分记录
    const now = new Date();
    const ratingId = generateId();

    await db.insert(serviceRatings).values({
      id: ratingId,
      serviceId,
      consumerId,
      rating: Math.round(rating),
      feedback: typeof feedback === 'string' ? feedback.slice(0, 1000) : null,
      createdAt: now,
    });

    // 聚合更新
    await updateServiceRating(serviceId);

    // SSE 事件
    eventBus.emit({ type: 'service_rating_submitted', resourceId: serviceId });

    return {
      success: true,
      data: {
        id: ratingId,
        serviceId,
        consumerId,
        rating: Math.round(rating),
      },
    };
  } catch (error) {
    console.error('[MCP] submit_service_rating error:', error);
    return { success: false, error: 'Failed to submit service rating' };
  }
}

/**
 * 订阅服务
 * v1.1 新增：Consumer 订阅 Marketplace 服务
 */
export async function handleSubscribeService(params: Record<string, unknown>) {
  try {
    const serviceId = params.service_id as string;
    const consumerId = params.consumer_id as string;
    const consumerToken = params.consumer_token as string;

    if (!serviceId || !consumerId || !consumerToken) {
      return { success: false, error: 'service_id, consumer_id, and consumer_token are required' };
    }

    // 验证 consumer token
    const payload = await auth.verifyToken(consumerToken);
    const p = payload as Record<string, unknown> | null;
    if (!p || p.type !== 'consumer' || !p.sub) {
      return { success: false, error: 'Invalid or expired consumer token' };
    }

    // 检查 service 存在且已发布
    const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!service) {
      return { success: false, error: 'Service not found' };
    }
    if (service.status !== 'published') {
      return { success: false, error: 'Service is not available' };
    }

    // 检查是否已订阅
    const [existing] = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.consumerId, consumerId), eq(subscriptions.serviceId, serviceId)))
      .limit(1);
    if (existing && existing.status === 'active') {
      return { success: false, error: 'Already subscribed to this service' };
    }

    // 创建订阅
    const now = new Date();
    const subscriptionId = generateId();
    await db.insert(subscriptions).values({
      id: subscriptionId,
      consumerId,
      serviceId,
      plan: 'trial',
      status: 'active',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // 更新服务使用次数
    await db.update(services)
      .set({ totalUsageRequests: sql`${services.totalUsageRequests} + 1` })
      .where(eq(services.id, serviceId));

    return {
      success: true,
      data: {
        id: subscriptionId,
        serviceId,
        consumerId,
        status: 'active',
        startedAt: now.toISOString(),
      },
    };
  } catch (error) {
    console.error('[MCP] subscribe_service error:', error);
    return { success: false, error: 'Failed to subscribe to service' };
  }
}

/**
 * 激活服务（使用激活码）
 * v1.1 新增：Consumer 通过激活码兑换服务访问权限
 */
export async function handleActivateService(params: Record<string, unknown>) {
  try {
    const activationKey = params.activation_key as string;
    const consumerId = params.consumer_id as string;
    const consumerToken = params.consumer_token as string;

    if (!activationKey || !consumerId || !consumerToken) {
      return { success: false, error: 'activation_key, consumer_id, and consumer_token are required' };
    }

    // 验证 consumer token
    const payload = await auth.verifyToken(consumerToken);
    const p = payload as Record<string, unknown> | null;
    if (!p || p.type !== 'consumer' || !p.sub) {
      return { success: false, error: 'Invalid or expired consumer token' };
    }

    // 查找激活码（db/schema.ts 用 key 字段存储明文）
    const [key] = await db.select().from(activationKeys)
      .where(eq(activationKeys.key, activationKey))
      .limit(1);

    if (!key) {
      return { success: false, error: 'Invalid activation key' };
    }
    if (key.status === 'activated') {
      return { success: false, error: 'Activation key already used' };
    }
    if (key.status === 'expired' || key.status === 'revoked') {
      return { success: false, error: 'Activation key is no longer valid' };
    }

    // 检查 service 存在
    const [service] = await db.select().from(services).where(eq(services.id, key.serviceId)).limit(1);
    if (!service) {
      return { success: false, error: 'Associated service not found' };
    }

    const now = new Date();

    // 标记激活码为已使用
    await db.update(activationKeys)
      .set({ status: 'activated', activatedBy: consumerId, activatedAt: now })
      .where(eq(activationKeys.id, key.id));

    // 创建订阅
    const subscriptionId = generateId();
    await db.insert(subscriptions).values({
      id: subscriptionId,
      consumerId,
      serviceId: key.serviceId,
      plan: 'trial',
      status: 'active',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      data: {
        id: subscriptionId,
        serviceId: key.serviceId,
        consumerId,
        activatedAt: now.toISOString(),
      },
    };
  } catch (error) {
    console.error('[MCP] activate_service error:', error);
    return { success: false, error: 'Failed to activate service' };
  }
}
