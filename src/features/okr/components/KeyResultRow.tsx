'use client';

import { useTranslation } from 'react-i18next';
import { Trash2, Edit3 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import type { KeyResultItem } from '@/domains/okr/store';

interface KeyResultItemProps {
  kr: KeyResultItem;
  onUpdate: (id: string, data: { currentValue?: number; status?: string }) => void;
  onDelete: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  at_risk: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function KeyResultRow({ kr, onUpdate, onDelete }: KeyResultItemProps) {
  const { t } = useTranslation();
  const progressPercent = kr.targetValue > 0 ? Math.min(Math.round((kr.currentValue / kr.targetValue) * 100), 100) : 0;

  const handleCurrentValueChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue) && newValue !== kr.currentValue) {
      onUpdate(kr.id, { currentValue: newValue });
    }
  };

  const cycleStatus = () => {
    const statuses = ['not_started', 'in_progress', 'completed'];
    const currentIdx = statuses.indexOf(kr.status);
    const nextIdx = (currentIdx + 1) % statuses.length;
    onUpdate(kr.id, { status: statuses[nextIdx] });
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{kr.title}</span>
          <Badge variant="default" className={`text-xs cursor-pointer ${STATUS_STYLES[kr.status] || ''}`} onClick={cycleStatus}>
            {t(`okr.${kr.status === 'not_started' ? 'notStarted' : kr.status === 'in_progress' ? 'inProgress' : kr.status === 'at_risk' ? 'atRisk' : 'completed'}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="h-2 flex-1 max-w-[200px]" />
          <input
            type="number"
            defaultValue={kr.currentValue}
            onBlur={handleCurrentValueChange}
            className="w-16 text-sm text-right bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 dark:bg-gray-800 dark:text-gray-100"
            title={t('okr.current')}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            / {kr.targetValue}{kr.unit || ''}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(kr.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
