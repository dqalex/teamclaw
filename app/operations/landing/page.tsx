'use client';

import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import AppShell from '@/shared/layout/AppShell';

const LandingContentEditor = dynamic(
  () => import('@/features/landing/LandingContentEditor').then(mod => ({ default: mod.LandingContentEditor })),
  { ssr: false }
);

export default function OperationsLandingPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="p-6 overflow-auto mx-auto max-w-5xl">
        <div className="card p-0 overflow-hidden h-[calc(100vh-280px)] min-h-[500px]">
          <LandingContentEditor />
        </div>
      </div>
    </AppShell>
  );
}
