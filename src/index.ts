/**
 * TeamClaw 源代码入口
 * 
 * 新的目录结构：
 * - src/core/     - 基础设施（db, mcp, gateway）
 * - src/shared/   - 共享层（ui, hooks, lib, services, types, layout, editor）
 * - src/domains/  - 领域层（task, project, document, member, skill, chat, etc.）
 * - src/features/ - 功能层（task-board, chat-panel, sop-engine, etc.）
 */

// 核心层
export * from './core/db';
export * from './core/mcp/types';
export * from './core/gateway/gateway-types';

// 共享层
export * from './shared/ui';
export * from './shared/hooks';
export * from './shared/lib';
export * from './shared/services';
export * from './shared/types';
export * from './shared/layout';
