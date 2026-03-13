/**
 * Gateway Provider 接口定义
 * 
 * 抽象不同 Gateway 平台的统一接口，支持 OpenClaw、Knot 等多平台扩展。
 * 
 * 设计原则：
 * - 接口方法返回统一类型，屏蔽平台差异
 * - 事件驱动：状态变化通过事件通知
 * - 连接管理：统一的连接/断开/重连逻辑
 * 
 * 类型定义已提取到 gateway-provider-types.ts 以避免循环依赖
 */

// 重新导出所有类型（保持向后兼容）
export type {
  ConnectionStatus,
  GatewayEventType,
  GatewayEventPayloads,
  GatewayEventHandler,
  GatewayProvider,
  ProviderConfig,
} from './gateway-provider-types';

/**
 * 创建 Gateway Provider
 * 
 * 根据配置类型创建对应的 Provider 实例。
 * 使用动态导入避免循环依赖。
 */
export async function createGatewayProvider(config: {
  type: 'openclaw' | 'knot' | string;
  url: string;
  token: string;
  options?: Record<string, unknown>;
}): Promise<import('./gateway-provider-types').GatewayProvider> {
  switch (config.type) {
    case 'openclaw': {
      // 动态导入避免循环依赖
      const { OpenClawProvider } = await import('./providers/openclaw-provider');
      return new OpenClawProvider(config.url, config.token, config.options);
    }
    // case 'knot':
    //   return new KnotProvider(config.url, config.token, config.options);
    default:
      throw new Error(`Unknown gateway provider type: ${config.type}`);
  }
}
