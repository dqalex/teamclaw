/**
 * 任务同步 单元测试
 *
 * 测试覆盖：
 * 1. parseTasksFromMarkdown — Markdown 解析为任务数据
 * 2. patchTaskStatusInMarkdown — 原地更新任务 checkbox 状态
 * 3. 边界情况 — 空文档、混合内容、特殊标记
 *
 * 运行方式：
 * npx vitest run tests/unit/task-sync.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseTasksFromMarkdown, patchTaskStatusInMarkdown } from '@/lib/sync/task-sync';
import type { Task, CheckItem } from '@/db/schema';

// ============================================================
// 辅助函数
// ============================================================

/** 创建一个最小化的 Task 对象用于测试 */
function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task_default',
    title: '默认任务',
    description: null,
    projectId: 'proj_1',
    assignees: [],
    creatorId: 'user_1',
    status: 'todo',
    progress: 0,
    priority: 'medium',
    deadline: null,
    checkItems: [],
    attachments: [],
    parentTaskId: null,
    crossProjects: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

// ============================================================
// parseTasksFromMarkdown
// ============================================================

describe('parseTasksFromMarkdown', () => {
  it('应该解析基础任务列表', () => {
    const md = `
## 待办事项

- [ ] 任务A
- [ ] 任务B

## 进行中

- [~] 任务C
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result).toHaveLength(3);

    expect(result[0].title).toBe('任务A');
    expect(result[0].status).toBe('todo');

    expect(result[1].title).toBe('任务B');
    expect(result[1].status).toBe('todo');

    expect(result[2].title).toBe('任务C');
    expect(result[2].status).toBe('in_progress');
  });

  it('应该解析各种 checkbox 标记', () => {
    const md = `
## 待办

- [ ] 待办任务
- [~] 进行中任务
- [-] 旧格式进行中
- [?] 审核中任务
- [x] 已完成任务
- [!] 高优先急任务
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result).toHaveLength(6);
    expect(result[0].status).toBe('todo');
    expect(result[1].status).toBe('in_progress');
    expect(result[2].status).toBe('in_progress');
    expect(result[3].status).toBe('reviewing');
    expect(result[4].status).toBe('completed');
    expect(result[5].status).toBe('todo');
    expect(result[5].priority).toBe('high');
  });

  it('应该解析 @成员 标记', () => {
    const md = `
## todo

- [ ] 任务 @alice @bob
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result[0].assignees).toEqual(['alice', 'bob']);
    expect(result[0].title).not.toContain('@');
  });

  it('应该解析进度百分比', () => {
    const md = `
## 进行中

- [~] 开发中的任务 [75%]
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result[0].progress).toBe(75);
    expect(result[0].title).not.toContain('%');
  });

  it('应该解析子任务（checkItems）', () => {
    const md = `
## todo

- [ ] 主任务
  - [ ] 子任务1
  - [x] 子任务2（已完成）
  - [ ] 子任务3
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result).toHaveLength(1);
    expect(result[0].checkItems).toHaveLength(3);
    expect(result[0].checkItems[0].text).toBe('子任务1');
    expect(result[0].checkItems[0].completed).toBe(false);
    expect(result[0].checkItems[1].text).toBe('子任务2（已完成）');
    expect(result[0].checkItems[1].completed).toBe(true);
  });

  it('应该解析描述（引用行）', () => {
    const md = `
## todo

- [ ] 任务标题
  > 这是描述内容
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result[0].description).toBe('这是描述内容');
  });

  it('应该解析截止日期', () => {
    const md = `
## todo

- [ ] 任务
  > 截止日期: 2026-06-30
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result[0].deadline).toBe('2026-06-30');
  });

  it('应该解析 [[文档链接]]', () => {
    const md = `
## todo

- [ ] 任务 [[设计文档]]
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result[0].docLinks).toContain('设计文档');
    expect(result[0].title).not.toContain('[[');
  });

  it('应该解析优先级子标题', () => {
    const md = `
## 待办事项

### 高优先级

- [ ] 紧急任务

### 低优先级

- [ ] 低优任务
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result[0].priority).toBe('high');
    expect(result[1].priority).toBe('low');
  });

  it('非任务区域的 checkbox 应该被忽略', () => {
    const md = `
## 待办事项

- [ ] 真正的任务

## 📝 当前进度

- [ ] 这不是任务
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('真正的任务');
  });

  it('空文档应该返回空数组', () => {
    expect(parseTasksFromMarkdown('')).toEqual([]);
    expect(parseTasksFromMarkdown('# 标题\n\n一段文字')).toEqual([]);
  });

  it('应该正确处理多任务连续排列', () => {
    const md = `
## todo

- [ ] A
- [ ] B
- [ ] C
`.trim();

    const result = parseTasksFromMarkdown(md);
    expect(result).toHaveLength(3);
    expect(result.map(t => t.title)).toEqual(['A', 'B', 'C']);
  });
});

