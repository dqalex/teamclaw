/**
 * Workflow Canvas - DAG 可视化编辑器
 * MVP: 基于静态布局的节点+连线可视化，支持选中/编辑节点
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { WorkflowNode } from '@/core/workflow/types';
import {
  Circle, GitBranch, Repeat, GitFork, Bot, MousePointer,
  FileText, Zap, ArrowRight, Trash2, GripVertical,
} from 'lucide-react';

// ============================================================
// 节点类型配置
// ============================================================

const NODE_TYPE_CONFIG: Record<string, { labelKey: string; icon: typeof Circle; color: string; bg: string }> = {
  sop:            { labelKey: 'workflow.nodeType.sop',        icon: FileText,     color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/50' },
  ai_auto:        { labelKey: 'workflow.nodeType.aiAuto',     icon: Bot,          color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/50' },
  input:          { labelKey: 'workflow.nodeType.input',       icon: MousePointer, color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/50' },
  render:         { labelKey: 'workflow.nodeType.render',      icon: FileText,     color: 'text-pink-600 dark:text-pink-400',     bg: 'bg-pink-50 dark:bg-pink-950/50' },
  condition:      { labelKey: 'workflow.nodeType.condition',   icon: GitBranch,    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50' },
  loop:           { labelKey: 'workflow.nodeType.loop',        icon: Repeat,       color: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-950/50' },
  parallel:       { labelKey: 'workflow.nodeType.parallel',    icon: GitFork,      color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50' },
  workflow_call:  { labelKey: 'workflow.nodeType.subFlow',     icon: Zap,          color: 'text-teal-600 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-950/50' },
};

function getTypeConfig(type: string) {
  return NODE_TYPE_CONFIG[type] || NODE_TYPE_CONFIG.sop;
}

// ============================================================
// Props
// ============================================================

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  entryNodeId: string;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onDeleteNode: (id: string) => void;
  onUpdateNodeLabel: (id: string, label: string) => void;
  onAddNode: (type: WorkflowNode['type']) => void;
  onSetEntry: (id: string) => void;
}

// ============================================================
// 主组件
// ============================================================

export default function WorkflowCanvas({
  nodes,
  entryNodeId,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  onUpdateNodeLabel,
  onAddNode,
  onSetEntry,
}: WorkflowCanvasProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const submittedByEnterRef = useRef(false);

  // 计算节点布局（简单的垂直流布局）
  const layout = useMemo(() => {
    if (nodes.length === 0) return { nodePositions: new Map<string, { x: number; y: number }>(), connections: [] as Array<{ from: string; to: string; label?: string }> };

    // 拓扑排序
    const visited = new Set<string>();
    const order: string[] = [];

    function visit(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      const node = nodes.find(n => n.id === id);
      if (node) {
        node.nextNodes.forEach(visit);
        order.push(id);
      }
    }
    // 从入口节点开始
    if (entryNodeId) visit(entryNodeId);
    // 再访问未连接的节点
    nodes.forEach(n => { if (!visited.has(n.id)) visit(n.id); });

    // 计算位置（垂直排列，每行一个节点）
    const positions = new Map<string, { x: number; y: number }>();
    const centerX = 300;
    const startY = 60;
    const rowHeight = 100;

    order.forEach((id, index) => {
      const node = nodes.find(n => n.id === id);
      if (!node) return;

      // 特殊布局：condition 有两个分支，parallel 有多个分支
      if (node.type === 'condition' && node.condition) {
        positions.set(id, { x: centerX - 120, y: startY + index * rowHeight });
      } else if (node.type === 'parallel' && node.parallel) {
        positions.set(id, { x: centerX - 120, y: startY + index * rowHeight });
      } else {
        positions.set(id, { x: centerX, y: startY + index * rowHeight });
      }
    });

    // 连接线
    const connections: Array<{ from: string; to: string; label?: string }> = [];
    nodes.forEach(node => {
      node.nextNodes.forEach(nextId => {
        const label = node.type === 'condition' && node.condition
          ? (nextId === node.condition.trueNext ? t('workflow.canvas.trueBranch') : t('workflow.canvas.falseBranch'))
          : undefined;
        connections.push({ from: node.id, to: nextId, label });
      });
    });

    return { nodePositions: positions, connections };
  }, [nodes, entryNodeId]);

  // 双击编辑标签
  const handleDoubleClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setEditingNodeId(nodeId);
    setEditLabel(node.label);
    submittedByEnterRef.current = false;
  }, [nodes]);

  // 提交编辑
  const commitEdit = useCallback(() => {
    if (editingNodeId && editLabel.trim()) {
      onUpdateNodeLabel(editingNodeId, editLabel.trim());
    }
    setEditingNodeId(null);
    setEditLabel('');
  }, [editingNodeId, editLabel, onUpdateNodeLabel]);

  // 键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !submittedByEnterRef.current) {
      submittedByEnterRef.current = true;
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditingNodeId(null);
      setEditLabel('');
    }
  }, [commitEdit]);

  // 画布点击取消选中
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectNode(null);
    }
  }, [onSelectNode]);

  // 拖拽连接处理（简化：不做实际拖拽，只是视觉反馈）
  const canvasHeight = useMemo(() => {
    if (nodes.length === 0) return 300;
    return Math.max(300, (layout.nodePositions.size + 1) * 100 + 60);
  }, [nodes.length, layout.nodePositions.size]);

  return (
    <div className="relative w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30">
      {/* 空状态 */}
      {nodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <GitBranch className="w-12 h-12 opacity-30 mb-3" />
          <p className="text-sm">{t('workflow.canvas.empty') || 'No nodes yet'}</p>
          <p className="text-xs mt-1">{t('workflow.canvas.emptyHint') || 'Click "Add Node" to start building your workflow'}</p>
        </div>
      )}

      {/* 画布 */}
      <div
        ref={canvasRef}
        className="relative"
        style={{ height: canvasHeight, minHeight: 300 }}
        onClick={handleCanvasClick}
      >
        {/* SVG 连接线层 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {layout.connections.map((conn, idx) => {
            const from = layout.nodePositions.get(conn.from);
            const to = layout.nodePositions.get(conn.to);
            if (!from || !to) return null;

            const fromX = from.x + 160; // 节点宽度/2
            const fromY = from.y + 28;  // 节点高度/2
            const toX = to.x + 160;
            const toY = to.y + 28;

            return (
              <g key={`conn-${idx}`}>
                {/* 连线 */}
                <path
                  d={`M ${fromX} ${fromY + 16} C ${fromX} ${fromY + 60}, ${toX} ${toY - 44}, ${toX} ${toY}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="2"
                  strokeDasharray="none"
                  markerEnd="url(#arrowhead)"
                />
                {/* 标签 */}
                {conn.label && (
                  <text
                    x={fromX + (toX - fromX) / 4}
                    y={fromY + 40}
                    className="fill-slate-500 dark:fill-slate-400"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* 箭头定义 */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--border)" />
            </marker>
          </defs>
        </svg>

        {/* 节点层 */}
        {nodes.map(node => {
          const pos = layout.nodePositions.get(node.id);
          if (!pos) return null;
          const config = getTypeConfig(node.type);
          const Icon = config.icon;
          const isSelected = selectedNodeId === node.id;
          const isEntry = entryNodeId === node.id;
          const isEditing = editingNodeId === node.id;

          return (
            <div
              key={node.id}
              className={clsx(
                'absolute group rounded-xl border-2 transition-all duration-200 cursor-pointer',
                'bg-white dark:bg-slate-800 shadow-sm hover:shadow-md',
                isSelected
                  ? 'border-primary-500 shadow-md ring-2 ring-primary-200 dark:ring-primary-800'
                  : 'border-slate-200 dark:border-slate-700/50',
                isEntry && 'ring-2 ring-green-300 dark:ring-green-800',
              )}
              style={{
                left: pos.x,
                top: pos.y,
                width: 200,
                zIndex: isSelected ? 10 : 1,
              }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              onDoubleClick={() => handleDoubleClick(node.id)}
            >
              {/* 入口标记 */}
              {isEntry && (
                <div className="absolute -top-2 left-3 px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded-full font-medium">
                  {t('workflow.canvas.entry') || 'Entry'}
                </div>
              )}

              <div className="flex items-center gap-2 p-3">
                {/* 图标 */}
                <div className={clsx('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                  <Icon className={clsx('w-4 h-4', config.color)} />
                </div>

                {/* 标签 */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLabel(e.target.value)}
                      onBlur={() => {
                        if (!submittedByEnterRef.current) commitEdit();
                      }}
                      onKeyDown={handleKeyDown}
                      className="w-full text-sm font-medium bg-slate-50 dark:bg-slate-900 border border-primary-300 dark:border-primary-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {node.label}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">{t(config.labelKey)}</p>
                </div>

                {/* 类型徽章 */}
                <div className={clsx('px-1.5 py-0.5 text-[9px] rounded font-medium', config.bg, config.color)}>
                  {node.type}
                </div>
              </div>

              {/* 连接点（底部） */}
              {node.nextNodes.length > 0 && (
                <div className="flex justify-center pb-2">
                  <div className="w-3 h-3 rounded-full bg-primary-400 border-2 border-white dark:border-slate-800" />
                </div>
              )}

              {/* 选中时显示操作栏 */}
              {isSelected && !isEditing && (
                <div className="flex items-center justify-end gap-1 px-3 pb-2 border-t border-slate-100 dark:border-slate-700/50">
                  {!isEntry && (
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSetEntry(node.id); }}
                      className="px-2 py-1 text-[10px] text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 rounded transition-colors"
                    >
                      {t('workflow.canvas.setEntry') || 'Set Entry'}
                    </button>
                  )}
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDoubleClick(node.id); }}
                    className="px-2 py-1 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteNode(node.id); }}
                    className="px-2 py-1 text-[10px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
