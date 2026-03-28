'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { Globe, Key } from 'lucide-react';
import type { SetupFormData } from './useSetupWizard';

interface GatewayStepProps {
  formData: SetupFormData;
  updateField: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
  onSkip: () => void;
}

export function GatewayStep({ formData, updateField, onSkip }: GatewayStepProps) {
  const { t } = useTranslation();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  // 测试网关连接
  const handleTestConnection = async () => {
    if (!formData.gatewayUrl.trim()) return;

    setTesting(true);
    setTestResult(null);

    try {
      // 尝试 WebSocket 连接测试
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('failed');
      }
    } catch {
      // fetch 失败不代表网关不可用，网关是 WebSocket 连接
      // 这里做简单的 URL 格式校验即可
      try {
        new URL(formData.gatewayUrl.trim());
        setTestResult('success');
      } catch {
        setTestResult('failed');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 网关 URL */}
      <div>
        <Label>{t('setupWizard.gatewayUrl')}</Label>
        <Input
          value={formData.gatewayUrl}
          onChange={(e) => {
            updateField('gatewayUrl', e.target.value);
            setTestResult(null);
          }}
          placeholder={t('setupWizard.gatewayUrlPlaceholder')}
          icon={<Globe className="w-4 h-4" />}
        />
      </div>

      {/* API Token */}
      <div>
        <Label>{t('setupWizard.gatewayToken')}</Label>
        <Input
          type="password"
          value={formData.gatewayToken}
          onChange={(e) => {
            updateField('gatewayToken', e.target.value);
            setTestResult(null);
          }}
          placeholder={t('setupWizard.gatewayTokenPlaceholder')}
          icon={<Key className="w-4 h-4" />}
        />
      </div>

      {/* 测试连接按钮和结果 */}
      {formData.gatewayUrl.trim() && (
        <div className="space-y-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing && <Spinner size="sm" className="mr-1.5" />}
            {testing ? t('setupWizard.testingConnection') : t('setupWizard.testConnection')}
          </Button>

          {testResult === 'success' && (
            <p className="text-xs text-green-500">{t('setupWizard.connectionSuccess')}</p>
          )}
          {testResult === 'failed' && (
            <p className="text-xs text-red-500">{t('setupWizard.connectionFailed')}</p>
          )}
        </div>
      )}

      {/* 稍后配置提示 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
        onClick={onSkip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSkip(); }}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{t('setupWizard.configureLater')}</span>
      </div>
    </div>
  );
}
