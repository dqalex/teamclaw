/**
 * v1.1 Phase 1A: Supabase (PostgreSQL) 连接适配器
 *
 * 实现 IConnectionAdapter，通过 Supabase PostgreSQL 提供数据库连接。
 *
 * 环境变量：
 * - SUPABASE_URL: Supabase 项目 URL
 * - SUPABASE_SERVICE_KEY: Supabase 服务密钥
 */

import type { IConnectionAdapter, IDrizzleInstance } from '../types';
import type { DbDialect } from '../types';

/**
 * Supabase 连接适配器（骨架实现）
 *
 * 当前版本提供接口占位，实际连接逻辑需安装：
 * - drizzle-orm/pg-core
 * - @supabase/supabase-js
 * - postgres
 *
 * 启用方式：设置 DB_DIALECT=postgresql
 */
export class SupabaseConnectionAdapter implements IConnectionAdapter {
  private _db: IDrizzleInstance | null = null;

  /** 初始化 Supabase PostgreSQL 连接 */
  async initialize(): Promise<void> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error(
        '[SupabaseConnectionAdapter] 缺少必要的环境变量。' +
        '请设置 SUPABASE_URL 和 SUPABASE_SERVICE_KEY。'
      );
    }

    // TODO: 实际连接逻辑
    // import { drizzle } from 'drizzle-orm/node-postgres';
    // import { Pool } from 'pg';
    // const pool = new Pool({ connectionString: url });
    // this._db = drizzle(pool);
    throw new Error(
      '[SupabaseConnectionAdapter] PostgreSQL 适配器正在开发中。' +
      '当前仅支持 SQLite (DB_DIALECT=sqlite)。'
    );
  }

  /** 健康检查 */
  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      const db = await this.getDbOrThrow();
      db.run({ sql: 'SELECT 1' } as never);
      return { ok: true, latency: Date.now() - start };
    } catch {
      return { ok: false, latency: Date.now() - start };
    }
  }

  /** 关闭连接 */
  async close(): Promise<void> {
    this._db = null;
  }

  /** 获取 Drizzle 实例 */
  getConnection(): IDrizzleInstance {
    if (!this._db) {
      throw new Error('[SupabaseConnectionAdapter] 未初始化，请先调用 initialize()');
    }
    return this._db;
  }

  /** 执行增量迁移 */
  async migrate(): Promise<void> {
    // TODO: 使用 drizzle-kit push 或 migrate
  }

  /** 返回方言标识 */
  getDialect(): DbDialect {
    return 'postgresql';
  }

  private async getDbOrThrow(): Promise<IDrizzleInstance> {
    if (!this._db) {
      await this.initialize();
    }
    return this._db!;
  }
}
