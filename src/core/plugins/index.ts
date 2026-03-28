/**
 * v1.1 Sprint 7: 插件系统模块导出
 */

export type {
  OpenClawPlugin,
  PluginType,
  PluginStatus,
  PluginSource,
  PluginCapabilities,
  PluginDependencies,
  PluginAuthor,
  PluginState,
  PluginStatusMap,
  IPluginRegistry,
  PluginConfigRequest,
  PluginListItem,
} from './types';

export { PluginRegistry, getPluginRegistry } from './registry';
