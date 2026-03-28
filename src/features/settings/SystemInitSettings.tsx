'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { RotateCcw, AlertTriangle, Loader2, CheckCircle2, Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

// 重置模式
type ResetMode = 'settings' | 'full';

export function SystemInitSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetMode, setResetMode] = useState<ResetMode>('settings');
  const [securityCode, setSecurityCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleReset = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/reset-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityCode, mode: resetMode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('systemInitSettings.resetFailed'));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setSuccessMessage(resetMode === 'full' ? t('systemInitSettings.resetSuccessFull') : t('systemInitSettings.resetSuccess'));
      setTimeout(() => {
        router.push('/init');
      }, 2000);
    } catch (err) {
      setError(t('systemInitSettings.resetFailed'));
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 border-red-200 dark:border-red-900/30">
      <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <RotateCcw className="w-4 h-4" /> {t('systemInitSettings.title')}
      </h3>

      {!showConfirm ? (
        <>
          {/* 模式选择 */}
          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('systemInitSettings.modeTitle')}</p>

            {/* 仅重置设置 */}
            <button
              onClick={() => setResetMode('settings')}
              className={clsx(
                'w-full p-4 rounded-xl border-2 text-left transition-colors',
                resetMode === 'settings'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                  : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              )}
              style={{ borderColor: resetMode === 'settings' ? undefined : 'var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  resetMode === 'settings' ? 'bg-primary-100 dark:bg-primary-900' : 'bg-slate-100 dark:bg-slate-800'
                )}>
                  <Settings className={clsx('w-5 h-5', resetMode === 'settings' ? 'text-primary-600' : '')} style={{ color: resetMode === 'settings' ? undefined : 'var(--text-tertiary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('systemInitSettings.modeSettings')}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('systemInitSettings.modeSettingsDesc')}</div>
                </div>
              </div>
            </button>

            {/* 完全重置 */}
            <button
              onClick={() => setResetMode('full')}
              className={clsx(
                'w-full p-4 rounded-xl border-2 text-left transition-colors',
                resetMode === 'full'
                  ? 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              )}
              style={{ borderColor: resetMode === 'full' ? undefined : 'var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  resetMode === 'full' ? 'bg-red-100 dark:bg-red-900' : 'bg-slate-100 dark:bg-slate-800'
                )}>
                  <Trash2 className={clsx('w-5 h-5', resetMode === 'full' ? 'text-red-600' : '')} style={{ color: resetMode === 'full' ? undefined : 'var(--text-tertiary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-red-600 dark:text-red-400">{t('systemInitSettings.modeFull')}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('systemInitSettings.modeFullDesc')}</div>
                </div>
              </div>
            </button>
          </div>

          {/* 警告信息 */}
          <div className={clsx(
            'p-3 rounded-lg border mb-4',
            resetMode === 'full'
              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
              : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', resetMode === 'full' ? 'text-red-500' : 'text-amber-500')} />
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <strong>{t('systemInitSettings.warning')}</strong> {resetMode === 'full' ? t('systemInitSettings.warningFull') : t('systemInitSettings.warningSettings')}
              </div>
            </div>
          </div>

          <Button
            variant="danger"
            onClick={() => setShowConfirm(true)}
            className={clsx('w-full', resetMode === 'full' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700')}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('systemInitSettings.resetButton')}
          </Button>
        </>
      ) : success ? (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-green-700 dark:text-green-400">
            {successMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={clsx(
            'p-3 rounded-lg border',
            resetMode === 'full'
              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
              : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', resetMode === 'full' ? 'text-red-500' : 'text-amber-500')} />
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {resetMode === 'full' ? t('systemInitSettings.warningFull') : t('systemInitSettings.warningSettings')}
              </div>
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('systemInitSettings.enterCode')}
          </p>
          <Input
            type="password"
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value)}
            placeholder={t('systemInitSettings.codePlaceholder')}
            className="bg-white/5"
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setShowConfirm(false); setSecurityCode(''); setError(''); }}
              className="flex-1"
            >
              {t('systemInitSettings.cancelButton')}
            </Button>
            <Button
              onClick={handleReset}
              disabled={loading || !securityCode}
              className={clsx('flex-1', resetMode === 'full' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700')}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {t('systemInitSettings.confirmButton')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
