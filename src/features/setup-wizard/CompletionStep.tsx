'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { CheckCircle2, FolderOpen, Users, Globe } from 'lucide-react';
import type { SetupFormData } from './useSetupWizard';

interface CompletionStepProps {
  formData: SetupFormData;
  submitting: boolean;
  onSubmit: () => void;
  onSkipAll: () => void;
}

export function CompletionStep({ formData, submitting, onSubmit, onSkipAll }: CompletionStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 text-center">
      {/* 成功图标 */}
      <div className="flex justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-green-subtle, rgba(34, 197, 94, 0.1))' }}
        >
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
      </div>

      {/* 标题和描述 */}
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('setupWizard.setupComplete')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {t('setupWizard.setupCompleteDesc')}
        </p>
      </div>

      {/* 配置摘要 */}
      <div
        className="rounded-lg p-4 space-y-3 text-left"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderWidth: 1 }}
      >
        {/* 项目 */}
        <div className="flex items-center gap-3">
          <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('setupWizard.summaryProject')}</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {formData.projectName || t('common.unnamed')}
            </p>
          </div>
        </div>

        {/* 团队 */}
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('setupWizard.summaryTeam')}</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {formData.teamName || t('setupWizard.addMembersLater')}
            </p>
          </div>
        </div>

        {/* 网关 */}
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('setupWizard.summaryGateway')}</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {formData.gatewayUrl || t('setupWizard.summaryNotConfigured')}
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting && <Spinner size="sm" className="mr-1.5" />}
          {submitting ? t('setupWizard.creating') : t('setupWizard.goToDashboard')}
        </Button>

        {!submitting && (
          <button
            className="text-xs w-full text-center cursor-pointer"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={onSkipAll}
          >
            {t('setupWizard.skipAll')}
          </button>
        )}
      </div>
    </div>
  );
}
