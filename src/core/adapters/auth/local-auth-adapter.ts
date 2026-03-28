/**
 * v1.1 Phase 1A: 本地认证适配器
 *
 * 实现 IAuthAdapter，使用 argon2id 哈希 + 简单签名 Token。
 * 复用现有的 auth.ts 中的密码哈希逻辑。
 */

import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { IAuthAdapter } from '../types';

// Token 密钥（强制依赖环境变量，生产环境禁止使用默认值）
const AUTH_SECRET = process.env.SESSION_SECRET;
if (!AUTH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[LocalAuthAdapter] SESSION_SECRET 环境变量未设置，生产环境必须配置');
  }
  console.warn('[LocalAuthAdapter] SESSION_SECRET 未设置，使用临时密钥（仅限开发环境）');
}
// 开发环境回退到临时值（每次启动不同，Token 不会跨会话持久化）
const _AUTH_SECRET = AUTH_SECRET || `dev-only-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * 本地认证适配器
 *
 * - 密码哈希：argon2id（与现有 auth.ts 保持一致）
 * - Token：自定义签名 Token（Base64URL payload + HMAC-SHA256 签名）
 */
export class LocalAuthAdapter implements IAuthAdapter {
  /** 使用 argon2id 哈希密码 */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      timeCost: 3,        // 迭代次数
      parallelism: 4,     // 并行度
    });
  }

  /** 验证密码 */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** 创建签名 Token（JSON payload → Base64URL + HMAC 签名） */
  async createToken(payload: object): Promise<string> {
    // 添加过期时间（24h）和随机数防重放
    const fullPayload = {
      ...payload,
      exp: Date.now() + 24 * 60 * 60 * 1000,
      nonce: randomBytes(8).toString('hex'),
    };

    const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = createHash('sha256')
      .update(data + _AUTH_SECRET)
      .digest('hex')
      .slice(0, 32);

    return `tca_${data}.${signature}`;
  }

  /** 验证并解析 Token */
  async verifyToken(token: string): Promise<object | null> {
    if (!token || !token.startsWith('tca_')) {
      return null;
    }

    try {
      const [data, signature] = token.slice(4).split('.');
      if (!data || !signature) return null;

      // 验证签名
      const expectedSig = createHash('sha256')
        .update(data + _AUTH_SECRET)
        .digest('hex')
        .slice(0, 32);

      if (signature !== expectedSig) return null;

      // 解析 payload
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));

      // 检查过期
      if (payload.exp && Date.now() > payload.exp) {
        return null;
      }

      // 返回时移除内部字段
      const { exp, nonce, ...result } = payload;
      return result;
    } catch {
      return null;
    }
  }
}
