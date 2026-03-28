'use client';

import { useTranslation } from 'react-i18next';
import { initI18n } from '@/lib/i18n';
import { useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function AboutSettingsPage() {
  const { t } = useTranslation();

  useEffect(() => {
    initI18n();
  }, []);

  return (
    <div className="p-6 overflow-auto mx-auto max-w-5xl">
      <div className="card p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-700 dark:bg-primary-600 flex items-center justify-center">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {t('settings.about.title', { version: process.env.NEXT_PUBLIC_APP_VERSION })}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>{t('settings.about.desc')}</p>
        <div className="text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
          <p>{t('settings.about.tech')}</p>
          <p>{t('settings.about.platform')}</p>
          <p className="mt-2">{t('settings.about.stack')}</p>
        </div>
      </div>
    </div>
  );
}
