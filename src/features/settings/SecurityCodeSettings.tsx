'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/domains';
import { Button, Input } from '@/shared/ui';
import { Shield, Check, X, Loader2, AlertCircle } from 'lucide-react';

export function SecurityCodeSettings() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [hasSecurityCode, setHasSecurityCode] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // 设置安全码表单
  const [currentPassword, setCurrentPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 清除安全码表单
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // 检查是否已设置安全码
  useEffect(() => {
    if (!isAdmin) {
      setChecking(false);
      return;
    }

    fetch('/api/users/verify-security-code', { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        // API 返回 { required: true } 表示已设置安全码，需要验证
        // required: false 表示未设置，不需要验证
        setHasSecurityCode(data.required === true);
      })
      .catch(() => {
        setHasSecurityCode(false);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [isAdmin]);

  const handleSetCode = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !securityCode || !confirmCode) {
      setError(t('securityCodeSettings.fillAllFields'));
      return;
    }
    if (securityCode !== confirmCode) {
      setError(t('securityCodeSettings.codesNotMatch'));
      return;
    }
    if (securityCode.length < 4) {
      setError(t('securityCodeSettings.tooShort'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users/security-code', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, securityCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('securityCodeSettings.networkError'));
        return;
      }

      setSuccess(t('securityCodeSettings.setSuccess'));
      setHasSecurityCode(true);
      setCurrentPassword('');
      setSecurityCode('');
      setConfirmCode('');
    } catch (err) {
      setError(t('securityCodeSettings.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async () => {
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError(t('securityCodeSettings.enterPasswordToDelete'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users/security-code', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: deletePassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || t('securityCodeSettings.networkError'));
        return;
      }

      setHasSecurityCode(false);
      setDeletePassword('');
    } catch (err) {
      setDeleteError(t('securityCodeSettings.networkError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (checking) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('securityCodeSettings.checking')}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Shield className="w-4 h-4" /> {t('securityCodeSettings.title')}
      </h3>

      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {t('securityCodeSettings.desc')}
      </p>

      {hasSecurityCode ? (
        // 已设置安全码 - 显示清除选项
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t('securityCodeSettings.isSet')}</span>
          </div>

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              {t('securityCodeSettings.enterPassword')}
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={t('securityCodeSettings.currentPasswordPlaceholder')}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="flex-1"
              />
              <Button variant="danger" onClick={handleDeleteCode} disabled={loading}>
                {t('securityCodeSettings.removeButton')}
              </Button>
            </div>
            {deleteError && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{deleteError}</p>
            )}
          </div>
        </div>
      ) : (
        // 未设置安全码 - 显示设置表单
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              {t('securityCodeSettings.currentPassword')}
            </label>
            <Input
              type="password"
              placeholder={t('securityCodeSettings.currentPasswordPlaceholder')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                {t('securityCodeSettings.securityCode')}
              </label>
              <Input
                type="password"
                placeholder={t('securityCodeSettings.securityCodePlaceholder')}
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                {t('securityCodeSettings.confirmCode')}
              </label>
              <Input
                type="password"
                placeholder={t('securityCodeSettings.confirmCodePlaceholder')}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#ef4444' }}>
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#22c55e' }}>
              <Check className="w-3.5 h-3.5" />
              {success}
            </div>
          )}

          <Button onClick={handleSetCode} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('securityCodeSettings.setting')}
              </>
            ) : (
              t('securityCodeSettings.setButton')
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
