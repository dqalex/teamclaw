/**
 * Marketplace 评分与排序模块
 * 
 * 提供排序权重计算、评分聚合、用量记录等功能
 */

import { db, services, serviceRatings } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { sqlite } from '@/db';

/**
 * 重算排序权重
 * w1=0.3 (rating), w2=0.3 (usage), w3=0.2 (recency), w4=0.2 (effectiveness)
 */
export function recalculateRankWeight(service: {
  averageRating: number | null;
  totalUsageRequests: number | null;
  effectivenessScore: number | null;
  createdAt: Date;
}): number {
  // 归一化评分（1-5 → 0-1）
  const ratingScore = Math.min((service.averageRating || 0) / 5, 1);

  // 归一化使用量（对数缩放，避免极端值）
  const usageScore = Math.min(Math.log10((service.totalUsageRequests || 0) + 1) / 5, 1);

  // 归一化新鲜度（创建距今天数，30天内为 1.0）
  const daysSinceCreation = (Date.now() - service.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  const recencyScore = Math.max(0, 1 - daysSinceCreation / 90);

  // 归一化有效性（0-10 → 0-1）
  const effectivenessScore = Math.min((service.effectivenessScore || 0) / 10, 1);

  const weight =
    0.3 * ratingScore +
    0.3 * usageScore +
    0.2 * recencyScore +
    0.2 * effectivenessScore;

  return Math.round(weight * 100) / 100;
}

/**
 * 提交评分后调用，聚合所有评分更新 averageRating/ratingCount
 */
export async function updateServiceRating(serviceId: string): Promise<void> {
  const result = sqlite.prepare(`
    SELECT
      COUNT(*) as rating_count,
      AVG(rating) as average_rating
    FROM service_ratings
    WHERE service_id = ?
  `).get(serviceId) as { rating_count: number; average_rating: number | null };

  if (result) {
    await db.update(services).set({
      averageRating: result.average_rating ? Math.round(result.average_rating * 100) / 100 : 0,
      ratingCount: result.rating_count,
    }).where(eq(services.id, serviceId));
  }
}

/**
 * 记录使用量，更新 services 表的 totalUsageTokens/totalUsageRequests
 */
export async function recordServiceUsage(
  serviceId: string,
  consumerId: string,
  tokens: number,
  requests: number,
): Promise<void> {
  // 更新 services 表累计使用量
  await db.update(services).set({
    totalUsageTokens: sql`${services.totalUsageTokens} + ${tokens}`,
    totalUsageRequests: sql`${services.totalUsageRequests} + ${requests}`,
  }).where(eq(services.id, serviceId));

  // 更新当前周期的用量记录（由调用方提供 subscriptionId 和周期信息）
}
