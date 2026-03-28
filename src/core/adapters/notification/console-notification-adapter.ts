/**
 * v1.1 Phase 1A: 控制台通知适配器
 *
 * 实现 INotificationAdapter，使用 console.log 输出通知。
 * 开发/调试用途，生产环境应替换为真实的推送实现。
 */

import type { INotificationAdapter } from '../types';

/**
 * 控制台通知适配器
 *
 * 将通知输出到控制台，用于开发和调试。
 */
export class ConsoleNotificationAdapter implements INotificationAdapter {
  /** 发送通知（打印到控制台） */
  async send(userId: string, message: string, type: string): Promise<void> {
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.log(
      `[Notification][${timestamp}] type=${type} user=${userId} message="${message}"`
    );
  }
}
