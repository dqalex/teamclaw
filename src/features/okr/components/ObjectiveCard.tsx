'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit3 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { KeyResultRow } from './KeyResultRow';
import { CreateKeyResultDialog } from './CreateKeyResultDialog';
import type { ObjectiveItem, KeyResultItem } from '@/domains/okr/store';

interface ObjectiveCardProps {
  objective: ObjectiveItem;
  onUpdateObjective: (id: string, data: Partial<ObjectiveItem>) => void;
  onDeleteObjective: (id: string) => void;
  onCreateKeyResult: (data: { objectiveId: string; title: string; targetValue: number; unit?: string; description?: string }) => void;
  onUpdateKeyResult: (id: string, data: { currentValue?: number; status?: string }) => void;
  onDeleteKeyResult: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  archived: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

const PROGRESS_COLOR: Record<string, string> = {
  default: '[&>div]:bg-blue-500',
  high: '[&>div]:bg-green-500',
};

export function ObjectiveCard({
  objective,
  onUpdateObjective,
  onDeleteObjective,
  onCreateKeyResult,
  onUpdateKeyResult,
  onDeleteKeyResult,
}: ObjectiveCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [krDialogOpen, setKrDialogOpen] = useState(false);

  const progressColor = objective.progress >= 70 ? PROGRESS_COLOR.high : PROGRESS_COLOR.default;

  const handleCreateKR = (data: { title: string; targetValue: number; unit?: string; description?: string }) => {
    onCreateKeyResult({ ...data, objectiveId: objective.id });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const statusKey = objective.status === 'active' ? 'active' : objective.status === 'completed' ? 'completed' : objective.status === 'archived' ? 'archived' : 'draft';

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-700">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold truncate text-gray-900 dark:text-gray-100">{objective.title}</h3>
                <Badge variant="default" className={`text-xs ${STATUS_STYLES[objective.status] || ''}`}>
                  {t(`okr.${statusKey}`)}
                </Badge>
              </div>
              {objective.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{objective.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {objective.dueDate && (
              <span className="text-xs text-gray-400 dark:text-gray-500 mr-2">
                {formatDate(objective.dueDate)}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(t('okr.deleteObjectiveConfirm'))) onDeleteObjective(objective.id);
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={objective.progress} className={`h-2 flex-1 ${progressColor}`} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-12 text-right">{objective.progress}%</span>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('okr.keyResults')} ({objective.keyResults?.length || 0})
            </span>
            <Button variant="ghost" size="sm" onClick={() => setKrDialogOpen(true)} className="text-blue-500 hover:text-blue-600">
              <Plus className="h-4 w-4 mr-1" />
              {t('okr.createKeyResult')}
            </Button>
          </div>
          {objective.keyResults && objective.keyResults.length > 0 ? (
            <div className="space-y-1">
              {objective.keyResults.map((kr) => (
                <KeyResultRow
                  key={kr.id}
                  kr={kr}
                  onUpdate={onUpdateKeyResult}
                  onDelete={onDeleteKeyResult}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
              {t('okr.noKeyResults')}
            </p>
          )}
          <CreateKeyResultDialog
            open={krDialogOpen}
            onOpenChange={setKrDialogOpen}
            onSubmit={handleCreateKR}
          />
        </CardContent>
      )}
    </Card>
  );
}
