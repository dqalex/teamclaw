'use client';

import { useTranslation } from 'react-i18next';
import { initI18n } from '@/lib/i18n';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const LandingContentEditor = dynamic(
  () => import('@/features/landing/LandingContentEditor').then(mod => ({ default: mod.LandingContentEditor })),
  { ssr: false }
);

export default function LandingSettingsPage() {
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <div className="p-6 overflow-auto mx-auto max-w-5xl">
      <div className="card p-0 overflow-hidden h-[calc(100vh-280px)] min-h-[500px]">
        <LandingContentEditor />
      </div>
    </div>
  );
}
