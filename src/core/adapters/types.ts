/**
 * v1.1 Phase 1A: 适配器接口定义
 *
 * 所有数据库、认证、存储、通知的抽象接口，
 * 支持通过 AdapterRegistry 按环境切换实现。
 */

// ============================================================
// Drizzle 实例类型（运行时无需具体 dialect 类型）
// ============================================================

/** Drizzle 数据库实例的通用接口（泛型版，保留方法链调用能力） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrizzleChain = { [method: string]: (...args: any[]) => DrizzleChain & PromiseLike<any> };

export interface IDrizzleInstance {
  select(columns?: unknown): DrizzleChain;
  insert(table: unknown): DrizzleChain;
  update(table: unknown): DrizzleChain;
  delete(table: unknown): DrizzleChain;
  run(query: unknown): DrizzleChain;
}

// ============================================================
// 数据库方言
// ============================================================

export type DbDialect = 'sqlite' | 'postgresql' | 'mysql';

// ============================================================
// 连接层适配器
// ============================================================

export interface IConnectionAdapter {
  /** 初始化数据库连接（WAL / 外键 / 缓存 / 超时等） */
  initialize(): Promise<void>;

  /** 健康检查：测试连接是否正常，返回延迟（ms） */
  healthCheck(): Promise<{ ok: boolean; latency: number }>;

  /** 关闭连接 */
  close(): Promise<void>;

  /** 获取 Drizzle ORM 实例 */
  getConnection(): IDrizzleInstance;

  /** 执行增量迁移（检测缺失表/列并添加） */
  migrate(): Promise<void>;

  /** 当前数据库方言 */
  getDialect(): DbDialect;
}

// ============================================================
// 认证适配器
// ============================================================

export interface IAuthAdapter {
  /** 使用安全算法哈希密码 */
  hashPassword(password: string): Promise<string>;

  /** 验证密码与哈希是否匹配 */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /** 生成认证 Token（如 JWT / Session） */
  createToken(payload: object): Promise<string>;

  /** 验证 Token 并解析载荷，无效返回 null */
  verifyToken(token: string): Promise<object | null>;
}

// ============================================================
// 存储适配器（文件/二进制数据）
// ============================================================

export interface IStorageAdapter {
  /** 存储数据（key 可以含路径分隔符） */
  save(key: string, data: Buffer): Promise<void>;

  /** 读取数据，不存在返回 null */
  load(key: string): Promise<Buffer | null>;

  /** 删除数据 */
  delete(key: string): Promise<void>;
}

// ============================================================
// 通知适配器
// ============================================================

export interface INotificationAdapter {
  /** 向指定用户发送通知 */
  send(userId: string, message: string, type: string): Promise<void>;
}
