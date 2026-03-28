/**
 * v1.1 Phase 1A: 本地文件存储适配器
 *
 * 实现 IStorageAdapter，使用 Node.js fs 模块操作本地文件系统。
 * 存储根目录：data/storage/
 */

import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import type { IStorageAdapter } from '../types';

/** 默认存储根目录（相对于项目 data/） */
const DEFAULT_STORAGE_DIR = join(process.cwd(), 'data', 'storage');

/**
 * 本地文件存储适配器
 *
 * - key → 文件路径（自动将 `/` 转为目录分隔符）
 * - 自动创建不存在的目录
 * - 路径遍历保护：禁止 `..` 和绝对路径
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly rootDir: string;

  constructor(rootDir: string = DEFAULT_STORAGE_DIR) {
    this.rootDir = rootDir;
  }

  /** 确保 storage 根目录存在 */
  private ensureDir(): void {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }
  }

  /** 校验 key 安全性，返回绝对路径 */
  private resolvePath(key: string): string {
    // 安全检查：禁止路径遍历和绝对路径
    if (key.includes('..') || key.startsWith('/')) {
      throw new Error(`[LocalStorageAdapter] 不安全的存储 key: ${key}`);
    }
    const filePath = join(this.rootDir, key);
    return filePath;
  }

  /** 存储数据 */
  async save(key: string, data: Buffer): Promise<void> {
    this.ensureDir();
    const filePath = this.resolvePath(key);

    // 确保父目录存在
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, data);
  }

  /** 读取数据 */
  async load(key: string): Promise<Buffer | null> {
    const filePath = this.resolvePath(key);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath);
  }

  /** 删除数据 */
  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}
