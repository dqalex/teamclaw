/**
 * event-bus.ts 单元测试
 * 测试 SSE 事件总线的核心功能
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock globalThis 存储
const mockGlobalThis: Record<string, unknown> = {};

// Mock controller
function createMockController() {
  const queue: Uint8Array[] = [];
  return {
    queue,
    enqueue: vi.fn((data: Uint8Array) => queue.push(data)),
    close: vi.fn(),
  } as unknown as ReadableStreamDefaultController;
}

describe('EventBus', () => {
  let eventBus: typeof import('@/lib/event-bus').eventBus;
  let EventBusClass: typeof import('@/lib/event-bus').EventBus;

  beforeEach(async () => {
    // 清理 globalThis
    delete (globalThis as Record<string, unknown>)['__teamclaw_event_bus__'];
    delete (globalThis as Record<string, unknown>)['__teamclaw_heartbeat_timer__'];

    // 动态导入获取新实例
    vi.resetModules();
    const mod = await import('@/lib/event-bus');
    eventBus = mod.eventBus;
    // EventBus 类通过内部 class 导出，无法直接访问，测试通过 eventBus 实例
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // addClient / removeClient
  // ============================================================

  describe('addClient', () => {
    it('应该添加客户端并返回 ID', () => {
      const controller = createMockController();
      const id = eventBus.addClient(controller);
      expect(id).toMatch(/^sse_\d+_\d+$/);
      expect(eventBus.clientCount).toBe(1);
    });

    it('应该支持多个客户端', () => {
      const c1 = createMockController();
      const c2 = createMockController();
      const id1 = eventBus.addClient(c1);
      const id2 = eventBus.addClient(c2);
      expect(id1).not.toBe(id2);
      expect(eventBus.clientCount).toBe(2);
    });

    it('超过最大连接数应该抛出错误', () => {
      // MAX_CLIENTS = 50
      for (let i = 0; i < 50; i++) {
        eventBus.addClient(createMockController());
      }
      expect(() => eventBus.addClient(createMockController())).toThrow('SSE max clients exceeded');
    });
  });

  describe('removeClient', () => {
    it('应该移除指定客户端', () => {
      const controller = createMockController();
      const id = eventBus.addClient(controller);
      expect(eventBus.clientCount).toBe(1);
      eventBus.removeClient(id);
      expect(eventBus.clientCount).toBe(0);
    });

    it('移除不存在的客户端应该无影响', () => {
      eventBus.removeClient('nonexistent');
      expect(eventBus.clientCount).toBe(0);
    });
  });

  // ============================================================
  // emit
  // ============================================================

  describe('emit', () => {
    it('应该向所有客户端广播事件', () => {
      const c1 = createMockController();
      const c2 = createMockController();
      eventBus.addClient(c1);
      eventBus.addClient(c2);

      eventBus.emit({ type: 'task.created', payload: { id: 't1' } });

      // 每个控制器应该收到编码的事件
      expect(c1.enqueue).toHaveBeenCalled();
      expect(c2.enqueue).toHaveBeenCalled();
    });

    it('事件应该包含时间戳', () => {
      const controller = createMockController();
      eventBus.addClient(controller);

      const before = Date.now();
      eventBus.emit({ type: 'task.updated', payload: { id: 't1' } });
      const after = Date.now();

      const call = (controller as { enqueue: ReturnType<typeof vi.fn> }).enqueue.mock.calls[0];
      const encoded = call[0] as Uint8Array;
      const str = new TextDecoder().decode(encoded);
      
      // 解析 SSE 格式: event: xxx\ndata: {...}\n\n
      const dataMatch = str.match(/data: ({.*?})\n/);
      expect(dataMatch).toBeTruthy();
      const event = JSON.parse(dataMatch![1]);
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });

    it('enqueue 失败应该移除客户端', () => {
      const controller = createMockController();
      (controller as { enqueue: ReturnType<typeof vi.fn> }).enqueue.mockImplementation(() => {
        throw new Error('Controller closed');
      });
      eventBus.addClient(controller);

      expect(eventBus.clientCount).toBe(1);
      eventBus.emit({ type: 'test', payload: {} });
      expect(eventBus.clientCount).toBe(0);
    });
  });

  // ============================================================
  // heartbeat
  // ============================================================

  describe('heartbeat', () => {
    it('应该向所有客户端发送心跳', () => {
      const controller = createMockController();
      eventBus.addClient(controller);

      eventBus.heartbeat();

      expect(controller.enqueue).toHaveBeenCalled();
      const call = (controller as { enqueue: ReturnType<typeof vi.fn> }).enqueue.mock.calls[0];
      const encoded = call[0] as Uint8Array;
      const str = new TextDecoder().decode(encoded);
      expect(str).toMatch(/^: heartbeat \d+\n\n$/);
    });
  });
});
