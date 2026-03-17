/**
 * Approval 领域模块
 */

// Store
export { useApprovalStore } from './store';

// 类型从 db/schema 导出
export type { ApprovalRequest, ApprovalHistory, ApprovalStrategy } from '@/db/schema';
