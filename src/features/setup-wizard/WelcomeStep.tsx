'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { User, Mail, FolderOpen } from 'lucide-react';
import type { SetupFormData } from './useSetupWizard';

interface WelcomeStepProps {
  formData: SetupFormData;
  updateField: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
  error: string | null;
  onValidate: (valid: boolean) => void;
}

export function WelcomeStep({ formData, updateField, error, onValidate }: WelcomeStepProps) {
  const { t } = useTranslation();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 防抖校验项目名称
  const handleProjectNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      updateField('projectName', value);

      // 防抖 500ms 校验
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onValidate(value.trim().length > 0);
      }, 500);
    },
    [updateField, onValidate]
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* 项目名称 */}
      <div>
        <Label required>{t('setupWizard.projectName')}</Label>
        <Input
          value={formData.projectName}
          onChange={handleProjectNameChange}
          placeholder={t('setupWizard.projectNamePlaceholder')}
          icon={<FolderOpen className="w-4 h-4" />}
          autoFocus
        />
        {error && (
          <p className="text-xs text-red-500 mt-1.5">{error || t('setupWizard.projectRequired')}</p>
        )}
      </div>

      {/* 项目描述 */}
      <div>
        <Label>{t('setupWizard.projectDesc')}</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder={t('setupWizard.projectDescPlaceholder')}
          rows={3}
        />
      </div>

      {/* 管理员名称 */}
      <div>
        <Label>{t('setupWizard.adminName')}</Label>
        <Input
          value={formData.adminName}
          onChange={(e) => updateField('adminName', e.target.value)}
          placeholder={t('setupWizard.adminNamePlaceholder')}
          icon={<User className="w-4 h-4" />}
        />
      </div>

      {/* 管理员邮箱 */}
      <div>
        <Label>{t('setupWizard.adminEmail')}</Label>
        <Input
          type="email"
          value={formData.adminEmail}
          onChange={(e) => updateField('adminEmail', e.target.value)}
          placeholder={t('setupWizard.adminEmailPlaceholder')}
          icon={<Mail className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}
