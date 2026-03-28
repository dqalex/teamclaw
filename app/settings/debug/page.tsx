'use client';

import { initI18n } from '@/lib/i18n';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const DebugPanel = dynamic(() => import('@/shared/layout/DebugPanel'), { ssr: false });

export default function DebugSettingsPage() {
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <div className="p-6 overflow-auto mx-auto max-w-5xl">
      <DebugPanel />
    </div>
  );
}
