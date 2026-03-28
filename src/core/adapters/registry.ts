/**
 * v1.1 Phase 1A: 适配器注册表
 *
 * 根据环境变量选择适配器实现，提供全局单例访问。
 *
 * 环境变量：
 * - DB_DIALECT: sqlite | postgresql | mysql（默认 sqlite）
 * - STORAGE_DIR: 存储根目录（默认 data/storage/）
 */

import type {
  IConnectionAdapter,
  IAuthAdapter,
  IStorageAdapter,
  INotificationAdapter,
} from './types';
import { SqliteConnectionAdapter } from './db/sqlite-connection-adapter';
import { SupabaseConnectionAdapter } from './db/supabase-connection-adapter';
import { CloudBaseConnectionAdapter } from './db/cloudbase-connection-adapter';
import { LocalAuthAdapter } from './auth/local-auth-adapter';
import { LocalStorageAdapter } from './storage/local-storage-adapter';
import { ConsoleNotificationAdapter } from './notification/console-notification-adapter';

/** 支持的数据库方言 */
type SupportedDialect = 'sqlite' | 'postgresql' | 'mysql';

/**
 * 适配器注册表
 *
 * 延迟初始化：首次访问时才创建适配器实例。
 * 使用 static getter 简化全局访问。
 */
export class AdapterRegistry {
  // ---- 单例状态 ----
  private static _connection: IConnectionAdapter | null = null;
  private static _auth: IAuthAdapter | null = null;
  private static _storage: IStorageAdapter | null = null;
  private static _notification: INotificationAdapter | null = null;

  // ---- 连接适配器 ----

  /** 获取数据库连接适配器 */
  static get connection(): IConnectionAdapter {
    if (!AdapterRegistry._connection) {
      const dialect = (process.env.DB_DIALECT || 'sqlite') as SupportedDialect;
      AdapterRegistry._connection = AdapterRegistry.createConnectionAdapter(dialect);
    }
    return AdapterRegistry._connection;
  }

  /** 获取 Drizzle 实例（快捷方法） */
  static get db() {
    return AdapterRegistry.connection.getConnection();
  }

  /** 根据方言创建连接适配器 */
  private static createConnectionAdapter(dialect: SupportedDialect): IConnectionAdapter {
    switch (dialect) {
      case 'sqlite':
        return new SqliteConnectionAdapter();
      case 'postgresql':
        return new SupabaseConnectionAdapter();
      case 'mysql':
        return new CloudBaseConnectionAdapter();
      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = dialect;
        throw new Error(`[AdapterRegistry] 不支持的数据库方言: ${_exhaustive}`);
      }
    }
  }

  // ---- 认证适配器 ----

  /** 获取认证适配器 */
  static get auth(): IAuthAdapter {
    if (!AdapterRegistry._auth) {
      AdapterRegistry._auth = new LocalAuthAdapter();
    }
    return AdapterRegistry._auth;
  }

  // ---- 存储适配器 ----

  /** 获取存储适配器 */
  static get storage(): IStorageAdapter {
    if (!AdapterRegistry._storage) {
      AdapterRegistry._storage = new LocalStorageAdapter(process.env.STORAGE_DIR);
    }
    return AdapterRegistry._storage;
  }

  // ---- 通知适配器 ----

  /** 获取通知适配器 */
  static get notification(): INotificationAdapter {
    if (!AdapterRegistry._notification) {
      AdapterRegistry._notification = new ConsoleNotificationAdapter();
    }
    return AdapterRegistry._notification;
  }

  // ---- 生命周期 ----

  /** 初始化所有适配器（应用启动时调用） */
  static async initialize(): Promise<void> {
    await AdapterRegistry.connection.initialize();
  }

  /** 关闭所有适配器 */
  static async close(): Promise<void> {
    if (AdapterRegistry._connection) {
      await AdapterRegistry._connection.close();
      AdapterRegistry._connection = null;
    }
    AdapterRegistry._auth = null;
    AdapterRegistry._storage = null;
    AdapterRegistry._notification = null;
  }

  /**
   * 重置注册表（仅用于测试）
   */
  static _reset(): void {
    AdapterRegistry._connection = null;
    AdapterRegistry._auth = null;
    AdapterRegistry._storage = null;
    AdapterRegistry._notification = null;
  }
}
