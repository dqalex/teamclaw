/**
 * v1.1 Phase 1A: 适配器模块统一导出
 */

// 接口定义
export type {
  IConnectionAdapter,
  IAuthAdapter,
  IStorageAdapter,
  INotificationAdapter,
  IDrizzleInstance,
  DbDialect,
} from './types';

// 适配器实现
export { SqliteConnectionAdapter } from './db/sqlite-connection-adapter';
export { SupabaseConnectionAdapter } from './db/supabase-connection-adapter';
export { CloudBaseConnectionAdapter } from './db/cloudbase-connection-adapter';
export { LocalAuthAdapter } from './auth/local-auth-adapter';
export { LocalStorageAdapter } from './storage/local-storage-adapter';
export { ConsoleNotificationAdapter } from './notification/console-notification-adapter';

// 注册表
export { AdapterRegistry } from './registry';
