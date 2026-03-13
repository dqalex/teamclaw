/**
 * 登录限流模块 单元测试
 *
 * 测试覆盖：
 * 1. checkLoginRateLimit — 账户级、IP 级限流判定
 * 2. recordLoginAttempt — 失败计数、成功重置
 * 3. clearAccountLock — 管理员解锁
 * 4. getRateLimitStatus — 状态查询
 * 5. formatRemainingTime — 时间格式化
 *
 * 运行方式：
 * npx vitest run tests/unit/login-rate-limit.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  clearAccountLock,
  getRateLimitStatus,
  formatRemainingTime,
} from '@/lib/login-rate-limit';

// ============================================================
// 辅助函数
// ============================================================

/** 生成唯一标识符，避免测试间干扰 */
function uniqueId(prefix = 'test') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// formatRemainingTime
// ============================================================

describe('formatRemainingTime', () => {
  it('应该正确格式化 0 毫秒', () => {
    expect(formatRemainingTime(0)).toBe('0 秒');
  });

  it('应该正确格式化负数', () => {
    expect(formatRemainingTime(-1000)).toBe('0 秒');
  });

  it('应该正确格式化纯秒数', () => {
    expect(formatRemainingTime(30000)).toBe('30 秒');
  });

  it('应该正确格式化分钟+秒', () => {
    expect(formatRemainingTime(90000)).toBe('1 分 30 秒');
  });

  it('应该正确格式化整分钟', () => {
    expect(formatRemainingTime(120000)).toBe('2 分 0 秒');
  });

  it('应该正确格式化 15 分钟', () => {
    expect(formatRemainingTime(15 * 60 * 1000)).toBe('15 分 0 秒');
  });
});

// ============================================================
// checkLoginRateLimit + recordLoginAttempt
// ============================================================

describe('登录限流核心逻辑', () => {
  let testAccount: string;
  let testIp: string;

  beforeEach(() => {
    // 每个测试用例使用独立标识符
    testAccount = uniqueId('account');
    testIp = uniqueId('ip');
  });

  describe('checkLoginRateLimit', () => {
    it('首次检查应该允许通过', () => {
      const result = checkLoginRateLimit(testAccount, testIp);
      expect(result.allowed).toBe(true);
      expect(result.remainingMs).toBe(0);
      expect(result.attemptsRemaining).toBe(5); // min(账户5, IP 10)
    });

    it('失败次数未达上限应该允许通过', () => {
      // 记录 4 次失败（上限 5 次）
      for (let i = 0; i < 4; i++) {
        recordLoginAttempt(testAccount, testIp, false);
      }
      const result = checkLoginRateLimit(testAccount, testIp);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(1);
    });

    it('账户失败达到 5 次应该锁定', () => {
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(testAccount, testIp, false);
      }
      const result = checkLoginRateLimit(testAccount, testIp);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('account_locked');
      expect(result.attemptsRemaining).toBe(0);
      expect(result.remainingMs).toBeGreaterThan(0);
    });

    it('IP 失败达到 10 次应该锁定', () => {
      // 使用 10 个不同账户对同一 IP 发送失败请求
      for (let i = 0; i < 10; i++) {
        const account = uniqueId(`acc${i}`);
        recordLoginAttempt(account, testIp, false);
      }
      const newAccount = uniqueId('new_acc');
      const result = checkLoginRateLimit(newAccount, testIp);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ip_locked');
    });
  });

  describe('recordLoginAttempt', () => {
    it('登录成功应该清除账户失败记录', () => {
      // 先记录 4 次失败
      for (let i = 0; i < 4; i++) {
        recordLoginAttempt(testAccount, testIp, false);
      }
      let result = checkLoginRateLimit(testAccount, testIp);
      expect(result.attemptsRemaining).toBe(1);

      // 登录成功
      recordLoginAttempt(testAccount, testIp, true);

      // 应该重置
      result = checkLoginRateLimit(testAccount, testIp);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(5);
    });

    it('登录成功不应清除 IP 记录', () => {
      // 同一 IP 下多个账户失败
      for (let i = 0; i < 9; i++) {
        recordLoginAttempt(uniqueId(`a${i}`), testIp, false);
      }
      // 一个账户成功登录
      recordLoginAttempt(testAccount, testIp, true);

      // IP 记录应该仍然存在
      const status = getRateLimitStatus(uniqueId('other'), testIp);
      expect(status.ip).not.toBeNull();
      expect(status.ip!.attempts).toBe(9);
    });
  });

  describe('clearAccountLock', () => {
    it('应该能清除账户锁定', () => {
      // 锁定账户
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(testAccount, testIp, false);
      }
      expect(checkLoginRateLimit(testAccount, testIp).allowed).toBe(false);

      // 管理员解锁
      clearAccountLock(testAccount);

      // 应该可以再次尝试
      const result = checkLoginRateLimit(testAccount, testIp);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(5);
    });
  });

  describe('getRateLimitStatus', () => {
    it('无记录时应该返回 null', () => {
      const status = getRateLimitStatus(testAccount, testIp);
      expect(status.account).toBeNull();
      expect(status.ip).toBeNull();
    });

    it('有失败记录时应该返回正确状态', () => {
      recordLoginAttempt(testAccount, testIp, false);
      recordLoginAttempt(testAccount, testIp, false);

      const status = getRateLimitStatus(testAccount, testIp);
      expect(status.account).not.toBeNull();
      expect(status.account!.attempts).toBe(2);
      expect(status.account!.locked).toBe(false);

      expect(status.ip).not.toBeNull();
      expect(status.ip!.attempts).toBe(2);
      expect(status.ip!.locked).toBe(false);
    });

    it('锁定时 locked 应为 true', () => {
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(testAccount, testIp, false);
      }
      const status = getRateLimitStatus(testAccount, testIp);
      expect(status.account!.locked).toBe(true);
      expect(status.account!.remainingMs).toBeGreaterThan(0);
    });
  });
});
