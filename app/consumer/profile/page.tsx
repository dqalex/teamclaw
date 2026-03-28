'use client';

import { useRouter } from 'next/navigation';
import AppShell from '@/shared/layout/AppShell';

import { ConsumerProfilePage } from '@/features/consumer-auth';

export default function ConsumerProfileRoute() {
  const router = useRouter();

  return (
    <AppShell>
      <ConsumerProfilePage />
    </AppShell>
  );
}
