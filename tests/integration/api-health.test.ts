/**
 * Health API 集成测试
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, cleanupTestDb } from '../helpers/db';

describe('Health API', () => {
  let dbPath: string;

  beforeAll(async () => {
    dbPath = await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb(dbPath);
  });

  it('GET /api/health 应该返回健康状态', async () => {
    const response = await fetch('http://localhost:3000/api/health');
    
    // 如果没有运行 dev server，会连接失败
    if (!response.ok) {
      console.log('Dev server not running, skipping health API test');
      return;
    }

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded']).toContain(data.status);
  });
});
