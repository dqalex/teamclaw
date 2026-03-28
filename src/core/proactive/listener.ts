/**
 * Proactive Engine Listener
 * 提供 onEventChange 接口，供 API Route 在写操作后调用
 * 触发规则评估（异步、不阻塞主流程）
 */
import { evaluateProactiveRules } from './evaluator';

// 需要评估的事件类型
type MonitoredEventType =
  | 'task_update' | 'delivery_update' | 'skill_update' | 'project_update' | 'milestone_update'
  | 'workflow_run_failed';

const MONITORED_EVENTS: Set<string> = new Set<string>([
  'task_update', 'delivery_update', 'skill_update', 'project_update', 'milestone_update',
  'workflow_run_failed',
]);

class ProactiveListener {
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    console.debug('[ProactiveEngine] Listener started, monitoring', MONITORED_EVENTS.size, 'event types');
  }

  /**
   * 供 API Route 调用：在写操作后触发规则评估
   * 异步执行，不阻塞主流程
   */
  onEventChange(eventType: string, data: Record<string, unknown>): void {
    if (!this.started || !MONITORED_EVENTS.has(eventType)) return;

    // 异步评估，不阻塞调用方
    evaluateProactiveRules(eventType, data).catch(err => {
      console.error('[ProactiveEngine] Evaluation failed:', err);
    });
  }
}

export const proactiveListener = new ProactiveListener();
