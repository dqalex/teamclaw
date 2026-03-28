'use client';

import { initI18n } from '@/lib/i18n';
import { useEffect } from 'react';
import AppShell from '@/shared/layout/AppShell';

/**
 * Settings Layout — AppShell 提供 Sidebar + Header（含顶部子导航）
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
