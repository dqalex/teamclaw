'use client';

import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Users } from 'lucide-react';
import type { SetupFormData } from './useSetupWizard';

interface TeamStepProps {
  formData: SetupFormData;
  updateField: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
  onSkip: () => void;
}

export function TeamStep({ formData, updateField, onSkip }: TeamStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* 团队名称 */}
      <div>
        <Label>{t('setupWizard.teamName')}</Label>
        <Input
          value={formData.teamName}
          onChange={(e) => updateField('teamName', e.target.value)}
          placeholder={t('setupWizard.teamNamePlaceholder')}
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* 稍后添加提示 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
        onClick={onSkip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSkip(); }}
      >
        <Users className="w-4 h-4" />
        <span className="text-sm">{t('setupWizard.addMembersLater')}</span>
      </div>
    </div>
  );
}
