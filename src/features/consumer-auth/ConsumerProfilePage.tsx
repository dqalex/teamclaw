'use client';

import { LogOut, User, Mail, Award, Coins, CreditCard, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Badge, Button, Spinner } from '@/shared/ui';
import { useConsumerAuthStore } from '@/domains/consumer/store';
import { useRouter } from 'next/navigation';

export default function ConsumerProfilePage() {
  const { t } = useTranslation();
  const { consumer, loading, initialized, fetchMe, logout } = useConsumerAuthStore();
  const router = useRouter();

  const TIER_CONFIG: Record<string, { label: string; variant: 'default' | 'primary' | 'info' }> = {
    free: { label: t('consumer.profile.tiers.free'), variant: 'default' },
    pro: { label: t('consumer.profile.tiers.pro'), variant: 'primary' },
    enterprise: { label: t('consumer.profile.tiers.enterprise'), variant: 'info' },
  };

  const tierConfig = consumer ? TIER_CONFIG[consumer.tier] || TIER_CONFIG.free : TIER_CONFIG.free;

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          {/* 标题 */}
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'var(--surface-hover)' }}
            >
              <User className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <h1 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {consumer?.displayName || t('consumer.profile.notLoggedIn')}
            </h1>
            {consumer && (
              <Badge variant={tierConfig.variant} className="mt-2">
                {tierConfig.label}
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : consumer ? (
            <>
              {/* 信息列表 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
                  <Mail className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  <div>
                    <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.profile.email')}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{consumer.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
                  <Award className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                  <div>
                    <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.profile.tier')}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{tierConfig.label}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
                  <div className="flex items-center gap-3">
                    <Coins className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                    <div>
                      <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.profile.creditsBalance')}</div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{consumer.credits.toLocaleString()}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/consumer-auth/recharge')}>
                    <CreditCard className="w-3.5 h-3.5 mr-1" /> {t('consumer.profile.recharge')}
                  </Button>
                </div>
              </div>

              {/* 快捷操作 */}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => router.push('/consumer-auth/recharge')}>
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  {t('consumer.profile.rechargeCredits')}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => router.push('/consumer-auth/orders')}>
                  <Receipt className="w-4 h-4 mr-1.5" />
                  {t('consumer.profile.orderHistory')}
                </Button>
              </div>

              {/* 退出登录 */}
              <Button variant="danger" size="md" className="w-full" onClick={logout}>
                <LogOut className="w-4 h-4 mr-1.5" />
                {t('consumer.profile.logout')}
              </Button>
            </>
          ) : initialized ? (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {t('consumer.profile.loginRequired')}
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={fetchMe}>
                {t('consumer.profile.refresh')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
