'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ConsumerLoginPage } from '@/features/consumer-auth';

export default function ConsumerLoginRoute() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 简单头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => router.push('/')}
          className="text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {t('common.back', '返回')}
        </button>
        <span className="font-display text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
          TeamClaw
        </span>
      </div>
      <ConsumerLoginPage
        onSwitchToRegister={() => router.push('/consumer/register')}
      />
    </div>
  );
}
