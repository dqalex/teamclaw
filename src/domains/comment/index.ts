/**
 * Comment 领域模块
 */

// Store
export { useCommentStore } from './store';

// 类型从 db/schema 导出
export type { Comment, NewComment } from '@/db/schema';
