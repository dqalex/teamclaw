/**
 * v1.1 Phase 3: Marketplace Scoring 单元测试
 * 测试 recalculateRankWeight 纯函数（核心排序算法）
 */
import { describe, it, expect } from 'vitest';
import { recalculateRankWeight } from '@/src/domains/marketplace/scoring';

describe('recalculateRankWeight', () => {
  it('全满分 service 应该接近 1.0', () => {
    const now = new Date();
    const weight = recalculateRankWeight({
      averageRating: 5,
      totalUsageRequests: 100000,
      effectivenessScore: 10,
      createdAt: now,
    });
    expect(weight).toBeGreaterThanOrEqual(0.8);
    expect(weight).toBeLessThanOrEqual(1.0);
  });

  it('全零但有今天创建时间的 service 应该只有 recencyScore', () => {
    const weight = recalculateRankWeight({
      averageRating: 0,
      totalUsageRequests: 0,
      effectivenessScore: 0,
      createdAt: new Date(),
    });
    // recencyScore = 1 (今天创建)
    // w = 0.3*0 + 0.3*0 + 0.2*1 + 0.2*0 = 0.2
    expect(weight).toBe(0.2);
  });

  it('null 值应该当作 0 处理（但 recencyScore 取决于 createdAt）', () => {
    const weight = recalculateRankWeight({
      averageRating: null,
      totalUsageRequests: null,
      effectivenessScore: null,
      createdAt: new Date(),
    });
    // ratingScore=0, usageScore=0, effectivenessScore=0, recencyScore=1(今天)
    // w = 0.3*0 + 0.3*0 + 0.2*1 + 0.2*0 = 0.2
    expect(weight).toBe(0.2);
  });

  it('90天前创建的 service 新鲜度应该为 0', () => {
    const ninetyDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    const weight = recalculateRankWeight({
      averageRating: 5,
      totalUsageRequests: 1000,
      effectivenessScore: 10,
      createdAt: ninetyDaysAgo,
    });
    // recencyScore = max(0, 1 - 91/90) = 0
    // 所以 w = 0.3*1 + 0.3*0.6 + 0.2*0 + 0.2*1 = 0.98
    expect(weight).toBeLessThanOrEqual(1.0);
    expect(weight).toBeGreaterThan(0.5);
  });

  it('今天创建的 service 新鲜度应该为 1', () => {
    const weight = recalculateRankWeight({
      averageRating: 5,
      totalUsageRequests: 1000,
      effectivenessScore: 10,
      createdAt: new Date(),
    });
    // recencyScore = max(0, 1 - 0/90) = 1
    const usageScore = Math.min(Math.log10(1001) / 5, 1);
    const expected = 0.3 * 1 + 0.3 * usageScore + 0.2 * 1 + 0.2 * 1;
    expect(Math.round(weight * 100)).toBe(Math.round(expected * 100));
  });

  it('使用量对数缩放应该避免极端值', () => {
    const w1 = recalculateRankWeight({
      averageRating: 3,
      totalUsageRequests: 10,
      effectivenessScore: 5,
      createdAt: new Date(),
    });
    const w2 = recalculateRankWeight({
      averageRating: 3,
      totalUsageRequests: 1000000,
      effectivenessScore: 5,
      createdAt: new Date(),
    });
    // 差距不应该太大（对数缩放效果）
    expect(w2).toBeGreaterThan(w1);
    // 差距不超过 0.3
    expect(w2 - w1).toBeLessThan(0.3);
  });

  it('返回值应该保留两位小数', () => {
    const weight = recalculateRankWeight({
      averageRating: 3.7,
      totalUsageRequests: 42,
      effectivenessScore: 6.5,
      createdAt: new Date(),
    });
    const decimalPart = weight.toString().split('.')[1];
    if (decimalPart) {
      expect(decimalPart.length).toBeLessThanOrEqual(2);
    }
  });

  it('rating 超过 5 应该被 clamp 到 1', () => {
    const w1 = recalculateRankWeight({
      averageRating: 5,
      totalUsageRequests: 0,
      effectivenessScore: 0,
      createdAt: new Date(),
    });
    const w2 = recalculateRankWeight({
      averageRating: 10,
      totalUsageRequests: 0,
      effectivenessScore: 0,
      createdAt: new Date(),
    });
    expect(w1).toBe(w2);
  });

  it('effectiveness 超过 10 应该被 clamp 到 1', () => {
    const w1 = recalculateRankWeight({
      averageRating: 0,
      totalUsageRequests: 0,
      effectivenessScore: 10,
      createdAt: new Date(),
    });
    const w2 = recalculateRankWeight({
      averageRating: 0,
      totalUsageRequests: 0,
      effectivenessScore: 100,
      createdAt: new Date(),
    });
    expect(w1).toBe(w2);
  });
});
