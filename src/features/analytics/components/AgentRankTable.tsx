'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Trophy, Medal, Award } from 'lucide-react';

export interface AgentStat {
  agentId: string;
  agentName: string;
  tokenCount: number;
  completedTasks: number;
}

interface AgentRankTableProps {
  agents: AgentStat[];
}

// 排名奖牌图标
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-amber-400" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-slate-300 dark:text-slate-400" />;
  if (rank === 3) return <Award className="w-4 h-4 text-amber-600 dark:text-amber-500" />;
  return <span className="w-4 h-4 flex items-center justify-center text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{rank}</span>;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function AgentRankTable({ agents }: AgentRankTableProps) {
  const { t } = useTranslation();

  if (agents.length === 0) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {t('analytics.noEvents')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
            <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>#</th>
            <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('analytics.agentName')}</th>
            <th className="text-right py-3 px-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('analytics.tokenUsage')}</th>
            <th className="text-right py-3 px-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('analytics.tasksCompleted')}</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, idx) => (
            <tr
              key={agent.agentId}
              className={clsx(
                'border-b transition-colors hover:bg-white/50 dark:hover:bg-white/5',
                idx < 3 && 'bg-amber-50/30 dark:bg-amber-500/5',
              )}
              style={{ borderColor: 'var(--border)' }}
            >
              <td className="py-3 px-3">
                <RankBadge rank={idx + 1} />
              </td>
              <td className="py-3 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                {agent.agentName}
              </td>
              <td className="py-3 px-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {formatNumber(agent.tokenCount)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {agent.completedTasks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