// ============================================================
// patchTaskStatusInMarkdown
// ============================================================

describe('patchTaskStatusInMarkdown', () => {
  it('应该更新 checkbox 状态', () => {
    const original = `---
type: teamclaw:tasks
---

## 待办事项

- [ ] 任务A
- [ ] 任务B
`;

    const dbTasks = [
      makeTask({ title: '任务A', status: 'completed', priority: 'medium' }),
      makeTask({ title: '任务B', status: 'in_progress', priority: 'medium' }),
    ];

    const result = patchTaskStatusInMarkdown(original, dbTasks);
    expect(result).toContain('- [x] 任务A');
    expect(result).toContain('- [~] 任务B');
  });

  it('应该更新子任务 checkbox', () => {
    const original = `---
type: teamclaw:tasks
---

## todo

- [ ] 主任务
  - [ ] 子1
  - [ ] 子2
`;

    const dbTasks = [
      makeTask({
        title: '主任务',
        status: 'todo',
        priority: 'medium',
        checkItems: [
          { id: 'ci1', text: '子1', completed: true } as CheckItem,
          { id: 'ci2', text: '子2', completed: false } as CheckItem,
        ],
      }),
    ];

    const result = patchTaskStatusInMarkdown(original, dbTasks);
    expect(result).toContain('- [x] 子1');
    expect(result).toContain('- [ ] 子2');
  });

  it('应该将已删除任务移到归档区域', () => {
    const original = `---
type: teamclaw:tasks
---

## todo

- [ ] 存在的任务
- [ ] 已删除的任务
`;

    const dbTasks = [
      makeTask({ title: '存在的任务', status: 'todo', priority: 'medium' }),
      // 注意：不包含 "已删除的任务"
    ];

    const result = patchTaskStatusInMarkdown(original, dbTasks);
    expect(result).toContain('存在的任务');
    expect(result).toContain('## 📦 已归档');
    expect(result).toContain('已删除的任务');
  });

  it('不在任务区域的内容应原样保留', () => {
    const original = `---
type: teamclaw:tasks
---

## todo

- [ ] 任务

## 📝 进度说明

这是一段文字，不应被修改。
`;

    const dbTasks = [
      makeTask({ title: '任务', status: 'completed', priority: 'medium' }),
    ];

    const result = patchTaskStatusInMarkdown(original, dbTasks);
    expect(result).toContain('- [x] 任务');
    expect(result).toContain('## 📝 进度说明');
    expect(result).toContain('这是一段文字，不应被修改。');
  });

  it('高优先级待办应使用 ! 标记', () => {
    const original = `---
type: teamclaw:tasks
---

## todo

- [ ] 紧急任务
`;

    const dbTasks = [
      makeTask({ title: '紧急任务', status: 'todo', priority: 'high' }),
    ];

    const result = patchTaskStatusInMarkdown(original, dbTasks);
    expect(result).toContain('- [!] 紧急任务');
  });

  it('审核中应使用 ? 标记', () => {
    const original = `---
type: teamclaw:tasks
---

## reviewing

- [ ] 审核任务
`;

    const dbTasks = [
      makeTask({ title: '审核任务', status: 'reviewing', priority: 'medium' }),
    ];

    const result = patchTaskStatusInMarkdown(original, dbTasks);
    expect(result).toContain('- [?] 审核任务');
  });

  it('空任务列表时应保留文档结构', () => {
    const original = `---
type: teamclaw:tasks
---

## todo

一些说明文字
`;

    const result = patchTaskStatusInMarkdown(original, []);
    expect(result).toContain('## todo');
    expect(result).toContain('一些说明文字');
  });
});
