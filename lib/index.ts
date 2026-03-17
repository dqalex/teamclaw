/**
 * Lib 公开 API 统一出口
 * 
 * 原则：
 * 1. Components 只能通过此文件访问 lib 能力
 * 2. 内部模块不从此文件导入（避免循环依赖）
 * 3. 每个导出都应该是稳定的公开 API
 */

// ============================================================
// 渲染模板相关（slot-sync + icon-render）
// ============================================================
export {
  // 核心同步函数
  extractSlotsFromMd,
  syncMdToHtml,
  syncHtmlToMd,
  generateIframeScript,
  updateMdSlots,
  cleanEditorAttributes,
  injectSlotsToHtml,
  generateMdFromTemplate,
  // 类型
  type SlotDef,
  type SlotValue,
  type SlotType,
  type SlotSyncResult,
} from './slot-sync';

export { renderIconsInHtml } from './icon-render';

// ============================================================
// SOP 配置
// ============================================================
export {
  SOP_STAGE_CONFIG,
  getStageConfig,
  type SOPStageStatus,
  type StageStatusConfig,
} from './sop-config';

// ============================================================
// SSE 事件管理
// ============================================================
export {
  sseHandlerRegistry,
  type SSEEventType,
  type SSEEvent,
  type SSEEventHandler,
} from './sse-events';

// ============================================================
// 日志工具
// ============================================================
export { logger, dataLogger } from './logger';

// ============================================================
// 工具策略配置
// ============================================================
export {
  TOOL_SECTIONS,
  PROFILE_OPTIONS,
  normalizeToolName,
  isAllowedByPolicy,
  resolveToolProfilePolicy,
  type ToolSection,
  type ToolInfo,
} from './tool-policy';
