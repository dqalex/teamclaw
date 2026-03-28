/**
 * v1.1 Phase 1A: CloudBase (MySQL) 连接适配器
 *
 * 实现 IConnectionAdapter，通过腾讯云 CloudBase 提供 MySQL 数据库连接。
 *
 * 环境变量：
 * - CLOUDBASE_ENV_ID: CloudBase 环境ID
 * - CLOUDBASE_SECRET_ID: 云API密钥ID
 * - CLOUDBASE_SECRET_KEY: 云API密钥Key
 */

import type { IConnectionAdapter, IDrizzleInstance } from '../types';
import type { DbDialect } from '../types';

/**
 * CloudBase 连接适配器（骨架实现）
 *
 * 当前版本提供接口占位，实际连接逻辑需安装：
 * - drizzle-orm/mysql-core
 * - @cloudbase/node-sdk
 * - mysql2
 *
 * 启用方式：设置 DB_DIALECT=mysql
 */
export class CloudBaseConnectionAdapter implements IConnectionAdapter {
  private _db: IDrizzleInstance | null = null;

  /** 初始化 CloudBase MySQL 连接 */
  async initialize(): Promise<void> {
    const envId = process.env.CLOUDBASE_ENV_ID;
    const secretId = process.env.CLOUDBASE_SECRET_ID;
    const secretKey = process.env.CLOUDBASE_SECRET_KEY;

    if (!envId || !secretId || !secretKey) {
      throw new Error(
        '[CloudBaseConnectionAdapter] 缺少必要的环境变量。' +
        '请设置 CLOUDBASE_ENV_ID、CLOUDBASE_SECRET_ID 和 CLOUDBASE_SECRET_KEY。'
      );
    }

    // TODO: 实际连接逻辑
    // import { drizzle } from 'drizzle-orm/mysql2';
    // import mysql from 'mysql2/promise';
    // const connection = await mysql.createConnection({ ... });
    // this._db = drizzle(connection);
    throw new Error(
      '[CloudBaseConnectionAdapter] MySQL 适配器正在开发中。' +
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
      throw new Error('[CloudBaseConnectionAdapter] 未初始化，请先调用 initialize()');
    }
    return this._db;
  }

  /** 执行增量迁移 */
  async migrate(): Promise<void> {
    // TODO: 使用 drizzle-kit push 或 migrate
  }

  /** 返回方言标识 */
  getDialect(): DbDialect {
    return 'mysql';
  }

  private async getDbOrThrow(): Promise<IDrizzleInstance> {
    if (!this._db) {
      await this.initialize();
    }
    return this._db!;
  }
}
