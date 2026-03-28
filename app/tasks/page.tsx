'use client';

import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  Plus,
  LayoutGrid,
  List,
  Edit2,
  Milestone as MilestoneIcon,
} from 'lucide-react';
import { Button, Input, Select } from '@/shared/ui';
import { useProjectStore } from '@/domains';
import ConfirmDialog from '@/shared/layout/ConfirmDialog';
import AppShell from '@/shared/layout/AppShell';

import MilestoneManager from '@/features/milestone-tracker/MilestoneManager';

// 懒加载大型抽屉组件（仅在打开任务详情时加载）
const TaskDrawer = dynamic(() => import('@/features/task-board/TaskDrawer'), { ssr: false });
import TaskCard from './components/TaskCard';
import TaskBoardView from './components/TaskBoardView';
import TaskListView from './components/TaskListView';
import TaskBatchBar from './components/TaskBatchBar';
import TaskCreateDialog from './components/TaskCreateDialog';
import TaskContextMenu from './components/TaskContextMenu';
import { useTasksPage } from './hooks/useTasksPage';

export default function TasksPage() {
  const tp = useTasksPage();
  const { t } = useTranslation();
  const { setCurrentProject } = useProjectStore();

  // 项目筛选器选项
  const projectFilterOptions = [
    { value: '', label: t('tasks.allProjects') },
    ...tp.projects.map(p => ({ value: p.id, label: p.name })),
  ];

  return (
    <AppShell>

      <main className="flex-1 p-6 overflow-auto">
        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            {/* 项目筛选器 */}
            <Select
              value={tp.currentProjectId || ''}
              onChange={e => setCurrentProject(e.target.value || null)}
              options={projectFilterOptions}
              className="py-1.5 text-sm w-40"
            />
            {/* 里程碑按钮 */}
            {tp.currentProjectId && (
              <Button size="sm" variant="secondary" onClick={() => tp.setShowMilestoneManager(tp.currentProjectId)}>
                <MilestoneIcon className="w-3.5 h-3.5" /> {t('milestones.title')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => tp.setViewMode('board')}
                className={clsx('p-1.5 rounded-l-lg transition-colors', tp.viewMode === 'board' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}
                title={t('tasks.boardView')}
              >
                <LayoutGrid className="w-4 h-4" style={{ color: tp.viewMode === 'board' ? 'var(--text-primary)' : 'var(--text-tertiary)' }} />
              </button>
              <button
                onClick={() => tp.setViewMode('list')}
                className={clsx('p-1.5 rounded-r-lg transition-colors', tp.viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}
                title={t('tasks.listView')}
              >
                <List className="w-4 h-4" style={{ color: tp.viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-tertiary)' }} />
              </button>
            </div>
            {/* 创建按钮 */}
            <Button size="sm" onClick={() => tp.setShowQuickInput(true)}>
              <Plus className="w-3.5 h-3.5" /> {t('tasks.create')}
            </Button>
          </div>
        </div>

        {/* 批量操作栏 */}
        {tp.selectionMode && (
          <TaskBatchBar
            selectedCount={tp.selectedTaskIds.size}
            pushing={tp.pushing}
            pushError={tp.pushError}
            gwConnected={tp.gwConnected}
            STATUS_COLUMNS={tp.STATUS_COLUMNS}
            showBatchStatusMenu={tp.showBatchStatusMenu}
            setShowBatchStatusMenu={tp.setShowBatchStatusMenu}
            onBatchStatusChange={tp.handleBatchStatusChange}
            onBatchDelete={() => tp.batchDeleteConfirm.requestConfirm(true)}
            onBatchPush={tp.handleBatchPush}
            onSelectAll={tp.selectAllVisible}
            onClearSelection={tp.clearSelection}
            onClearPushError={() => tp.setPushError(null)}
          />
        )}

        {/* 快速创建输入框 */}
        {tp.showQuickInput && (
          <div className="mb-4 flex items-center gap-2">
            <Input
              ref={tp.quickInputRef}
              value={tp.quickTitle}
              onChange={e => tp.setQuickTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && tp.quickTitle.trim()) tp.handleQuickCreate(tp.quickTitle);
                if (e.key === 'Escape') { tp.setShowQuickInput(false); tp.setQuickTitle(''); }
              }}
              onBlur={() => { setTimeout(() => { if (!tp.quickTitle.trim()) { tp.setShowQuickInput(false); tp.setQuickTitle(''); } }, 150); }}
              className="flex-1"
              placeholder={t('tasks.quickCreatePlaceholder')}
              autoFocus
            />
            <Button variant="secondary" onClick={() => { tp.setNewTask({ ...tp.newTask, projectId: tp.currentProjectId || '' }); tp.setShowNewTaskDialog(true); }} title={t('tasks.openDetailForm')}>
              <Edit2 className="w-3.5 h-3.5" /> {t('tasks.detail')}
            </Button>
            <Button variant="secondary" onClick={() => { tp.setShowQuickInput(false); tp.setQuickTitle(''); }}>{t('common.cancel')}</Button>
          </div>
        )}

        {/* 看板/列表视图 */}
        {tp.viewMode === 'board' ? (
          <TaskBoardView
            swimlaneData={tp.swimlaneData}
            tasksByStatus={tp.tasksByStatus}
            STATUS_COLUMNS={tp.STATUS_COLUMNS}
            PRIORITY_MAP={tp.PRIORITY_MAP}
            sopTemplates={tp.sopTemplates}
            selectedTaskIds={tp.selectedTaskIds}
            selectionMode={tp.selectionMode}
            currentProjectId={tp.currentProjectId}
            isSwimLaneView={tp.isSwimLaneView}
            collapsedLanes={tp.collapsedLanes}
            collapsedStatusColumns={tp.collapsedStatusColumns}
            dragTaskId={tp.dragTaskId}
            dragMilestoneId={tp.dragMilestoneId}
            dragOverTarget={tp.dragOverTarget}
            onDragStart={tp.handleDragStart}
            onDragOver={tp.handleDragOver}
            onDragLeave={tp.handleDragLeave}
            onDrop={tp.handleDrop}
            onMilestoneDragStart={tp.handleMilestoneDragStart}
            onMilestoneDrop={tp.handleMilestoneDrop}
            onToggleLane={tp.toggleLane}
            onToggleStatusColumn={tp.toggleStatusColumn}
            onToggleSelection={tp.toggleTaskSelection}
            onOpenDrawer={tp.setDrawerTaskId}
            onMenuToggle={(taskId, e) => {
              if (tp.menuTaskId === taskId) { tp.setMenuTaskId(null); tp.setMenuPosition(null); }
              else {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                tp.setMenuTaskId(taskId);
                tp.setMenuPosition({ top: rect.bottom + 4, left: rect.right - 128 });
              }
            }}
            onShowMilestoneManager={tp.setShowMilestoneManager}
            getMemberName={tp.getMemberName}
            t={t}
            syncedLabel={t('tasks.synced')}
            dragHereLabel={t('tasks.dragHere')}
            taskCountLabel={t('tasks.taskCount')}
            noTasksHint={t('tasks.noTasksHint')}
            milestoneTitle={t('milestones.title')}
          />
        ) : (
          <TaskListView
            filteredTasks={tp.filteredTasks}
            projects={tp.projects}
            STATUS_COLUMNS={tp.STATUS_COLUMNS}
            PRIORITY_MAP={tp.PRIORITY_MAP}
            getMemberName={tp.getMemberName}
            onOpenDrawer={tp.setDrawerTaskId}
            onRequestDelete={(id) => tp.deleteAction.requestConfirm(id)}
            t={t}
          />
        )}
      </main>

      {/* 详细新建任务对话框 */}
      {tp.showNewTaskDialog && (
        <TaskCreateDialog
          newTask={tp.newTask}
          setNewTask={tp.setNewTask}
          currentProjectId={tp.currentProjectId}
          projects={tp.projects}
          members={tp.members}
          milestones={tp.milestones}
          sopTemplates={tp.sopTemplates}
          onSubmit={tp.handleCreateTask}
          onClose={() => tp.setShowNewTaskDialog(false)}
          onShowMilestoneManager={tp.setShowMilestoneManager}
          t={t}
        />
      )}

      {/* 任务详情抽屉 */}
      {tp.drawerTask && (
        <TaskDrawer task={tp.drawerTask} onClose={() => tp.setDrawerTaskId(null)} onDelete={() => tp.setDrawerTaskId(null)} />
      )}

      {/* 里程碑管理 */}
      {tp.showMilestoneManager && (
        <MilestoneManager projectId={tp.showMilestoneManager} onClose={() => tp.setShowMilestoneManager(null)} />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={tp.deleteAction.isOpen}
        onClose={tp.deleteAction.cancel}
        onConfirm={() => tp.deleteAction.confirm(async (id) => { await tp.deleteTaskAsync(id); })}
        title={t('common.confirm')} message={t('tasks.deleteConfirm')}
        confirmText={t('common.delete')} cancelText={t('common.cancel')}
        isLoading={tp.deleteAction.isLoading}
      />

      {/* 批量删除确认对话框 */}
      <ConfirmDialog
        isOpen={tp.batchDeleteConfirm.isOpen}
        onClose={tp.batchDeleteConfirm.cancel}
        onConfirm={() => tp.batchDeleteConfirm.confirm(tp.handleBatchDelete)}
        title={t('common.confirm')} message={`确定删除选中的 ${tp.selectedTaskIds.size} 个任务？此操作不可撤销。`}
        confirmText={t('common.delete')} cancelText={t('common.cancel')}
        isLoading={tp.batchDeleteConfirm.isLoading}
      />

      {/* 任务快捷菜单 */}
      {tp.menuTaskId && tp.menuPosition && (() => {
        const task = tp.tasks.find(t => t.id === tp.menuTaskId);
        if (!task) return null;
        return (
          <TaskContextMenu
            task={task}
            menuPosition={tp.menuPosition}
            menuRef={tp.menuRef as React.RefObject<HTMLDivElement>}
            STATUS_COLUMNS={tp.STATUS_COLUMNS}
            onStatusChange={tp.handleStatusChange}
            onDelete={async (taskId) => { await tp.deleteTaskAsync(taskId); }}
            onClose={() => { tp.setMenuTaskId(null); tp.setMenuPosition(null); }}
            deleteLabel={t('common.delete')}
          />
        );
      })()}
    </AppShell>
  );
}
