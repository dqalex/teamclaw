'use client';

import { useUIStore } from '@/domains';
import { useTranslation } from 'react-i18next';
import { initI18n, changeLanguage } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui';
import { ChangePasswordDialog } from '@/features/settings/ChangePasswordDialog';
import { Sun, Moon, Palette, Globe, Database, Lock } from 'lucide-react';
import clsx from 'clsx';

export default function GeneralSettingsPage() {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const [lang, setLang] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('teamclaw-language') || 'zh' : 'zh'
  );
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  useEffect(() => {
    initI18n();
  }, []);

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    changeLanguage(newLang);
  };

  return (
    <div className="p-6 overflow-auto mx-auto max-w-5xl space-y-6">
      {/* 主题 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2"><Palette className="w-4 h-4" /> {t('settings.theme.title')}</div>
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={clsx(
              'flex-1 p-4 rounded-xl border-2 transition-colors flex flex-col items-center gap-2',
              theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-transparent'
            )}
            style={{ borderColor: theme === 'light' ? undefined : 'var(--border)' }}
          >
            <Sun className={clsx('w-6 h-6', theme === 'light' ? 'text-primary-500' : '')} style={{ color: theme === 'light' ? undefined : 'var(--text-tertiary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.theme.light')}</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={clsx(
              'flex-1 p-4 rounded-xl border-2 transition-colors flex flex-col items-center gap-2',
              theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-transparent'
            )}
            style={{ borderColor: theme === 'dark' ? undefined : 'var(--border)' }}
          >
            <Moon className={clsx('w-6 h-6', theme === 'dark' ? 'text-primary-500' : '')} style={{ color: theme === 'dark' ? undefined : 'var(--text-tertiary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.theme.dark')}</span>
          </button>
        </div>
      </div>

      {/* 语言 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> {t('settings.language.title')}</div>
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleLanguageChange('zh')}
            className={clsx(
              'flex-1 p-3 rounded-xl border-2 transition-colors text-center',
              lang === 'zh' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-transparent'
            )}
            style={{ borderColor: lang === 'zh' ? undefined : 'var(--border)' }}
          >
            <span className="text-lg mb-1 block">🇨🇳</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>中文</span>
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={clsx(
              'flex-1 p-3 rounded-xl border-2 transition-colors text-center',
              lang === 'en' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-transparent'
            )}
            style={{ borderColor: lang === 'en' ? undefined : 'var(--border)' }}
          >
            <span className="text-lg mb-1 block">🇺🇸</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>English</span>
          </button>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          {t('settings.language.note')}
        </p>
      </div>

      {/* 数据管理 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2"><Database className="w-4 h-4" /> {t('settings.data.title')}</div>
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>{t('settings.data.desc')}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            {t('settings.data.refresh')}
          </Button>
        </div>
      </div>

      {/* 修改密码 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
          <div className="flex items-center gap-2"><Lock className="w-4 h-4" /> {t('settings.changePassword.title')}</div>
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          {t('settings.changePassword.desc')}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowChangePasswordDialog(true)}>
            {t('settings.changePassword.button')}
          </Button>
        </div>
      </div>

      {/* 修改密码对话框 */}
      <ChangePasswordDialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
      />
    </div>
  );
}
