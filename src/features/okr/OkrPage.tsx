'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { Select } from '@/shared/ui/select';
import { useOkrStore } from '@/domains/okr/store';
import { useProjectStore } from '@/domains/project/store';
import { ObjectiveCard } from './components/ObjectiveCard';
import { CreateObjectiveDialog } from './components/CreateObjectiveDialog';

export default function OkrPage() {
  const { t } = useTranslation();
  const { objectives, loading, fetchObjectives, createObjective, updateObjective, deleteObjective, createKeyResult, updateKeyResult, deleteKeyResult } = useOkrStore();
  const { projects } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 从 URL hash 或默认选择第一个项目
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // 加载 Objectives
  useEffect(() => {
    if (selectedProjectId) {
      fetchObjectives(selectedProjectId);
    }
  }, [selectedProjectId, fetchObjectives]);

  const handleCreateObjective = async (data: { title: string; description?: string; dueDate?: string }) => {
    if (!selectedProjectId) return;
    try {
      await createObjective({ ...data, projectId: selectedProjectId });
    } catch {
      // error handled by store
    }
  };

  const handleUpdateObjective = async (id: string, data: Record<string, unknown>) => {
    try {
      await updateObjective(id, data);
    } catch {
      // error handled by store
    }
  };

  const handleDeleteObjective = async (id: string) => {
    try {
      await deleteObjective(id);
    } catch {
      // error handled by store
    }
  };

  const handleCreateKeyResult = async (data: { objectiveId: string; title: string; targetValue: number; unit?: string; description?: string }) => {
    try {
      await createKeyResult(data);
    } catch {
      // error handled by store
    }
  };

  const handleUpdateKeyResult = async (id: string, data: { currentValue?: number; status?: string }) => {
    try {
      await updateKeyResult(id, data);
    } catch {
      // error handled by store
    }
  };

  const handleDeleteKeyResult = async (id: string) => {
    try {
      await deleteKeyResult(id);
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-blue-500" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('okr.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-8 px-3 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm dark:text-gray-100"
          >
            <option value="">{t('okr.selectProject')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => selectedProjectId && fetchObjectives(selectedProjectId)}
            disabled={!selectedProjectId || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            disabled={!selectedProjectId}
          >
            {t('okr.createObjective')}
          </Button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedProjectId ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            {t('okr.selectProject')}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : objectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <Target className="h-12 w-12 mb-3 opacity-50" />
            <p>{t('okr.noObjectives')}</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {objectives.map((obj) => (
              <ObjectiveCard
                key={obj.id}
                objective={obj}
                onUpdateObjective={handleUpdateObjective}
                onDeleteObjective={handleDeleteObjective}
                onCreateKeyResult={handleCreateKeyResult}
                onUpdateKeyResult={handleUpdateKeyResult}
                onDeleteKeyResult={handleDeleteKeyResult}
              />
            ))}
          </div>
        )}
      </div>

      <CreateObjectiveDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateObjective}
      />
    </div>
  );
}
