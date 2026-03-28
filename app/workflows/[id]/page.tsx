'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppShell from '@/shared/layout/AppShell';
import { Button, Input, Badge } from '@/shared/ui';
import type { WorkflowNode } from '@/core/workflow/types';
import clsx from 'clsx';
import {
  ArrowLeft, Plus, Trash2, GitBranch, Save, Play,
  Circle, GitBranchIcon, Repeat, GitFork, Bot, MousePointer,
  FileText, CheckSquare, Loader2, Clock, AlertCircle,
  LayoutList, Network, Send, Archive, ChevronDown, ChevronRight,
} from 'lucide-react';

import { WorkflowCanvas } from '@/features/workflow-editor';

type Tab = 'nodes' | 'runs';
type ActiveTab = 'nodes' | 'runs';
type ViewMode = 'list' | 'canvas';

// 节点类型配置
const NODE_TYPES: { type: WorkflowNode['type']; label: string; icon: typeof Circle; color: string }[] = [
  { type: 'sop', label: 'SOP', icon: FileText, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  { type: 'ai_auto', label: 'AI Auto', icon: Bot, color: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400' },
  { type: 'input', label: 'Input', icon: MousePointer, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  { type: 'render', label: 'Render', icon: FileText, color: 'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400' },
  { type: 'condition', label: 'Condition', icon: GitBranchIcon, color: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400' },
  { type: 'loop', label: 'Loop', icon: Repeat, color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400' },
  { type: 'parallel', label: 'Parallel', icon: GitFork, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
  { type: 'workflow_call', label: 'Sub Workflow', icon: GitBranch, color: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400' },
];

function getTypeConfig(type: string) {
  return NODE_TYPES.find(n => n.type === type) || NODE_TYPES[0];
}

function generateNodeId() {
  return 'node_' + Math.random().toString(36).substring(2, 9);
}

// API 辅助函数（客户端安全）
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Workflow 和 Run 类型（避免导入 schema 中的服务端模块）
interface WorkflowData {
  id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  entryNodeId: string | null;
  status: string;
  version: number;
  updatedAt: string | null;
  createdAt: string;
}

interface RunData {
  id: string;
  workflowId: string;
  taskId: string | null;
  status: string;
  currentNodeId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  nodeHistory: Record<string, unknown>[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  published: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  archived: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
};

// 节点属性配置面板
function NodeConfigPanel({
  node,
  allNodes,
  onUpdate,
  onClose,
}: {
  node: WorkflowNode | null;
  allNodes: WorkflowNode[];
  onUpdate: (partial: Partial<WorkflowNode>) => void;
  onClose: () => void;
}) {
  if (!node) return null;
  const typeConfig = getTypeConfig(node.type);

  const updateField = (field: string, value: unknown) => {
    onUpdate({ [field]: value } as Partial<WorkflowNode>);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', typeConfig.color)}>
            <typeConfig.icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{node.label}</span>
          <span className="text-[10px] text-slate-400 font-mono">{node.type}</span>
        </div>
        <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" onClick={onClose}>
          &times;
        </button>
      </div>

      {/* 配置表单 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 通用：描述 */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
          <Input
            value={node.description ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('description', e.target.value)}
            placeholder="Optional description"
            className="text-sm"
          />
        </div>

        {/* SOP 节点：SOP 模板 ID */}
        {node.type === 'sop' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">SOP Template ID</label>
            <Input
              value={String(node.sopStageConfig?.templateId ?? '')}
              onChange={(e) => updateField('sopStageConfig', { ...(node.sopStageConfig ?? {}), templateId: e.target.value })}
              placeholder="sop_xxxxx"
              className="text-sm font-mono"
            />
          </div>
        )}

        {/* AI Auto 节点：提示词 */}
        {node.type === 'ai_auto' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prompt Template</label>
              <textarea
                value={node.promptTemplate ?? ''}
                onChange={(e) => updateField('promptTemplate', e.target.value)}
                placeholder="AI prompt template..."
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Trust Level</label>
              <select
                value={node.trustLevel ?? 'auto'}
                onChange={(e) => updateField('trustLevel', e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="auto">Auto</option>
                <option value="supervised">Supervised</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </>
        )}

        {/* Input/Render 节点：仅需 description（已显示） */}

        {/* Condition 节点 */}
        {node.type === 'condition' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Condition Expression</label>
              <Input
                value={node.condition?.expression ?? ''}
                onChange={(e) => updateField('condition', { ...(node.condition ?? { expression: '', trueNext: '', falseNext: '' }), expression: e.target.value })}
                placeholder="e.g. output.success === true"
                className="text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">True → Next Node</label>
              <select
                value={node.condition?.trueNext ?? ''}
                onChange={(e) => updateField('condition', { ...(node.condition ?? { expression: '', trueNext: '', falseNext: '' }), trueNext: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">-- Select --</option>
                {allNodes.filter(n => n.id !== node.id).map(n => (
                  <option key={n.id} value={n.id}>{n.label || n.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">False → Next Node</label>
              <select
                value={node.condition?.falseNext ?? ''}
                onChange={(e) => updateField('condition', { ...(node.condition ?? { expression: '', trueNext: '', falseNext: '' }), falseNext: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">-- Select --</option>
                {allNodes.filter(n => n.id !== node.id).map(n => (
                  <option key={n.id} value={n.id}>{n.label || n.id}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Loop 节点 */}
        {node.type === 'loop' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Max Iterations</label>
              <Input
                type="number"
                value={node.loop?.maxIterations ?? 10}
                onChange={(e) => updateField('loop', { ...(node.loop ?? { maxIterations: 10, breakCondition: '', bodyNodeId: '' }), maxIterations: parseInt(e.target.value) || 1 })}
                min={1}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Break Condition</label>
              <Input
                value={node.loop?.breakCondition ?? ''}
                onChange={(e) => updateField('loop', { ...(node.loop ?? { maxIterations: 10, breakCondition: '', bodyNodeId: '' }), breakCondition: e.target.value })}
                placeholder="e.g. output.done === true"
                className="text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Body Node</label>
              <select
                value={node.loop?.bodyNodeId ?? ''}
                onChange={(e) => updateField('loop', { ...(node.loop ?? { maxIterations: 10, breakCondition: '', bodyNodeId: '' }), bodyNodeId: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">-- Select --</option>
                {allNodes.filter(n => n.id !== node.id).map(n => (
                  <option key={n.id} value={n.id}>{n.label || n.id}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Parallel 节点 */}
        {node.type === 'parallel' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Join Type</label>
              <select
                value={node.parallel?.joinType ?? 'all'}
                onChange={(e) => updateField('parallel', { ...(node.parallel ?? { branches: [], joinType: 'all' }), joinType: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All (wait all branches)</option>
                <option value="any">Any (wait any branch)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Branches</label>
              <div className="text-xs text-slate-400 space-y-1">
                {node.nextNodes.map((nId, i) => {
                  const target = allNodes.find(n => n.id === nId);
                  return (
                    <div key={nId} className="flex items-center gap-2 p-1.5 rounded bg-slate-50 dark:bg-slate-800">
                      <span className="text-slate-500">Branch {i + 1}:</span>
                      <span className="font-mono">{target?.label ?? nId}</span>
                    </div>
                  );
                })}
                {node.nextNodes.length === 0 && <span className="italic">No branches configured</span>}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Manage branches via the nextNodes connections</p>
            </div>
          </>
        )}

        {/* Workflow Call 节点 */}
        {node.type === 'workflow_call' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sub Workflow ID</label>
            <Input
              value={String(node.sopStageConfig?.workflowId ?? '')}
              onChange={(e) => updateField('sopStageConfig', { ...(node.sopStageConfig ?? {}), workflowId: e.target.value })}
              placeholder="workflow_xxxxx"
              className="text-sm font-mono"
            />
          </div>
        )}

        {/* 通用：超时设置 */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Timeout (seconds)</label>
          <Input
            type="number"
            value={node.timeout ?? ''}
            onChange={(e) => updateField('timeout', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="No timeout"
            min={0}
            className="text-sm"
          />
        </div>

        {/* 通用：审批要求 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="requireApproval"
            checked={node.requireApproval ?? false}
            onChange={(e) => updateField('requireApproval', e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600"
          />
          <label htmlFor="requireApproval" className="text-xs text-slate-600 dark:text-slate-400">Require approval</label>
        </div>
      </div>
    </div>
  );
}

// Run 详情面板
function RunDetailPanel({ run, nodes }: { run: RunData; nodes: WorkflowNode[] }) {
  const history = run.nodeHistory ?? [];

  return (
    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
      {/* 基本信息行 */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        {run.startedAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Started: {new Date(run.startedAt).toLocaleTimeString()}
          </span>
        )}
        {run.completedAt && (
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3 h-3" />
            Completed: {new Date(run.completedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* 节点执行时间线 */}
      {history.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No node execution history recorded.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Node Execution Timeline</p>
          {history.map((record, idx) => {
            const rec = record as Record<string, unknown>;
            const nodeId = (rec.nodeId as string) ?? '';
            const status = (rec.status as string) ?? 'unknown';
            const nodeType = (rec.nodeType as string) ?? '';
            const node = nodes.find(n => n.id === nodeId);
            const typeConfig = node ? getTypeConfig(nodeType || node.type) : null;

            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className={clsx(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  status === 'completed' ? 'bg-green-500' :
                  status === 'failed' ? 'bg-red-500' :
                  status === 'active' ? 'bg-blue-500 animate-pulse' :
                  'bg-slate-300 dark:bg-slate-600',
                )} />
                {typeConfig && (
                  <span className={clsx('px-1 py-0.5 rounded text-[10px]', typeConfig.color)}>
                    {nodeType || node?.type}
                  </span>
                )}
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {node?.label || nodeId.slice(0, 8)}
                </span>
                <span className="text-slate-400 capitalize">{status}</span>
                {rec.startedAt != null && (
                  <span className="text-slate-400 ml-auto">
                    {new Date(String(rec.startedAt)).toLocaleTimeString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WorkflowDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab: ActiveTab = searchParams?.get('tab') === 'runs' ? 'runs' : 'nodes';

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [runs, setRuns] = useState<RunData[]>([]);

  // 本地编辑状态
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [entryNodeId, setEntryNodeId] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // 加载 workflow 数据
  const loadWorkflow = useCallback(async () => {
    if (!workflowId) return;
    const data = await apiFetch<WorkflowData>(`/api/workflows/${workflowId}`);
    if (data) {
      setWorkflow(data);
      setNodes((data.nodes ?? []) as WorkflowNode[]);
      setEntryNodeId(data.entryNodeId ?? '');
      setEditingName(data.name);
      setEditingDesc(data.description ?? '');
    }
    setLoading(false);
  }, [workflowId]);

  // 加载 runs 数据
  const loadRuns = useCallback(async () => {
    if (!workflowId) return;
    const res = await apiFetch<{ data: RunData[] }>(`/api/workflow-runs?workflowId=${workflowId}`);
    if (res?.data) setRuns(res.data);
  }, [workflowId]);

  useEffect(() => {
    loadWorkflow();
    loadRuns();
  }, [loadWorkflow, loadRuns]);

  // 自动保存（防抖 500ms）
  const autoSave = useCallback((newNodes: WorkflowNode[], newEntry: string, name?: string, desc?: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      await apiFetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(name !== undefined ? { name } : {}),
          ...(desc !== undefined ? { description: desc } : {}),
          nodes: newNodes,
          entryNodeId: newEntry,
        }),
      });
      // 重新加载以获取服务端返回的最新数据
      await loadWorkflow();
      setSaving(false);
    }, 500);
  }, [workflowId, loadWorkflow]);

  const handleUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    const updated = nodes.map(n => n.id === nodeId ? { ...n, label } : n);
    setNodes(updated);
    autoSave(updated, entryNodeId);
  }, [nodes, entryNodeId, autoSave]);

  const handleSetEntry = useCallback((newEntry: string) => {
    setEntryNodeId(newEntry);
    autoSave(nodes, newEntry);
  }, [nodes, autoSave]);

  const handleUpdateName = useCallback((name: string) => {
    setEditingName(name);
    autoSave(nodes, entryNodeId, name);
  }, [nodes, entryNodeId, autoSave]);

  const handleUpdateDesc = useCallback((desc: string) => {
    setEditingDesc(desc);
    autoSave(nodes, entryNodeId, editingName, desc);
  }, [nodes, entryNodeId, editingName, autoSave]);

  const handleAddNode = useCallback((type: WorkflowNode['type']) => {
    const id = generateNodeId();
    const newNode: WorkflowNode = {
      id,
      type,
      label: `${type}_${nodes.length + 1}`,
      nextNodes: [],
      prevNodes: nodes.length > 0 ? [nodes[nodes.length - 1].id] : [],
    };

    const updated = nodes.map(n => {
      if (n.id === entryNodeId && n.nextNodes.length === 0) {
        return { ...n, nextNodes: [id] };
      }
      return n;
    });

    const newEntry = entryNodeId || id;
    const newNodes = [...updated, newNode];
    setNodes(newNodes);
    setSelectedNodeId(id);
    setShowAddNode(false);
    setEntryNodeId(newEntry);
    autoSave(newNodes, newEntry);
  }, [nodes, entryNodeId, autoSave]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const updated = nodes
      .filter(n => n.id !== nodeId)
      .map(n => ({
        ...n,
        nextNodes: n.nextNodes.filter(id => id !== nodeId),
        prevNodes: n.prevNodes.filter(id => id !== nodeId),
      }));

    const newEntry = entryNodeId === nodeId ? (updated[0]?.id ?? '') : entryNodeId;
    setNodes(updated);
    setSelectedNodeId(null);
    setEntryNodeId(newEntry);
    autoSave(updated, newEntry);
  }, [nodes, entryNodeId, autoSave]);

  const handleDelete = useCallback(async () => {
    await apiFetch(`/api/workflows/${workflowId}`, { method: 'DELETE' });
    router.push('/workflows');
  }, [workflowId, router]);

  const handleRun = useCallback(async () => {
    await apiFetch('/api/workflow-runs/' + workflowId, {
      method: 'POST',
      body: JSON.stringify({ action: 'advance' }),
    });
    loadRuns();
  }, [workflowId, loadRuns]);

  // 更新节点配置（属性面板使用）
  const handleUpdateNodeConfig = useCallback((nodeId: string, partial: Partial<WorkflowNode>) => {
    const updated = nodes.map(n => n.id === nodeId ? { ...n, ...partial } : n);
    setNodes(updated);
    autoSave(updated, entryNodeId);
  }, [nodes, entryNodeId, autoSave]);

  // 状态切换（发布/归档）
  const handleStatusChange = useCallback(async (newStatus: string) => {
    const data = await apiFetch<WorkflowData>(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
    if (data) {
      setWorkflow(data);
    }
  }, [workflowId]);

  // Run 详情展开状态
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading...
        </div>
      </AppShell>
    );
  }

  if (!workflow) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full text-slate-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          Workflow not found
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          {/* 基本信息 */}
          <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-700/50 space-y-3">
            <div className="flex items-center gap-3">
              <Input
                value={editingName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateName(e.target.value)}
                className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 h-auto flex-1"
                placeholder="Workflow name"
              />
              <span className={clsx('px-2.5 py-1 text-xs rounded-full font-medium capitalize', statusColors[workflow.status ?? 'draft'] ?? '')}>
                {workflow.status}
              </span>
              {workflow.status === 'draft' && (
                <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => handleStatusChange('published')}>
                  <Send className="w-3.5 h-3.5 mr-1" /> Publish
                </Button>
              )}
              {workflow.status === 'published' && (
                <Button size="sm" variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                  onClick={() => handleStatusChange('archived')}>
                  <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                </Button>
              )}
              {workflow.status === 'archived' && (
                <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => handleStatusChange('draft')}>
                  Restore to Draft
                </Button>
              )}
            </div>
            <Input
              value={editingDesc}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateDesc(e.target.value)}
              className="text-sm text-slate-500 border-0 px-0 focus-visible:ring-0 h-auto"
              placeholder="Description (optional)"
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700/50 px-4 md:px-6">
            <button
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'nodes'
                  ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
              onClick={() => setActiveTab('nodes')}
            >
              Nodes ({nodes.length})
            </button>
            <button
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'runs'
                  ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
              onClick={() => setActiveTab('runs')}
            >
              Runs ({runs.length})
            </button>
          </div>

          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
            <div className="flex flex-1 overflow-hidden">
              {/* 左侧：Canvas/列表 */}
              <div className={clsx('flex-1 overflow-auto p-4 md:p-6 space-y-3', selectedNodeId && 'md:mr-80')}>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddNode(!showAddNode)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Node
                  </Button>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors',
                        viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                      )}
                      onClick={() => setViewMode('list')}
                      title="List view"
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                    <button
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors',
                        viewMode === 'canvas' ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                      )}
                      onClick={() => setViewMode('canvas')}
                      title="Canvas view"
                    >
                      <Network className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showAddNode && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                    {NODE_TYPES.map(({ type, label, icon: Icon, color }) => (
                      <button
                        key={type}
                        className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', color)}
                        onClick={() => handleAddNode(type)}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Canvas 视图 */}
                {viewMode === 'canvas' && (
                  <WorkflowCanvas
                    nodes={nodes}
                    entryNodeId={entryNodeId}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    onDeleteNode={handleDeleteNode}
                    onUpdateNodeLabel={handleUpdateNodeLabel}
                    onAddNode={handleAddNode}
                    onSetEntry={handleSetEntry}
                  />
                )}

                {/* 列表视图 */}
                {viewMode === 'list' && (
                nodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
                    <GitBranch className="w-10 h-10 opacity-30" />
                    <p className="text-sm">No nodes yet. Add your first node to get started.</p>
                  </div>
                ) : (
                <div className="space-y-2">
                  {nodes.map((node, index) => {
                    const typeConfig = getTypeConfig(node.type);
                    const Icon = typeConfig.icon;
                    const isSelected = selectedNodeId === node.id;
                    const isEntry = entryNodeId === node.id;

                    return (
                      <div
                        key={node.id}
                        className={clsx(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                          isSelected
                            ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-950/30'
                            : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600',
                        )}
                        onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      >
                        <div className="flex-shrink-0 w-6 text-center">
                          {isEntry ? (
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center" title="Entry node">
                              <Play className="w-2.5 h-2.5 text-white ml-0.5" />
                            </div>
                          ) : (
                            <div className="text-xs text-slate-300 dark:text-slate-600 font-mono">{index + 1}</div>
                          )}
                        </div>

                        <div className={clsx('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', typeConfig.color)}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <input
                              value={node.label}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleUpdateNodeLabel(node.id, e.target.value)
                              }
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              className="font-medium text-sm bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 w-full"
                            />
                            <span className={clsx('px-1.5 py-0.5 text-[10px] rounded font-mono', typeConfig.color)}>
                              {node.type}
                            </span>
                          </div>
                          {node.description && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{node.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {node.nextNodes.length > 0 && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                → {node.nextNodes.map(id => {
                                  const next = nodes.find(n => n.id === id);
                                  return next ? next.label : id;
                                }).join(', ')}
                              </span>
                            )}
                            {node.trustLevel && (
                              <span className="text-[10px] text-slate-400">
                                trust: {node.trustLevel}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-colors"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                )
                )}

                {nodes.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Entry Node
                    </label>
                    <select
                      value={entryNodeId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSetEntry(e.target.value)}
                      className="w-full max-w-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.label || n.id}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 右侧：节点属性面板 */}
              {selectedNodeId && (
                <div className="hidden md:flex w-80 flex-shrink-0 flex-col border-l border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-auto">
                  <NodeConfigPanel
                    node={nodes.find(n => n.id === selectedNodeId) ?? null}
                    allNodes={nodes}
                    onUpdate={(partial) => selectedNodeId && handleUpdateNodeConfig(selectedNodeId, partial)}
                    onClose={() => setSelectedNodeId(null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Runs Tab */}
          {activeTab === 'runs' && (
            <div className="p-4 md:p-6 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" size="sm" onClick={handleRun}>
                  <Play className="w-3.5 h-3.5 mr-1" />
                  Run Workflow
                </Button>
              </div>
              {runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
                  <Clock className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No runs yet. Click &quot;Run&quot; to start execution.</p>
                </div>
              ) : (
                runs.slice().reverse().map(run => {
                  const isExpanded = expandedRunId === run.id;
                  return (
                    <div key={run.id} className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <div className={clsx(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                          run.status === 'completed' ? 'bg-green-500' :
                          run.status === 'failed' ? 'bg-red-500' :
                          run.status === 'paused' ? 'bg-amber-500' :
                          'bg-slate-300 dark:bg-slate-600',
                        )} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{run.id.slice(0, 8)}</span>
                          <div className="text-xs text-slate-400">
                            status: {run.status}
                            {run.currentNodeId && ` | node: ${run.currentNodeId}`}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {run.startedAt ? new Date(run.startedAt).toLocaleString() : ''}
                        </span>
                      </div>
                      {isExpanded && (
                        <RunDetailPanel run={run} nodes={nodes} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-700/50">
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete Workflow
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
