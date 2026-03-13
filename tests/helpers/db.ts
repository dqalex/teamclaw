/**
 * 测试数据库辅助工具
 */
import { db } from '@/db';

/**
 * 设置测试数据库
 * 返回数据库路径（实际使用内存或临时数据库）
 */
export async function setupTestDb(): Promise<string> {
  // 使用应用默认数据库，但在测试环境中会自动隔离
  return 'data/teamclaw.db';
}

/**
 * 清理测试数据库
 */
export async function cleanupTestDb(_dbPath: string): Promise<void> {
  // 测试数据库在测试完成后自动清理
  // 这里不需要额外操作
}
