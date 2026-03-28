/**
 * v1.1 Phase 1A: Adapter System 单元测试
 * 测试 LocalAuthAdapter、LocalStorageAdapter、AdapterRegistry
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';
import { LocalStorageAdapter } from '@/src/core/adapters/storage/local-storage-adapter';
import { AdapterRegistry } from '@/src/core/adapters/registry';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

// ============================================================
// LocalAuthAdapter
// ============================================================
describe('LocalAuthAdapter', () => {
  const auth = new LocalAuthAdapter();

  describe('hashPassword / verifyPassword', () => {
    it('应该正确哈希和验证密码', async () => {
      const hash = await auth.hashPassword('test-password-123');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('test-password-123');

      const isValid = await auth.verifyPassword('test-password-123', hash);
      expect(isValid).toBe(true);
    });

    it('错误密码应该返回 false', async () => {
      const hash = await auth.hashPassword('correct-password');
      const isValid = await auth.verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('空密码应该正常哈希', async () => {
      const hash = await auth.hashPassword('');
      expect(hash).toBeTruthy();
      expect(await auth.verifyPassword('', hash)).toBe(true);
      expect(await auth.verifyPassword('non-empty', hash)).toBe(false);
    });

    it('无效 hash 应该返回 false（不抛错）', async () => {
      const isValid = await auth.verifyPassword('any-password', 'invalid-hash');
      expect(isValid).toBe(false);
    });

    it('相同密码两次哈希应该产生不同结果（含 salt）', async () => {
      const hash1 = await auth.hashPassword('same-password');
      const hash2 = await auth.hashPassword('same-password');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createToken / verifyToken', () => {
    it('应该正确创建和验证 token', async () => {
      const payload = { userId: 'user-123', role: 'admin' };
      const token = await auth.createToken(payload);
      expect(token).toMatch(/^tca_/);

      const verified = await auth.verifyToken(token) as Record<string, unknown>;
      expect(verified).toBeTruthy();
      expect(verified.userId).toBe('user-123');
      expect(verified.role).toBe('admin');
    });

    it('验证后应该移除 exp 和 nonce 内部字段', async () => {
      const token = await auth.createToken({ userId: 'u1' });
      const verified = await auth.verifyToken(token) as Record<string, unknown>;
      expect(verified.exp).toBeUndefined();
      expect(verified.nonce).toBeUndefined();
    });

    it('错误 token 格式应该返回 null', async () => {
      expect(await auth.verifyToken('')).toBeNull();
      expect(await auth.verifyToken('invalid')).toBeNull();
      expect(await auth.verifyToken('tca_invalid')).toBeNull();
    });

    it('篡改签名后应该返回 null', async () => {
      const token = await auth.createToken({ userId: 'u1' });
      const tampered = token.slice(0, -1) + 'X';
      expect(await auth.verifyToken(tampered)).toBeNull();
    });

    it('空 payload 也能创建有效 token', async () => {
      const token = await auth.createToken({});
      const verified = await auth.verifyToken(token);
      expect(verified).toBeTruthy();
      expect(verified).toEqual({});
    });
  });
});

// ============================================================
// LocalStorageAdapter
// ============================================================
describe('LocalStorageAdapter', () => {
  let storageDir: string;
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    storageDir = join('/tmp', `test-storage-${Date.now()}`);
    mkdirSync(storageDir, { recursive: true });
    adapter = new LocalStorageAdapter(storageDir);
  });

  afterEach(() => {
    rmSync(storageDir, { recursive: true, force: true });
  });

  describe('resolvePath 安全检查', () => {
    it('应该拒绝含 .. 的路径', async () => {
      await expect(adapter.save('../etc/passwd', Buffer.from('hack'))).rejects.toThrow('不安全的存储 key');
    });

    it('应该拒绝绝对路径', async () => {
      await expect(adapter.save('/etc/passwd', Buffer.from('hack'))).rejects.toThrow('不安全的存储 key');
    });

    it('中间含 .. 也应该拒绝', async () => {
      await expect(adapter.save('foo/../../bar', Buffer.from('hack'))).rejects.toThrow('不安全的存储 key');
    });
  });

  describe('save / load / delete CRUD', () => {
    it('应该正确保存和加载数据', async () => {
      const data = Buffer.from('hello world');
      await adapter.save('test/file.txt', data);

      const loaded = await adapter.load('test/file.txt');
      expect(loaded).toBeTruthy();
      expect(loaded!.toString()).toBe('hello world');
    });

    it('应该支持子目录自动创建', async () => {
      await adapter.save('deep/nested/path/data.bin', Buffer.from('data'));
      const loaded = await adapter.load('deep/nested/path/data.bin');
      expect(loaded!.toString()).toBe('data');
    });

    it('不存在的 key 应该返回 null', async () => {
      const loaded = await adapter.load('nonexistent');
      expect(loaded).toBeNull();
    });

    it('应该正确删除文件', async () => {
      await adapter.save('to-delete.txt', Buffer.from('temp'));
      await adapter.delete('to-delete.txt');
      const loaded = await adapter.load('to-delete.txt');
      expect(loaded).toBeNull();
    });

    it('删除不存在的文件不应该报错', async () => {
      await expect(adapter.delete('nonexistent')).resolves.toBeUndefined();
    });

    it('应该能覆盖已有文件', async () => {
      await adapter.save('overwrite.txt', Buffer.from('v1'));
      await adapter.save('overwrite.txt', Buffer.from('v2'));
      const loaded = await adapter.load('overwrite.txt');
      expect(loaded!.toString()).toBe('v2');
    });
  });
});

// ============================================================
// AdapterRegistry
// ============================================================
describe('AdapterRegistry', () => {
  beforeEach(() => {
    AdapterRegistry._reset();
  });

  it('默认应该返回 SQLite 适配器', () => {
    const conn = AdapterRegistry.connection;
    expect(conn).toBeTruthy();
    expect(conn.getDialect()).toBe('sqlite');
  });

  it('auth 适配器应该是 LocalAuthAdapter 实例', () => {
    const auth = AdapterRegistry.auth;
    expect(auth).toBeInstanceOf(LocalAuthAdapter);
  });

  it('重复访问应该返回同一个实例（单例）', () => {
    const auth1 = AdapterRegistry.auth;
    const auth2 = AdapterRegistry.auth;
    expect(auth1).toBe(auth2);
  });

  it('_reset 后应该创建新实例', () => {
    const auth1 = AdapterRegistry.auth;
    AdapterRegistry._reset();
    const auth2 = AdapterRegistry.auth;
    // 新实例（引用不同但类型相同）
    expect(auth1).not.toBe(auth2);
    expect(auth2).toBeInstanceOf(LocalAuthAdapter);
  });

  it('storage 适配器应该使用环境变量或默认路径', () => {
    const storage = AdapterRegistry.storage;
    expect(storage).toBeTruthy();
  });
});
