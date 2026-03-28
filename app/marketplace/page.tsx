'use client';

import AppShell from '@/shared/layout/AppShell';

import { MarketplacePage } from '@/features/marketplace';

export default function MarketplaceRoute() {
  return (
    <AppShell>
      <MarketplacePage />
    </AppShell>
  );
}
