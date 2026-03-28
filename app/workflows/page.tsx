'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppShell from '@/shared/layout/AppShell';

import { Button, Input, Badge } from '@/shared/ui';
import { useWorkflowStore } from '@/domains/workflow/store';
import clsx from 'clsx';
import {
  Plus, Search, GitBranch, Trash2, Edit2, Play,
  FileText, MoreVertical, ChevronRight, Send, Archive, RotateCcw,
} from 'lucide-react';

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  published: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  archived: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
};

export default function WorkflowsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    workflows,
    loading,
    initialized,
    fetchWorkflows,
    createWorkflow,
    deleteWorkflowAsync,
    updateWorkflowAsync,
  } = useWorkflowStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // 初始化加载
  useEffect(() => {
    if (!initialized) {
      fetchWorkflows();
    }
  }, [initialized, fetchWorkflows]);

  // 点击外部关闭菜单
  useEffect(() => {
    if (menuOpen) {
      const handler = () => setMenuOpen(null);
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [menuOpen]);

  // 过滤列表
  const filtered = useMemo(() => {
    return workflows.filter(w => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [workflows, statusFilter, search]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    const workflow = await createWorkflow({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      nodes: [],
      entryNodeId: undefined as unknown as string,
    });
    if (workflow) {
      setShowCreateDialog(false);
      setNewName('');
      setNewDescription('');
      router.push(`/workflows/${workflow.id}`);
    }
  }, [newName, newDescription, createWorkflow, router]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteWorkflowAsync(id);
    setMenuOpen(null);
  }, [deleteWorkflowAsync]);

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    await updateWorkflowAsync(id, { status } as Parameters<typeof updateWorkflowAsync>[1]);
    setMenuOpen(null);
  }, [updateWorkflowAsync]);

  // 节点类型统计
  const getNodeStats = useCallback((nodeCount: number) => {
    if (!nodeCount) return '';
    const n = Array.isArray(nodeCount) ? nodeCount.length : 0;
    return n > 0 ? t('workflow.nodeCount', { count: n }) : '';
  }, [t]);

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {/* 工具栏 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('workflow.searchPlaceholder')}
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'draft', 'published', 'archived'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 text-xs rounded-lg transition-colors capitalize',
                    statusFilter === s
                      ? 'bg-primary-500 text-white dark:bg-primary-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {t('common.create')}
            </Button>
          </div>

          {/* 列表 */}
          {loading && !initialized ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              {t('common.loading')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <GitBranch className="w-12 h-12 opacity-30" />
              <p className="text-sm">
                {workflows.length === 0
                  ? t('workflow.noWorkflows')
                  : t('workflow.noMatch')}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(workflow => (
                <div
                  key={workflow.id}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-primary-300 dark:hover:border-primary-700/50 hover:shadow-sm transition-all cursor-pointer bg-white dark:bg-slate-800/50"
                  onClick={() => router.push(`/workflows/${workflow.id}`)}
                >
                  {/* 图标 */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {workflow.name}
                      </h3>
                      <span className={clsx('px-2 py-0.5 text-[10px] rounded-full font-medium', statusColors[workflow.status ?? 'draft'] || '')}>
                        {workflow.status}
                      </span>
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {workflow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {getNodeStats(workflow.nodes?.length ?? 0)}
                      </span>
                      <span>v{workflow.version}</span>
                      {workflow.updatedAt && (
                        <span>
                          {new Date(workflow.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="relative flex-shrink-0">
                    <button
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors',
                        menuOpen === workflow.id
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700',
                      )}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === workflow.id ? null : workflow.id);
                      }}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                    {menuOpen === workflow.id && (
                      <div className="absolute right-0 top-9 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 py-1">
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            router.push(`/workflows/${workflow.id}`);
                            setMenuOpen(null);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                               >
                          <Edit2 className="w-3.5 h-3.5" /> {t('common.edit')}
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            router.push(`/workflows/${workflow.id}?tab=runs`);
                            setMenuOpen(null);
                          }}
                        >
                          <Play className="w-3.5 h-3.5" /> {t('workflow.runs')}
                        </button>
                        {workflow.status === 'draft' && (
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleStatusChange(workflow.id, 'published');
                            }}
                          >
                            <Send className="w-3.5 h-3.5" /> {t('workflow.publish')}
                        </button>
                        )}
                        {workflow.status === 'published' && (
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleStatusChange(workflow.id, 'archived');
                            }}
                          >
                            <Archive className="w-3.5 h-3.5" /> {t('workflow.archive')}
                        </button>
                        )}
                        {workflow.status === 'archived' && (
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleStatusChange(workflow.id, 'draft');
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> {t('workflow.restore')}
                        </button>
                        )}
                        <hr className="my-1 border-slate-100 dark:border-slate-700" />
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDelete(workflow.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 创建对话框 */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateDialog(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('workflow.createTitle')}
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('workflow.name')} *
                </label>
                <Input
                  value={newName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                  placeholder={t('workflow.namePlaceholder')}
                  autoFocus
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('workflow.descriptionLabel')}
                </label>
                <Input
                  value={newDescription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDescription(e.target.value)}
                  placeholder={t('workflow.descriptionPlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={!newName.trim()}>
                  {t('common.create')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
