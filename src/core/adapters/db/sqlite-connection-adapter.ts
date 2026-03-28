/**
 * v1.1 Phase 1A: SQLite 连接适配器
 *
 * 实现 IConnectionAdapter，封装 SQLite 连接管理。
 * 复用现有 db/index.ts 中的连接逻辑（WAL / 外键 / 缓存 / 超时）。
 *
 * 注意：当前实现直接复用 db/index.ts 的导出实例，
 * 后续 Phase 会迁移为独立连接管理。
 */

import type { IConnectionAdapter, IDrizzleInstance } from '../types';
import type { DbDialect } from '../types';

/**
 * SQLite 连接适配器
 *
 * 通过延迟导入 db/index.ts 来获取现有的 Drizzle 实例，
 * 避免在适配器层重复实现连接逻辑。
 */
export class SqliteConnectionAdapter implements IConnectionAdapter {
  private _db: IDrizzleInstance | null = null;

  /** 初始化连接（延迟加载现有 db 实例） */
  async initialize(): Promise<void> {
    if (this._db) return;

    // 延迟导入现有 db 模块，避免循环依赖
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { db } = require('@/db');
    this._db = db;
  }

  /** 健康检查：执行一个简单查询来测试连接 */
  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      const db = await this.getDbOrThrow();
      // 使用 Drizzle 的 run 方法执行简单查询
      db.run({ sql: 'SELECT 1' } as never);
      const latency = Date.now() - start;
      return { ok: true, latency };
    } catch {
      return { ok: false, latency: Date.now() - start };
    }
  }

  /** 关闭连接（SQLite 单进程模式下是空操作） */
  async close(): Promise<void> {
    // better-sqlite3 是同步的，没有异步 close 方法
    // 连接生命周期由 db/index.ts 的单例管理
    this._db = null;
  }

  /** 获取 Drizzle 实例 */
  getConnection(): IDrizzleInstance {
    if (!this._db) {
      throw new Error('[SqliteConnectionAdapter] 未初始化，请先调用 initialize()');
    }
    return this._db;
  }

  /** 执行增量迁移 */
  async migrate(): Promise<void> {
    // 现有迁移逻辑在 db/index.ts 初始化时自动执行
    // 这里不需要额外操作
  }

  /** 返回方言标识 */
  getDialect(): DbDialect {
    return 'sqlite';
  }

  /** 确保已初始化并返回 db 实例 */
  private async getDbOrThrow(): Promise<IDrizzleInstance> {
    if (!this._db) {
      await this.initialize();
    }
    return this._db!;
  }
}
