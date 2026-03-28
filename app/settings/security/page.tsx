'use client';

import { useTranslation } from 'react-i18next';
import { initI18n } from '@/lib/i18n';
import { useState, useCallback, useEffect } from 'react';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useSecurityCode } from '@/shared/hooks/useSecurityCode';
import { SecurityCodeDialog } from '@/shared/layout/SecurityCodeDialog';
import { SecurityCodeSettings } from '@/features/settings/SecurityCodeSettings';
import { SystemInitSettings } from '@/features/settings/SystemInitSettings';
import { Switch, Button } from '@/shared/ui';
import { Shield, ShieldAlert, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

/** SSRF 安全配置存储 key */
const SSRF_CONFIG_KEY = 'teamclaw-ssrf-config';

interface SSRFConfig {
  allowExternalAccess: boolean;
  acknowledgedRisk: boolean;
}

function loadSsrfConfig(): SSRFConfig {
  try {
    const raw = localStorage.getItem(SSRF_CONFIG_KEY);
    return raw ? JSON.parse(raw) : { allowExternalAccess: false, acknowledgedRisk: false };
  } catch {
    return { allowExternalAccess: false, acknowledgedRisk: false };
  }
}

function saveSsrfConfig(config: SSRFConfig) {
  try {
    localStorage.setItem(SSRF_CONFIG_KEY, JSON.stringify(config));
    document.cookie = `${SSRF_CONFIG_KEY}=${encodeURIComponent(JSON.stringify(config))}; path=/; max-age=31536000; SameSite=Strict`;
  } catch (e) { console.warn('[Settings] Failed to save SSRF config:', e); }
}

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const [ssrfConfig, setSsrfConfig] = useState<SSRFConfig>(loadSsrfConfig);
  const [showRiskDialog, setShowRiskDialog] = useState(false);

  // SSRF 外网访问安全码验证
  const ssrfSecurity = useSecurityCode({
    onVerified: () => {
      setShowRiskDialog(true);
    },
  });

  useEscapeKey(showRiskDialog, useCallback(() => setShowRiskDialog(false), []));

  useEffect(() => {
    initI18n();
  }, []);

  const handleToggleExternalAccess = useCallback(() => {
    if (!ssrfConfig.allowExternalAccess) {
      ssrfSecurity.verify();
    } else {
      const newConfig = { ...ssrfConfig, allowExternalAccess: false, acknowledgedRisk: false };
      setSsrfConfig(newConfig);
      saveSsrfConfig(newConfig);
    }
  }, [ssrfConfig, ssrfSecurity]);

  const handleConfirmRisk = useCallback(() => {
    const newConfig = { allowExternalAccess: true, acknowledgedRisk: true };
    setSsrfConfig(newConfig);
    saveSsrfConfig(newConfig);
    setShowRiskDialog(false);
  }, []);

  return (
    <div className="p-6 overflow-auto mx-auto max-w-5xl space-y-4">
      {/* SSRF 防护 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield className="w-4 h-4" /> {t('settings.security.ssrfTitle')}
        </h3>

        {/* 外网访问开关 */}
        <div className="flex items-center justify-between p-3 rounded-lg mb-3" style={{ background: 'var(--surface-hover)' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.security.allowExternal')}</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('settings.security.allowExternalDesc')}</div>
          </div>
          <Switch
            checked={ssrfConfig.allowExternalAccess}
            onChange={handleToggleExternalAccess}
          />
        </div>

        {/* 风险提示 */}
        {ssrfConfig.allowExternalAccess && (
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <strong>{t('settings.security.warning')}</strong>：{t('settings.security.warningDesc')}
              </div>
            </div>
          </div>
        )}

        {/* 当前配置状态 */}
        <div className="text-xs space-y-2" style={{ color: 'var(--text-tertiary)' }}>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--surface-hover)' }}>
            <span>{t('settings.security.dnsProtection')}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.security.enabled')}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--surface-hover)' }}>
            <span>{t('settings.security.blockZeroBind')}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.security.enabled')}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--surface-hover)' }}>
            <span>{t('settings.security.privateIpAccess')}</span>
            <span
              className={clsx('font-medium', ssrfConfig.allowExternalAccess ? 'text-amber-500' : '')}
              style={{ color: ssrfConfig.allowExternalAccess ? undefined : 'var(--text-primary)' }}
            >
              {ssrfConfig.allowExternalAccess ? t('settings.security.allowed') : t('settings.security.blocked')}
            </span>
          </div>
        </div>
      </div>

      {/* 安全码 */}
      <SecurityCodeSettings />

      {/* 系统初始化 */}
      <SystemInitSettings />

      {/* 安全说明 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <ShieldAlert className="w-4 h-4" /> {t('settings.security.notesTitle')}
        </h3>
        <ul className="text-xs space-y-2 list-disc list-inside" style={{ color: 'var(--text-tertiary)' }}>
          <li><strong>{t('settings.security.note1')}</strong></li>
          <li><strong>{t('settings.security.note2')}</strong></li>
          <li><strong>{t('settings.security.note3')}</strong></li>
          <li><strong>{t('settings.security.note4')}</strong></li>
        </ul>
      </div>

      {/* 风险确认对话框 */}
      {showRiskDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="risk-dialog-title">
          <div className="rounded-2xl p-6 w-full max-w-md shadow-float mx-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 id="risk-dialog-title" className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.riskDialog.title')}</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('settings.riskDialog.desc')}</p>
              </div>
            </div>

            <div className="text-sm space-y-3 mb-4" style={{ color: 'var(--text-secondary)' }}>
              <p>{t('settings.riskDialog.warning')}</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('settings.riskDialog.risk1')}</li>
                <li>{t('settings.riskDialog.risk2')}</li>
                <li>{t('settings.riskDialog.risk3')}</li>
              </ul>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('settings.riskDialog.suggestion')}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowRiskDialog(false)}>{t('settings.riskDialog.cancel')}</Button>
              <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600" onClick={handleConfirmRisk}>
                {t('settings.riskDialog.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SSRF 外网访问安全码验证对话框 */}
      <SecurityCodeDialog
        isOpen={ssrfSecurity.showDialog}
        securityCode={ssrfSecurity}
        title="安全验证"
        description="开启外网访问需要验证安全码"
      />
    </div>
  );
}
