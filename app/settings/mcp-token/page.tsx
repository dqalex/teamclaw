'use client';

import { useTranslation } from 'react-i18next';
import { initI18n } from '@/lib/i18n';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const McpTokenPanel = dynamic(() => import('@/features/settings/McpTokenPanel'), { ssr: false });

export default function McpTokenSettingsPage() {
  const { t } = useTranslation();

  useEffect(() => {
    initI18n();
  }, []);

  return (
    <div className="p-6 overflow-auto mx-auto max-w-5xl">
      <div className="card p-5">
        <McpTokenPanel />
      </div>
    </div>
  );
}
