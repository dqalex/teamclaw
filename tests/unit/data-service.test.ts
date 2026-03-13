/**
 * data-service.ts 单元测试
 * 测试 API 请求去重、错误处理、超时逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, projectsApi, tasksApi } from '@/lib/data-service';

// Mock fetch
const originalFetch = global.fetch;

describe('data-service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  // ============================================================
  // apiRequest - 基本功能
  // ============================================================

  describe('apiRequest', () => {
    it('成功请求应该返回 data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'test', name: 'Test' }),
      });

      const result = await apiRequest<{ id: string; name: string }>('/api/test');
      expect(result.data).toEqual({ id: 'test', name: 'Test' });
      expect(result.error).toBeUndefined();
    });

    it('HTTP 错误应该返回 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      const result = await apiRequest('/api/test');
      expect(result.error).toBe('Not found');
      expect(result.data).toBeUndefined();
    });

    it('HTTP 错误无 JSON 应该返回状态码', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await apiRequest('/api/test');
      expect(result.error).toBe('HTTP 500');
    });

    it('网络错误应该返回错误消息', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));

      const result = await apiRequest('/api/test');
      expect(result.error).toBe('Network failed');
    });

    it('未知错误应该返回通用消息', async () => {
      global.fetch = vi.fn().mockRejectedValue('Unknown error');

      const result = await apiRequest('/api/test');
      expect(result.error).toBe('Network request failed');
    });

    it('AbortError 应该返回超时错误', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const result = await apiRequest('/api/test');
      expect(result.error).toBe('Request timeout (30s)');
    });
  });

  // ============================================================
  // apiRequest - GET 去重
  // ============================================================

  describe('apiRequest GET deduplication', () => {
    it('相同 URL 的并发 GET 请求应该共享同一个 Promise', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: callCount }),
        });
      });

      // 同时发起 3 个相同 URL 的请求
      const [r1, r2, r3] = await Promise.all([
        apiRequest<{ count: number }>('/api/test'),
        apiRequest<{ count: number }>('/api/test'),
        apiRequest<{ count: number }>('/api/test'),
      ]);

      // 只应该调用一次 fetch
      expect(callCount).toBe(1);
      expect(r1.data?.count).toBe(1);
      expect(r2.data?.count).toBe(1);
      expect(r3.data?.count).toBe(1);
    });

    it('不同 URL 的请求不应该去重', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: callCount }),
        });
      });

      await Promise.all([
        apiRequest('/api/test1'),
        apiRequest('/api/test2'),
      ]);

      expect(callCount).toBe(2);
    });

    it('POST 请求不应该去重', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: callCount }),
        });
      });

      await Promise.all([
        apiRequest('/api/test', { method: 'POST', body: '{}' }),
        apiRequest('/api/test', { method: 'POST', body: '{}' }),
      ]);

      expect(callCount).toBe(2);
    });
  });

  // ============================================================
  // API Clients - 公开接口测试
  // ============================================================

  describe('projectsApi', () => {
    it('getAll 应该发送 GET 请求', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'p1', name: 'Project' }]),
      });

      await projectsApi.getAll();

      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('/api/projects');
      // GET 是默认方法，可能未显式设置
      expect(options.method ?? 'GET').toBe('GET');
    });

    it('create 应该发送 POST 请求', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'new', name: 'New Project' }),
      });

      const result = await projectsApi.create({ name: 'New Project' } as any);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Project' }),
        })
      );
      expect(result.data).toEqual({ id: 'new', name: 'New Project' });
    });

    it('update 应该发送 PUT 请求', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: '1', name: 'Updated' }),
      });

      const result = await projectsApi.update('1', { name: 'Updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        })
      );
      expect(result.data).toEqual({ id: '1', name: 'Updated' });
    });

    it('delete 应该发送 DELETE 请求', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await projectsApi.delete('1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('tasksApi', () => {
    it('getAll 带过滤参数应该构建正确 URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await tasksApi.getAll({ projectId: 'p1' });

      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('/api/tasks?projectId=p1');
      expect(options.method ?? 'GET').toBe('GET');
    });

    it('getAll 无参数应该不带查询字符串', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await tasksApi.getAll();

      expect(global.fetch).toHaveBeenCalled();
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('/api/tasks');
      expect(options.method ?? 'GET').toBe('GET');
    });
  });
});
