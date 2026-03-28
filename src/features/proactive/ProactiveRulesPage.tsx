'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/shared/layout/AppShell';
import {
  Button, Input, Badge, Switch, Select, Dialog,
  DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui';
import { useProactiveRulesStore } from './store';
import clsx from 'clsx';
import {
  Plus, Search, Zap, Trash2, Edit2, MoreVertical, Filter, RefreshCw,
} from 'lucide-react';

/** 触发条件类型列表 */
const TRIGGER_TYPES = [
  'task_overdue',
  'delivery_queue_size',
  'project_progress',
  'sop_knowledge_missing',
  'member_joined',
  'skill_health_check',
  'skill_promotion_ready',
  'custom',
] as const;

type TriggerType = (typeof TRIGGER_TYPES)[number];

const priorityColors: Record<string, string> = {
  low: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  high: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

export default function ProactiveRulesPage() {
  const { t } = useTranslation();
  const {
    rules,
    loading,
    initialized,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleEnabled,
  } = useProactiveRulesStore();

  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formTriggerType, setFormTriggerType] = useState<TriggerType>('task_overdue');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formCooldown, setFormCooldown] = useState(60);
  const [formConfig, setFormConfig] = useState('{}');

  // 初始化加载
  useEffect(() => {
    if (!initialized) fetchRules();
  }, [initialized, fetchRules]);

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
    return rules.filter(r => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rules, search]);

  // 重置表单
  const resetForm = useCallback(() => {
    setFormName('');
    setFormTriggerType('task_overdue');
    setFormPriority('medium');
    setFormEnabled(true);
    setFormCooldown(60);
    setFormConfig('{}');
    setEditingRule(null);
  }, []);

  // 打开编辑对话框
  const openEdit = useCallback((ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    setEditingRule(ruleId);
    setFormName(rule.name);
    setFormTriggerType((rule.triggerType ?? 'task_overdue') as TriggerType);
    setFormPriority((rule.priority ?? 'medium') as 'low' | 'medium' | 'high');
    setFormEnabled(rule.enabled ?? true);
    setFormCooldown(rule.cooldownMinutes ?? 60);
    setFormConfig(JSON.stringify(rule.config ?? {}, null, 2));
    setMenuOpen(null);
  }, [rules]);

  // 提交表单（创建或更新）
  const handleSubmit = useCallback(async () => {
    if (!formName.trim()) return;

    let configObj: Record<string, unknown> = {};
    try {
      configObj = JSON.parse(formConfig || '{}');
    } catch {
      configObj = {};
    }

    if (editingRule) {
      await updateRule(editingRule, {
        name: formName.trim(),
        triggerType: formTriggerType,
        priority: formPriority,
        enabled: formEnabled,
        cooldownMinutes: formCooldown,
        config: configObj,
      });
    } else {
      await createRule({
        name: formName.trim(),
        triggerType: formTriggerType,
        priority: formPriority,
        enabled: formEnabled,
        cooldownMinutes: formCooldown,
        config: configObj,
      });
    }

    setShowCreateDialog(false);
    resetForm();
  }, [formName, formTriggerType, formPriority, formEnabled, formCooldown, formConfig, editingRule, createRule, updateRule, resetForm]);

  // 删除
  const handleDelete = useCallback(async (id: string) => {
    await deleteRule(id);
    setMenuOpen(null);
  }, [deleteRule]);

  // 切换启用
  const handleToggle = useCallback(async (id: string, checked: boolean) => {
    await toggleEnabled(id, checked);
  }, [toggleEnabled]);

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {/* 工具栏 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('common.search') || 'Search...'}
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="ghost" onClick={() => fetchRules()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              {t('common.refresh')}
            </Button>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              {t('common.create')}
            </Button>
          </div>

          {/* 规则列表 */}
          {loading && !initialized ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              {t('common.loading') || 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <Zap className="w-12 h-12 opacity-30" />
              <p className="text-sm">
                {rules.length === 0
                  ? t('proactive.noRules')
                  : t('proactive.noMatchingRules')}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(rule => (
                <div
                  key={rule.id}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-primary-300 dark:hover:border-primary-700/50 hover:shadow-sm transition-all bg-white dark:bg-slate-800/50"
                >
                  {/* 图标 */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {rule.name}
                      </h3>
                      <span className={clsx('px-2 py-0.5 text-[10px] rounded-full font-medium', priorityColors[rule.priority ?? 'medium'])}>
                        {rule.priority}
                      </span>
                      <Badge variant="default" className="text-[10px]">
                        {rule.triggerType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{t('proactive.cooldown')}: {rule.cooldownMinutes ?? 60}min</span>
                      {rule.projectId && <span>{t('proactive.projectScoped')}</span>}
                      {rule.createdAt && (
                        <span>{new Date(rule.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* 启用开关 */}
                  <Switch
                    checked={rule.enabled ?? true}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleToggle(rule.id, e.target.checked)}
                  />

                  {/* 操作菜单 */}
                  <div className="relative flex-shrink-0">
                    <button
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors',
                        menuOpen === rule.id
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700',
                      )}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === rule.id ? null : rule.id);
                      }}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                    {menuOpen === rule.id && (
                      <div className="absolute right-0 top-9 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 py-1">
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          onClick={() => openEdit(rule.id)}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> {t('common.edit')}
                        </button>
                        <hr className="my-1 border-slate-100 dark:border-slate-700" />
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => handleDelete(rule.id)}
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

        {/* 创建/编辑对话框 */}
        <Dialog open={showCreateDialog || !!editingRule} onOpenChange={(open: boolean) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? t('proactive.editRule') : t('proactive.createRule')}
              </DialogTitle>
              <DialogDescription>
                {editingRule ? t('proactive.editRuleDesc') : t('proactive.createRuleDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.name')} *
                </label>
                <Input
                  value={formName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
                  placeholder={t('proactive.ruleNamePlaceholder')}
                  autoFocus
                />
              </div>

              {/* 触发类型 + 优先级 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('proactive.triggerType')}
                  </label>
                  <select
                    value={formTriggerType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormTriggerType(e.target.value as TriggerType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TRIGGER_TYPES.map(tt => (
                      <option key={tt} value={tt}>{t(`proactive.triggers.${tt}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('proactive.priority')}
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">{t('proactive.priorityLow')}</option>
                    <option value="medium">{t('proactive.priorityMedium')}</option>
                    <option value="high">{t('proactive.priorityHigh')}</option>
                  </select>
                </div>
              </div>

              {/* 冷却时间 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('proactive.cooldown')} ({t('proactive.minutes')})
                </label>
                <Input
                  type="number"
                  value={formCooldown}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormCooldown(parseInt(e.target.value) || 60)}
                  min={1}
                  max={1440}
                />
              </div>

              {/* 配置 JSON */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('proactive.config')}
                </label>
                <textarea
                  value={formConfig}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormConfig(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* 启用 */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={formEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEnabled(e.target.checked)}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('common.enabled')}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={!formName.trim()}>
                {editingRule ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
